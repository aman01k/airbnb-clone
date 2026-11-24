import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { isoDate, nightsBetween, toDate, toIso, todayIso } from "../lib/dates.js";
import { badRequest, conflict, forbidden, notFound } from "../lib/http.js";
import { quote } from "../lib/pricing.js";
import { currentUserId, requireAuth } from "../middleware/auth.js";
import { parse } from "../middleware/error.js";

export const bookingsRouter = Router();
bookingsRouter.use(requireAuth);

export const MAX_NIGHTS = 30;

const createSchema = z
  .object({
    listingId: z.string().min(1),
    checkIn: isoDate,
    checkOut: isoDate,
    guests: z.coerce.number().int().min(1, "At least 1 guest").max(50),
  })
  .refine((b) => b.checkOut > b.checkIn, { message: "Check-out must be after check-in", path: ["checkOut"] });

bookingsRouter.post("/", async (req, res) => {
  const userId = currentUserId(req);
  const input = parse(createSchema, req.body);

  if (input.checkIn < todayIso()) throw badRequest("Check-in can't be in the past.");
  const nights = nightsBetween(input.checkIn, input.checkOut);
  if (nights > MAX_NIGHTS) throw badRequest(`Stays can be at most ${MAX_NIGHTS} nights.`);

  const listing = await prisma.listing.findUnique({ where: { id: input.listingId } });
  if (!listing) throw notFound("This stay doesn't exist or was removed.");
  if (listing.hostId === userId) throw forbidden("You can't book your own stay.");
  if (input.guests > listing.maxGuests) {
    throw badRequest(`This stay allows up to ${listing.maxGuests} guest${listing.maxGuests > 1 ? "s" : ""}.`);
  }

  // Friendly early check. The database's exclusion constraint is the real guard:
  // if two requests race past this check, Postgres rejects the second insert
  // and the error handler turns that into the same 409.
  const clash = await prisma.booking.findFirst({
    where: {
      listingId: listing.id,
      status: "CONFIRMED",
      checkIn: { lt: toDate(input.checkOut) },
      checkOut: { gt: toDate(input.checkIn) },
    },
    select: { id: true },
  });
  if (clash) throw conflict("Some of those nights are already booked. Please pick other dates.");

  const price = quote(listing.pricePerNight, listing.cleaningFee, nights);
  const booking = await prisma.booking.create({
    data: {
      listingId: listing.id,
      guestId: userId,
      checkIn: toDate(input.checkIn),
      checkOut: toDate(input.checkOut),
      guests: input.guests,
      ...price,
    },
  });
  res.status(201).json({ booking: serialize(booking) });
});

/** The signed-in user's trips, newest first. */
bookingsRouter.get("/mine", async (req, res) => {
  const userId = currentUserId(req);
  const rows = await prisma.booking.findMany({
    where: { guestId: userId },
    orderBy: { checkIn: "desc" },
    include: {
      listing: { select: { id: true, title: true, city: true, country: true, photos: true, hostId: true } },
      review: { select: { id: true, rating: true } },
    },
  });
  const today = todayIso();
  res.json({
    bookings: rows.map((b) => {
      const s = serialize(b);
      return {
        ...s,
        listing: { ...b.listing, photos: b.listing.photos.slice(0, 1) },
        review: b.review,
        canCancel: b.status === "CONFIRMED" && s.checkIn > today,
        canReview: b.status === "CONFIRMED" && s.checkOut <= today && !b.review,
      };
    }),
  });
});

bookingsRouter.post("/:id/cancel", async (req, res) => {
  const userId = currentUserId(req);
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) throw notFound("Booking not found.");
  if (booking.guestId !== userId) throw forbidden();
  if (booking.status === "CANCELLED") throw conflict("This booking is already cancelled.");
  if (toIso(booking.checkIn) <= todayIso()) throw conflict("Trips that have already started can't be cancelled.");

  const updated = await prisma.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } });
  res.json({ booking: serialize(updated) });
});

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "Pick 1 to 5 stars").max(5, "Pick 1 to 5 stars"),
  comment: z.string().trim().min(10, "Write at least 10 characters").max(1500),
});

bookingsRouter.post("/:id/review", async (req, res) => {
  const userId = currentUserId(req);
  const input = parse(reviewSchema, req.body);
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id }, include: { review: true } });
  if (!booking) throw notFound("Booking not found.");
  if (booking.guestId !== userId) throw forbidden("Only the guest on this booking can review it.");
  if (booking.status !== "CONFIRMED") throw conflict("Cancelled bookings can't be reviewed.");
  if (toIso(booking.checkOut) > todayIso()) throw conflict("You can leave a review after you check out.");
  if (booking.review) throw conflict("You've already reviewed this stay.");

  const review = await prisma.review.create({
    data: { bookingId: booking.id, listingId: booking.listingId, authorId: userId, ...input },
  });
  res.status(201).json({ review });
});

export function serialize<T extends { checkIn: Date; checkOut: Date }>(b: T) {
  return { ...b, checkIn: toIso(b.checkIn), checkOut: toIso(b.checkOut) };
}
