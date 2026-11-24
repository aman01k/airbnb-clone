import { z } from "zod";

/**
 * Stays are whole days. We store them as Postgres DATE values and pass them
 * around as "YYYY-MM-DD" strings, so time zones never shift a booking by a day.
 */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const isoDate = z
  .string()
  .regex(ISO_DATE, "Use the format YYYY-MM-DD")
  .refine((s) => !Number.isNaN(toDate(s).getTime()) && toIso(toDate(s)) === s, "Not a real date");

/** "2026-12-01" -> Date at 00:00 UTC */
export function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

/** Date -> "2026-12-01" (UTC) */
export function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function todayIso(): string {
  return toIso(new Date());
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round((toDate(checkOut).getTime() - toDate(checkIn).getTime()) / 86_400_000);
}
