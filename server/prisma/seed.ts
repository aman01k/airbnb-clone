/**
 * Demo data: 3 hosts, 6 guests, 16 stays across India, and a mix of past,
 * upcoming and cancelled bookings so every screen has something to show.
 * Dates are relative to today, so the demo never goes stale.
 *
 * Every demo account uses the password: password123
 */
import { PrismaClient, type PropertyType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { nightsBetween, toDate, toIso } from "../src/lib/dates.js";
import { quote } from "../src/lib/pricing.js";

const prisma = new PrismaClient();

const PHOTO_IDS = [
  "photo-1505873242700-f289a29e1e0f",
  "photo-1554995207-c18c203602cb",
  "photo-1505691938895-1758d7feb511",
  "photo-1556020685-ae41abfc9365",
  "photo-1513694203232-719a280e022f",
  "photo-1524758631624-e2822e304c36",
  "photo-1505693314120-0d443867891c",
  "photo-1522708323590-d24dbb6b0267",
  "photo-1507089947368-19c1da9775ae",
  "photo-1522156373667-4c7234bbd804",
  "photo-1494203484021-3c454daf695d",
  "photo-1516455590571-18256e5bb9ff",
  "photo-1519643381401-22c77e60520e",
  "photo-1523755231516-e43fd2e8dca5",
];
const photo = (i: number) =>
  `https://images.unsplash.com/${PHOTO_IDS[i % PHOTO_IDS.length]}?auto=format&fit=crop&w=1200&q=70`;
const photosFrom = (start: number) => [0, 3, 6, 9, 12].map((k) => photo(start + k));

const day = (offset: number) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offset);
  return toIso(d);
};

type Seed = {
  host: number;
  title: string;
  description: string;
  propertyType: PropertyType;
  city: string;
  country?: string;
  pricePerNight: number;
  cleaningFee: number;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  baths: number;
  amenities: string[];
};

