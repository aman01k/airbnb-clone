import { Router } from "express";
import { prisma } from "../db.js";
import { toDate, todayIso } from "../lib/dates.js";
import { currentUserId, requireAuth } from "../middleware/auth.js";
import { serialize } from "./bookings.js";
import { withRatings } from "./listings.js";

export const hostRouter = Router();
hostRouter.use(requireAuth);

/** The signed-in user's own listings with booking stats. */
hostRouter.get("/listings", async (req, res) => {
  const hostId = currentUserId(req);
  const today = toDate(todayIso());
  const rows = await prisma.listing.findMany({
    where: { hostId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      city: true,
      country: true,
      propertyType: true,
      pricePerNight: true,
      maxGuests: true,
      bedrooms: true,
      beds: true,
      photos: true,
      _count: { select: { bookings: { where: { status: "CONFIRMED", checkOut: { gt: today } } } } },
    },
  });
  const listings = await withRatings(rows.map(({ _count, ...l }) => ({ ...l, upcomingBookings: _count.bookings })));
  res.json({ listings });
});

/** Bookings guests made on the signed-in user's listings. */
hostRouter.get("/reservations", async (req, res) => {
  const hostId = currentUserId(req);
  const rows = await prisma.booking.findMany({
    where: { listing: { hostId } },
    orderBy: { checkIn: "asc" },
    include: {
      listing: { select: { id: true, title: true, city: true } },
      guest: { select: { id: true, name: true } },
    },
  });
  const today = todayIso();
  const reservations = rows.map(serialize);
  res.json({
    upcoming: reservations.filter((r) => r.status === "CONFIRMED" && r.checkOut > today),
    past: reservations.filter((r) => r.status === "CONFIRMED" && r.checkOut <= today).reverse(),
    cancelled: reservations.filter((r) => r.status === "CANCELLED").reverse(),
  });
});
