import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, createListing, day, insertBooking, signUp, validListing } from "./helpers.js";

describe("listings", () => {
  it("requires login to create a listing", async () => {
    const res = await request(app).post("/api/listings").send(validListing);
    expect(res.status).toBe(401);
  });

  it("validates listing fields", async () => {
    const { agent } = await signUp();
    const res = await agent.post("/api/listings").send({ ...validListing, pricePerNight: 5, photos: ["http://insecure.example/x.jpg"] });
    expect(res.status).toBe(400);
    expect(res.body.details).toHaveProperty("pricePerNight");
    expect(res.body.details).toHaveProperty(["photos.0"]);
  });

  it("only lets the host edit or delete", async () => {
    const host = await signUp("Host");
    const other = await signUp("Other");
    const listing = await createListing(host.agent);

    expect((await other.agent.patch(`/api/listings/${listing.id}`).send({ title: "Hijacked title" })).status).toBe(403);
    expect((await other.agent.delete(`/api/listings/${listing.id}`)).status).toBe(403);

    const ok = await host.agent.patch(`/api/listings/${listing.id}`).send({ pricePerNight: 4500 });
    expect(ok.status).toBe(200);
    expect(ok.body.listing.pricePerNight).toBe(4500);
  });

  it("won't delete a listing with upcoming bookings", async () => {
    const host = await signUp("Host");
    const guest = await signUp("Guest");
    const listing = await createListing(host.agent);
    await insertBooking(listing.id, guest.user.id, 3, 5);
    expect((await host.agent.delete(`/api/listings/${listing.id}`)).status).toBe(409);
  });

  it("filters by city, guests, price and type", async () => {
    const { agent } = await signUp();
    await createListing(agent, { city: "Goa", maxGuests: 2, pricePerNight: 3000, propertyType: "APARTMENT" });
    await createListing(agent, { city: "Goa", maxGuests: 8, pricePerNight: 9000, propertyType: "VILLA" });
    await createListing(agent, { city: "Manali", maxGuests: 4, pricePerNight: 4000 });

    const get = (q: string) => request(app).get(`/api/listings?${q}`).then((r) => r.body);
    expect((await get("city=goa")).total).toBe(2);
    expect((await get("city=goa&guests=5")).total).toBe(1);
    expect((await get("maxPrice=4000")).total).toBe(2);
    expect((await get("types=VILLA,CABIN")).total).toBe(2);
    const sorted = await get("sort=price_desc");
    expect(sorted.items.map((l: { pricePerNight: number }) => l.pricePerNight)).toEqual([9000, 4000, 3000]);
  });

  it("hides listings that are booked for the searched dates", async () => {
    const host = await signUp("Host");
    const guest = await signUp("Guest");
    const booked = await createListing(host.agent, { title: "Booked cabin" });
    await createListing(host.agent, { title: "Free cabin" });
    await insertBooking(booked.id, guest.user.id, 10, 13);

    const search = (from: number, to: number) =>
      request(app).get(`/api/listings?checkIn=${day(from)}&checkOut=${day(to)}`).then((r) => r.body.items.map((l: { title: string }) => l.title));

    expect(await search(11, 12)).toEqual(["Free cabin"]); // inside the booking
    expect(await search(8, 11)).toEqual(["Free cabin"]); // overlaps the start
    expect((await search(13, 15)).sort()).toEqual(["Booked cabin", "Free cabin"]); // starts on check-out day
    expect((await search(7, 10)).sort()).toEqual(["Booked cabin", "Free cabin"]); // ends on check-in day
  });

  it("rejects a search with only one date", async () => {
    const res = await request(app).get(`/api/listings?checkIn=${day(3)}`);
    expect(res.status).toBe(400);
  });

  it("shows booked dates but not who booked them", async () => {
    const host = await signUp("Host");
    const guest = await signUp("Guest");
    const listing = await createListing(host.agent);
    await insertBooking(listing.id, guest.user.id, 4, 6);
    await insertBooking(listing.id, guest.user.id, -10, -8); // past: not shown

    const res = await request(app).get(`/api/listings/${listing.id}`);
    expect(res.status).toBe(200);
    expect(res.body.listing.bookedRanges).toEqual([{ checkIn: day(4), checkOut: day(6) }]);
    expect(JSON.stringify(res.body)).not.toContain(guest.user.id);
    expect(res.body.listing.host).not.toHaveProperty("email");
  });

  it("returns 404 for an unknown listing", async () => {
    expect((await request(app).get("/api/listings/does-not-exist")).status).toBe(404);
  });
});
