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

/** Time zone that decides what "today" is for check-in, cancellation and review rules. */
export const DEFAULT_TIME_ZONE = "Asia/Kolkata";

/**
 * Today's date in the app's time zone (APP_TIME_ZONE, default Asia/Kolkata).
 * Using UTC here would make the server think it's still yesterday between
 * midnight and 5:30 AM in India, so a guest's "today" check-in would be
 * rejected as past for the first few hours of the day.
 */
export function todayIso(now: Date = new Date(), timeZone = process.env.APP_TIME_ZONE || DEFAULT_TIME_ZONE): string {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** "2026-12-01" + 3 -> "2026-12-04" */
export function addDays(iso: string, days: number): string {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toIso(d);
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round((toDate(checkOut).getTime() - toDate(checkIn).getTime()) / 86_400_000);
}
