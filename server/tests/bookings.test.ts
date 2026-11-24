import request from "supertest";
import { describe, expect, it } from "vitest";
import { prisma } from "../src/db.js";
import { app, createListing, day, insertBooking, signUp } from "./helpers.js";

async function setup() {
  const host = await signUp("Host");
  const guest = await signUp("Guest");
  const listing = await createListing(host.agent, { pricePerNight: 4000, cleaningFee: 500, maxGuests: 4 });
  return { host, guest, listing };
}

describe("bookings", () => {
  it("books a stay and charges the right total", async () => {
    const { guest, listing } = await setup();
    const res = await guest.agent
      .post("/api/bookings")
      .send({ listingId: listing.id, checkIn: day(10), checkOut: day(13), guests: 2 });
    expect(res.status).toBe(201);
    // 3 nights × 4000 = 12000, cleaning 500, service 12% of 12000 = 1440
    expect(res.body.booking).toMatchObject({ nights: 3, subtotal: 12000, cleaningFee: 500, serviceFee: 1440, total: 13940 });
  });

  it("requires login", async () => {
    const { listing } = await setup();
    const res = await request(app).post("/api/bookings").send({ listingId: listing.id, checkIn: day(1), checkOut: day(2), guests: 1 });
    expect(res.status).toBe(401);
  });

  it("rejects overlapping dates but allows back-to-back stays", async () => {
    const { guest, listing } = await setup();
    const other = await signUp("Other");
    const book = (agent: typeof guest.agent, a: number, b: number) =>
      agent.post("/api/bookings").send({ listingId: listing.id, checkIn: day(a), checkOut: day(b), guests: 1 });

    expect((await book(guest.agent, 10, 13)).status).toBe(201);
    expect((await book(other.agent, 12, 15)).status).toBe(409);
    expect((await book(other.agent, 9, 11)).status).toBe(409);
    expect((await book(other.agent, 13, 15)).status).toBe(201); // check-in on the previous check-out day
    expect((await book(other.agent, 8, 10)).status).toBe(201);
  });

  it("never double-books under concurrent requests", async () => {
    const { listing } = await setup();
    const guests = await Promise.all([1, 2, 3, 4, 5].map((i) => signUp(`Racer ${i}`)));
    const results = await Promise.all(
      guests.map((g) => g.agent.post("/api/bookings").send({ listingId: listing.id, checkIn: day(20), checkOut: day(23), guests: 1 })),
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(4);
    expect(await prisma.booking.count({ where: { listingId: listing.id } })).toBe(1);
  });

  it("is protected by a database constraint, not just API checks", async () => {
    const { guest, listing } = await setup();
    await insertBooking(listing.id, guest.user.id, 30, 33);
    await expect(insertBooking(listing.id, guest.user.id, 31, 34)).rejects.toThrow(/Booking_no_overlap/);
    await expect(insertBooking(listing.id, guest.user.id, 33, 35)).resolves.toBeTruthy();
  });

  it("enforces guests, past dates, stay length and own listings", async () => {
    const { host, guest, listing } = await setup();
    const post = (agent: typeof guest.agent, body: object) =>
      agent.post("/api/bookings").send({ listingId: listing.id, checkIn: day(5), checkOut: day(7), guests: 1, ...body });

    expect((await post(guest.agent, { guests: 5 })).status).toBe(400);
    expect((await post(guest.agent, { checkIn: day(-1) })).status).toBe(400);
    expect((await post(guest.agent, { checkOut: day(5) })).status).toBe(400);
    expect((await post(guest.agent, { checkOut: day(40) })).status).toBe(400);
    expect((await post(guest.agent, { checkIn: "2026-02-30" })).status).toBe(400);
    expect((await post(host.agent, {})).status).toBe(403);
  });

  it("lets the guest cancel an upcoming trip, freeing the dates", async () => {
    const { guest, listing } = await setup();
    const other = await signUp("Other");
    const booking = (await guest.agent.post("/api/bookings").send({ listingId: listing.id, checkIn: day(10), checkOut: day(12), guests: 1 })).body.booking;

    expect((await other.agent.post(`/api/bookings/${booking.id}/cancel`)).status).toBe(403);
    expect((await guest.agent.post(`/api/bookings/${booking.id}/cancel`)).status).toBe(200);
    expect((await guest.agent.post(`/api/bookings/${booking.id}/cancel`)).status).toBe(409);

    const rebook = await other.agent.post("/api/bookings").send({ listingId: listing.id, checkIn: day(10), checkOut: day(12), guests: 1 });
    expect(rebook.status).toBe(201);
  });

  it("lists trips with cancel and review flags", async () => {
    const { guest, listing } = await setup();
    await insertBooking(listing.id, guest.user.id, -6, -3); // past
    await guest.agent.post("/api/bookings").send({ listingId: listing.id, checkIn: day(5), checkOut: day(6), guests: 1 });

    const { bookings } = (await guest.agent.get("/api/bookings/mine")).body;
    expect(bookings).toHaveLength(2);
    const [upcoming, past] = bookings;
    expect(upcoming).toMatchObject({ canCancel: true, canReview: false });
    expect(past).toMatchObject({ canCancel: false, canReview: true });
  });
});

describe("reviews", () => {
  it("allows one review per finished stay, from the guest only", async () => {
    const { host, guest, listing } = await setup();
    const past = await insertBooking(listing.id, guest.user.id, -5, -2);
    const review = { rating: 5, comment: "Wonderful stay, would come back." };

    expect((await host.agent.post(`/api/bookings/${past.id}/review`).send(review)).status).toBe(403);
    expect((await guest.agent.post(`/api/bookings/${past.id}/review`).send({ rating: 9, comment: "x" })).status).toBe(400);
    expect((await guest.agent.post(`/api/bookings/${past.id}/review`).send(review)).status).toBe(201);
    expect((await guest.agent.post(`/api/bookings/${past.id}/review`).send(review)).status).toBe(409);

    const detail = (await request(app).get(`/api/listings/${listing.id}`)).body.listing;
    expect(detail).toMatchObject({ rating: 5, reviewCount: 1 });
  });

  it("doesn't allow reviewing before check-out", async () => {
    const { guest, listing } = await setup();
    const future = await insertBooking(listing.id, guest.user.id, 3, 5);
    const res = await guest.agent.post(`/api/bookings/${future.id}/review`).send({ rating: 4, comment: "Can't wait to go!!" });
    expect(res.status).toBe(409);
  });
});

describe("host dashboard", () => {
  it("shows the host's listings and reservations only", async () => {
    const { host, guest, listing } = await setup();
    const otherHost = await signUp("Other host");
    await createListing(otherHost.agent, { title: "Someone else's place" });
    await guest.agent.post("/api/bookings").send({ listingId: listing.id, checkIn: day(4), checkOut: day(6), guests: 2 });

    const listings = (await host.agent.get("/api/host/listings")).body.listings;
    expect(listings).toHaveLength(1);
    expect(listings[0]).toMatchObject({ id: listing.id, upcomingBookings: 1 });

    const reservations = (await host.agent.get("/api/host/reservations")).body;
    expect(reservations.upcoming).toHaveLength(1);
    expect(reservations.upcoming[0].guest.name).toBe("Guest");
    expect((await otherHost.agent.get("/api/host/reservations")).body.upcoming).toHaveLength(0);
  });
});
