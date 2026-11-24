import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";
import { toDate } from "../src/lib/dates.js";

export const app = createApp();

let n = 0;
/** Registers a user and returns a supertest agent that keeps the login cookie. */
export async function signUp(name = "Test User") {
  const agent = request.agent(app);
  const email = `user${++n}-${Date.now()}@example.com`;
  const res = await agent.post("/api/auth/register").send({ name, email, password: "password123" });
  if (res.status !== 201) throw new Error(`signup failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { agent, user: res.body.user as { id: string; email: string }, email };
}

export const validListing = {
  title: "Test cabin in the hills",
  description: "A quiet test cabin with a view of the mountains and a wood stove.",
  propertyType: "CABIN",
  city: "Manali",
  country: "India",
  pricePerNight: 4000,
  cleaningFee: 500,
  maxGuests: 4,
  bedrooms: 2,
  beds: 2,
  baths: 1,
  amenities: ["Wifi", "Heating"],
  photos: ["https://images.unsplash.com/photo-1505873242700-f289a29e1e0f"],
};

export async function createListing(agent: ReturnType<typeof request.agent>, overrides: Partial<typeof validListing> = {}) {
  const res = await agent.post("/api/listings").send({ ...validListing, ...overrides });
  if (res.status !== 201) throw new Error(`create listing failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.listing as { id: string };
}

/** "YYYY-MM-DD" n days from today (UTC). */
export function day(offset: number) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

/** Inserts a booking directly, e.g. one in the past that the API wouldn't allow. */
export async function insertBooking(listingId: string, guestId: string, from: number, to: number) {
  return prisma.booking.create({
    data: {
      listingId, guestId, checkIn: toDate(day(from)), checkOut: toDate(day(to)),
      guests: 1, nights: to - from, subtotal: 1, cleaningFee: 0, serviceFee: 0, total: 1,
    },
  });
}