const LISTINGS: Seed[] = [
  { host: 0, title: "Sunlit Portuguese villa near Anjuna beach", description: "A restored 1920s Portuguese villa with high ceilings, a shaded verandah and a private plunge pool. Anjuna beach and the Wednesday flea market are a 7-minute walk away. The caretaker can arrange Goan breakfast on request.", propertyType: "VILLA", city: "Goa", pricePerNight: 9800, cleaningFee: 1200, maxGuests: 8, bedrooms: 4, beds: 5, baths: 4, amenities: ["Wifi", "Pool", "Air conditioning", "Kitchen", "Free parking", "Breakfast available"] },
  { host: 1, title: "Minimal studio steps from Palolem", description: "A bright, minimal studio in a quiet lane behind Palolem beach. Comfortable queen bed, a fast connection for remote work and a balcony that catches the sea breeze in the evening.", propertyType: "APARTMENT", city: "Goa", pricePerNight: 3200, cleaningFee: 400, maxGuests: 2, bedrooms: 1, beds: 1, baths: 1, amenities: ["Wifi", "Air conditioning", "Workspace", "Balcony"] },
  { host: 2, title: "Treehouse cottage in the Assagao hills", description: "Sleep among the treetops in a wooden cottage built around an old mango tree. Outdoor shower, hammock deck and a short scooter ride to Assagao's cafés.", propertyType: "CABIN", city: "Goa", pricePerNight: 5400, cleaningFee: 600, maxGuests: 3, bedrooms: 1, beds: 2, baths: 1, amenities: ["Wifi", "Garden", "Hammock", "Free parking"] },
  { host: 0, title: "Pine-wood cabin with Himalayan views", description: "A cosy pine cabin above Old Manali with floor-to-ceiling windows facing the Dhauladhar range. Wood-fired heater, a reading nook and a host family next door who cook excellent rajma chawal.", propertyType: "CABIN", city: "Manali", pricePerNight: 4600, cleaningFee: 500, maxGuests: 4, bedrooms: 2, beds: 2, baths: 1, amenities: ["Wifi", "Heating", "Mountain view", "Kitchen", "Free parking"] },
  { host: 1, title: "Riverside homestay in Vashisht", description: "Wake up to the Beas river in this family-run homestay near the Vashisht hot springs. Simple, clean rooms with thick quilts and home-cooked Himachali meals.", propertyType: "ROOM", city: "Manali", pricePerNight: 1800, cleaningFee: 0, maxGuests: 2, bedrooms: 1, beds: 1, baths: 1, amenities: ["Wifi", "Heating", "River view", "Breakfast available"] },
  { host: 2, title: "Heritage haveli suite in the Pink City", description: "A hand-painted suite inside a 200-year-old haveli in the walled city. Jharokha windows, a rooftop with views of Nahargarh Fort and Hawa Mahal a 10-minute walk away.", propertyType: "ROOM", city: "Jaipur", pricePerNight: 4200, cleaningFee: 300, maxGuests: 2, bedrooms: 1, beds: 1, baths: 1, amenities: ["Wifi", "Air conditioning", "Rooftop", "Breakfast available"] },
  { host: 0, title: "Modern family home in C-Scheme", description: "A spacious three-bedroom home in Jaipur's leafy C-Scheme neighbourhood. Fully equipped kitchen, a small lawn for kids and quick access to the city's best restaurants.", propertyType: "HOUSE", city: "Jaipur", pricePerNight: 6900, cleaningFee: 800, maxGuests: 6, bedrooms: 3, beds: 4, baths: 3, amenities: ["Wifi", "Air conditioning", "Kitchen", "Washer", "Free parking", "Garden"] },
  { host: 1, title: "Lakeside rooftop flat facing Lake Pichola", description: "Watch the sun set over Lake Pichola and the City Palace from a private rooftop terrace. The flat is in Gangaur Ghat, close to the old city but tucked away from the noise.", propertyType: "APARTMENT", city: "Udaipur", pricePerNight: 5600, cleaningFee: 500, maxGuests: 4, bedrooms: 2, beds: 2, baths: 2, amenities: ["Wifi", "Air conditioning", "Lake view", "Rooftop", "Kitchen"] },
  { host: 2, title: "Quiet yoga retreat room above the Ganga", description: "A calm room with a balcony over the Ganga in Tapovan. Morning yoga classes run on the terrace and the Laxman Jhula is a short walk away.", propertyType: "ROOM", city: "Rishikesh", pricePerNight: 2100, cleaningFee: 0, maxGuests: 2, bedrooms: 1, beds: 1, baths: 1, amenities: ["Wifi", "River view", "Yoga deck", "Breakfast available"] },
  { host: 0, title: "Tea-estate bungalow in the Munnar hills", description: "A colonial planter's bungalow surrounded by tea gardens. Misty mornings, a fireplace, an estate walk with the manager and fresh cardamom tea all day.", propertyType: "HOUSE", city: "Munnar", pricePerNight: 7800, cleaningFee: 900, maxGuests: 6, bedrooms: 3, beds: 3, baths: 3, amenities: ["Wifi", "Fireplace", "Mountain view", "Kitchen", "Free parking"] },
  { host: 1, title: "Art-deco flat on Marine Drive", description: "A high-ceilinged art-deco apartment with sea-facing windows on Marine Drive. Walk to Churchgate, Kala Ghoda's galleries and the best of South Bombay's food.", propertyType: "APARTMENT", city: "Mumbai", pricePerNight: 8800, cleaningFee: 1000, maxGuests: 4, bedrooms: 2, beds: 2, baths: 2, amenities: ["Wifi", "Air conditioning", "Sea view", "Kitchen", "Elevator"] },
  { host: 2, title: "Bandra loft for creative workers", description: "An open-plan loft in Bandra West with a long work desk, a monitor and a 200 Mbps connection. Cafés, Carter Road promenade and the sea link are minutes away.", propertyType: "APARTMENT", city: "Mumbai", pricePerNight: 6200, cleaningFee: 700, maxGuests: 2, bedrooms: 1, beds: 1, baths: 1, amenities: ["Wifi", "Air conditioning", "Workspace", "Washer", "Elevator"] },
  { host: 0, title: "Garden cottage in Indiranagar", description: "A quiet garden cottage behind a family home in Indiranagar, close to 12th Main's restaurants and the metro. Good for longer work trips.", propertyType: "HOUSE", city: "Bengaluru", pricePerNight: 3900, cleaningFee: 400, maxGuests: 3, bedrooms: 1, beds: 2, baths: 1, amenities: ["Wifi", "Workspace", "Garden", "Kitchen", "Washer"] },
  { host: 1, title: "Coffee-plantation villa in Coorg", description: "A four-bedroom villa on a working coffee estate with a pool, a bonfire pit and guided plantation walks. Pandi curry dinners can be arranged with the estate cook.", propertyType: "VILLA", city: "Coorg", pricePerNight: 11500, cleaningFee: 1500, maxGuests: 10, bedrooms: 4, beds: 6, baths: 4, amenities: ["Wifi", "Pool", "Bonfire", "Kitchen", "Free parking", "Breakfast available"] },
  { host: 2, title: "Snow-view attic near Mall Road", description: "A warm attic room with skylights in a Victorian-era building, five minutes from Shimla's Mall Road and the Ridge. Heated floors and a view of snow-capped peaks in winter.", propertyType: "ROOM", city: "Shimla", pricePerNight: 2700, cleaningFee: 200, maxGuests: 2, bedrooms: 1, beds: 1, baths: 1, amenities: ["Wifi", "Heating", "Mountain view"] },
  { host: 0, title: "French Quarter house with a courtyard", description: "A yellow colonial house in Pondicherry's White Town with a bougainvillea courtyard. Walk to the promenade, the bakeries of Rue Romain Rolland and the Aurobindo Ashram.", propertyType: "HOUSE", city: "Pondicherry", pricePerNight: 6400, cleaningFee: 700, maxGuests: 5, bedrooms: 2, beds: 3, baths: 2, amenities: ["Wifi", "Air conditioning", "Courtyard", "Kitchen", "Bicycles"] },
];

