import { Router } from "express";
import { Prisma, PropertyType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db.js";
import { isoDate, toDate, toIso, todayIso } from "../lib/dates.js";
import { badRequest, conflict, forbidden, notFound } from "../lib/http.js";
import { currentUserId, requireAuth } from "../middleware/auth.js";
import { parse } from "../middleware/error.js";

export const listingsRouter = Router();

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Average rating and review count for a set of listings, in one query. */
export async function ratingsFor(listingIds: string[]) {
  if (listingIds.length === 0) return new Map<string, { rating: number | null; reviewCount: number }>();
  const rows = await prisma.review.groupBy({
    by: ["listingId"],
    where: { listingId: { in: listingIds } },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const map = new Map(listingIds.map((id) => [id, { rating: null as number | null, reviewCount: 0 }]));
  for (const r of rows) {
    map.set(r.listingId, {
      rating: r._avg.rating === null ? null : Math.round(r._avg.rating * 100) / 100,
      reviewCount: r._count._all,
    });
  }
  return map;
}

const summarySelect = {
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
} satisfies Prisma.ListingSelect;

export type ListingSummaryRow = Prisma.ListingGetPayload<{ select: typeof summarySelect }>;

export async function withRatings<T extends { id: string }>(rows: T[]) {
  const ratings = await ratingsFor(rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, ...ratings.get(r.id)! }));
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

const csv = z
  .string()
  .optional()
  .transform((s) => (s ? s.split(",").map((x) => x.trim()).filter(Boolean) : []));

const searchSchema = z
  .object({
    city: z.string().trim().max(80).optional(),
    checkIn: isoDate.optional(),
    checkOut: isoDate.optional(),
    guests: z.coerce.number().int().min(1).max(50).optional(),
    minPrice: z.coerce.number().int().min(0).optional(),
    maxPrice: z.coerce.number().int().min(0).optional(),
    types: csv.pipe(z.array(z.nativeEnum(PropertyType))),
    sort: z.enum(["recommended", "price_asc", "price_desc", "newest"]).default("recommended"),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(48).default(12),
  })
  .refine((q) => Boolean(q.checkIn) === Boolean(q.checkOut), {
    message: "Pick both a check-in and a check-out date",
    path: ["checkOut"],
  })
  .refine((q) => !q.checkIn || !q.checkOut || q.checkOut > q.checkIn, {
    message: "Check-out must be after check-in",
    path: ["checkOut"],
  });

listingsRouter.get("/", async (req, res) => {
  const q = parse(searchSchema, req.query);

  const where: Prisma.ListingWhereInput = {};
  if (q.city) where.city = { contains: q.city, mode: "insensitive" };
  if (q.guests) where.maxGuests = { gte: q.guests };
  if (q.types.length) where.propertyType = { in: q.types };
  if (q.minPrice !== undefined || q.maxPrice !== undefined) {
    where.pricePerNight = { gte: q.minPrice, lte: q.maxPrice };
  }
  if (q.checkIn && q.checkOut) {
    // Available = no confirmed booking that overlaps [checkIn, checkOut).
    where.bookings = {
      none: {
        status: "CONFIRMED",
        checkIn: { lt: toDate(q.checkOut) },
        checkOut: { gt: toDate(q.checkIn) },
      },
    };
  }

  const orderBy: Prisma.ListingOrderByWithRelationInput[] =
    q.sort === "price_asc"
      ? [{ pricePerNight: "asc" }]
      : q.sort === "price_desc"
        ? [{ pricePerNight: "desc" }]
        : q.sort === "newest"
          ? [{ createdAt: "desc" }]
          : [{ reviews: { _count: "desc" } }, { createdAt: "desc" }];

  const [total, rows] = await Promise.all([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      orderBy: [...orderBy, { id: "asc" }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      select: summarySelect,
    }),
  ]);

  res.json({ items: await withRatings(rows), total, page: q.page, pageSize: q.pageSize });
});

/** Distinct destinations for the search box. */
listingsRouter.get("/destinations", async (_req, res) => {
  const rows = await prisma.listing.groupBy({
    by: ["city", "country"],
    _count: { _all: true },
    orderBy: { _count: { id: "desc" } },
  });
  res.json({ destinations: rows.map((r) => ({ city: r.city, country: r.country, count: r._count._all })) });
});

// ---------------------------------------------------------------------------
// Detail
// ---------------------------------------------------------------------------

listingsRouter.get("/:id", async (req, res) => {
  const listing = await prisma.listing.findUnique({
    where: { id: req.params.id },
    include: {
      host: { select: { id: true, name: true, avatarUrl: true, createdAt: true } },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          author: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
      bookings: {
        where: { status: "CONFIRMED", checkOut: { gt: toDate(todayIso()) } },
        select: { checkIn: true, checkOut: true },
        orderBy: { checkIn: "asc" },
      },
    },
  });
  if (!listing) throw notFound("This stay doesn't exist or was removed.");

  const { bookings, ...rest } = listing;
  const rating = (await ratingsFor([listing.id])).get(listing.id)!;
  res.json({
    listing: {
      ...rest,
      ...rating,
      // Only dates are exposed, never who booked.
      bookedRanges: bookings.map((b) => ({ checkIn: toIso(b.checkIn), checkOut: toIso(b.checkOut) })),
    },
  });
});

// ---------------------------------------------------------------------------
// Create / update / delete (hosts)
// ---------------------------------------------------------------------------

const listingInput = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters").max(90),
  description: z.string().trim().min(20, "Description must be at least 20 characters").max(3000),
  propertyType: z.nativeEnum(PropertyType),
  city: z.string().trim().min(2).max(60),
  country: z.string().trim().min(2).max(60),
  pricePerNight: z.coerce.number().int().min(100, "Minimum price is ₹100").max(500_000),
  cleaningFee: z.coerce.number().int().min(0).max(50_000).default(0),
  maxGuests: z.coerce.number().int().min(1).max(30),
  bedrooms: z.coerce.number().int().min(0).max(30),
  beds: z.coerce.number().int().min(1).max(50),
  baths: z.coerce.number().int().min(0).max(30),
  amenities: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
  photos: z
    .array(z.string().trim().url("Each photo must be a valid URL").startsWith("https://", "Photo URLs must use https"))
    .min(1, "Add at least one photo")
    .max(12),
});

