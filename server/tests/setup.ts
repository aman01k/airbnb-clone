import { afterAll, beforeEach } from "vitest";
import { testDatabaseUrl } from "./test-db.js";

process.env.DATABASE_URL = testDatabaseUrl();
process.env.NODE_ENV = "test";
process.env.JWT_SECRET ??= "test-secret";

const { prisma } = await import("../src/db.js");

beforeEach(async () => {
  await prisma.$executeRawUnsafe('TRUNCATE "Review", "Booking", "Listing", "User" CASCADE');
});

afterAll(async () => {
  await prisma.$disconnect();
});