const REVIEW_TEXT = [
  "Exactly like the photos. Spotless, quiet and the host replied within minutes. Would stay again.",
  "Beautiful place and a great location. The bed was very comfortable and check-in was easy.",
  "Lovely stay overall. The Wi-Fi dropped once in the evening but the host sorted it quickly.",
  "One of the best stays we've had in India. The views alone are worth it.",
  "Clean, comfortable and well equipped. Good value for the area.",
  "The host's food recommendations made our trip. Thoughtful touches everywhere.",
];

async function main() {
  console.log("Clearing old data…");
  await prisma.review.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  const hosts = await Promise.all(
    [
      { name: "Ananya Sharma", email: "host@nestly.dev" },
      { name: "Kabir Mehta", email: "kabir@nestly.dev" },
      { name: "Leela Nair", email: "leela@nestly.dev" },
    ].map((u) => prisma.user.create({ data: { ...u, passwordHash } })),
  );
  const guests = await Promise.all(
    [
      { name: "Demo Guest", email: "guest@nestly.dev" },
      { name: "Rohan Verma", email: "rohan@nestly.dev" },
      { name: "Sara Khan", email: "sara@nestly.dev" },
      { name: "Ishaan Gupta", email: "ishaan@nestly.dev" },
      { name: "Meera Iyer", email: "meera@nestly.dev" },
      { name: "Arjun Rao", email: "arjun@nestly.dev" },
    ].map((u) => prisma.user.create({ data: { ...u, passwordHash } })),
  );
  const [demoGuest, ...otherGuests] = guests;

  console.log("Creating stays…");
  const listings = [];
  for (const [i, l] of LISTINGS.entries()) {
    const { host, country, ...data } = l;
    listings.push(
      await prisma.listing.create({
        data: { ...data, country: country ?? "India", hostId: hosts[host].id, photos: photosFrom(i) },
      }),
    );
  }

  console.log("Creating bookings and reviews…");
  const book = async (listingIdx: number, guestId: string, from: number, nights: number, opts: { guests?: number; cancelled?: boolean } = {}) => {
    const listing = listings[listingIdx];
    const checkIn = day(from);
    const checkOut = day(from + nights);
    return prisma.booking.create({
      data: {
        listingId: listing.id,
        guestId,
        checkIn: toDate(checkIn),
        checkOut: toDate(checkOut),
        guests: Math.min(opts.guests ?? 2, listing.maxGuests),
        status: opts.cancelled ? "CANCELLED" : "CONFIRMED",
        ...quote(listing.pricePerNight, listing.cleaningFee, nightsBetween(checkIn, checkOut)),
      },
    });
  };

  // Past stays with reviews, spread across most listings so ratings vary.
  let r = 0;
  for (const [i] of listings.entries()) {
    const reviewers = otherGuests.slice(0, 2 + (i % 4));
    for (const [k, g] of reviewers.entries()) {
      const b = await book(i, g.id, -120 + k * 12 + (i % 5), 2 + (k % 3));
      const rating = [5, 5, 4, 5, 4, 3, 5][(i + k) % 7];
      await prisma.review.create({
        data: { bookingId: b.id, listingId: b.listingId, authorId: g.id, rating, comment: REVIEW_TEXT[r++ % REVIEW_TEXT.length] },
      });
    }
  }

  // The demo guest: one past stay waiting for a review, one upcoming trip, one cancelled.
  await book(3, demoGuest.id, -9, 3); // Manali cabin, ready to review
  await book(7, demoGuest.id, 14, 4); // Udaipur flat, upcoming
  await book(1, demoGuest.id, 30, 2, { cancelled: true });

  // Upcoming bookings by others, so some dates show as unavailable.
  await book(0, otherGuests[0].id, 5, 4, { guests: 6 });
  await book(0, otherGuests[1].id, 12, 3);
  await book(5, otherGuests[2].id, 3, 2);
  await book(9, otherGuests[3].id, 8, 5);
  await book(13, otherGuests[4].id, 20, 3, { guests: 8 });
  await book(10, otherGuests[0].id, 2, 6);

  const counts = await Promise.all([prisma.user.count(), prisma.listing.count(), prisma.booking.count(), prisma.review.count()]);
  console.log(`Seeded ${counts[0]} users, ${counts[1]} stays, ${counts[2]} bookings, ${counts[3]} reviews.`);
  console.log("Log in as guest@nestly.dev or host@nestly.dev with password: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