async function ownedListing(id: string, userId: string) {
  const listing = await prisma.listing.findUnique({ where: { id }, select: { id: true, hostId: true } });
  if (!listing) throw notFound("This stay doesn't exist or was removed.");
  if (listing.hostId !== userId) throw forbidden("Only the host can change this stay.");
  return listing;
}

listingsRouter.post("/", requireAuth, async (req, res) => {
  const data = parse(listingInput, req.body);
  const listing = await prisma.listing.create({ data: { ...data, hostId: currentUserId(req) } });
  res.status(201).json({ listing });
});

listingsRouter.patch("/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id);
  await ownedListing(id, currentUserId(req));
  const data = parse(listingInput.partial(), req.body);
  if (Object.keys(data).length === 0) throw badRequest("Nothing to update.");
  const listing = await prisma.listing.update({ where: { id: id }, data });
  res.json({ listing });
});

listingsRouter.delete("/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id);
  await ownedListing(id, currentUserId(req));
  const upcoming = await prisma.booking.count({
    where: { listingId: id, status: "CONFIRMED", checkOut: { gt: toDate(todayIso()) } },
  });
  if (upcoming > 0) {
    throw conflict(`This stay has ${upcoming} upcoming booking${upcoming > 1 ? "s" : ""}. It can be removed once they're over.`);
  }
  await prisma.listing.delete({ where: { id: id } });
  res.status(204).end();
});
