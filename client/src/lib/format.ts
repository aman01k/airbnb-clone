import { differenceInCalendarDays, format, parseISO } from "date-fns";
import type { PropertyType } from "./api";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const money = (n: number) => inr.format(n);

export const PROPERTY_LABEL: Record<PropertyType, string> = {
  HOUSE: "House",
  APARTMENT: "Apartment",
  VILLA: "Villa",
  CABIN: "Cabin",
  ROOM: "Private room",
};

/** Date-only strings are parsed as local dates so the calendar never shifts a day. */
export const fromIso = (iso: string) => parseISO(iso);
export const toIso = (d: Date) => format(d, "yyyy-MM-dd");
export const todayIsoLocal = () => toIso(new Date());
export const prettyDate = (iso: string) => format(fromIso(iso), "d MMM yyyy");
export const shortDate = (iso: string) => format(fromIso(iso), "d MMM");
export const nights = (checkIn: string, checkOut: string) => differenceInCalendarDays(fromIso(checkOut), fromIso(checkIn));

export const plural = (n: number, word: string, pluralWord = `${word}s`) => `${n} ${n === 1 ? word : pluralWord}`;

export function dateRangeLabel(checkIn?: string, checkOut?: string) {
  if (!checkIn || !checkOut) return "";
  const a = fromIso(checkIn);
  const b = fromIso(checkOut);
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return `${format(a, "d")}–${format(b, "d MMM")}`;
  return `${format(a, "d MMM")} – ${format(b, "d MMM")}`;
}

/** Same formula as the server (server/src/lib/pricing.ts). The server's number is the one charged. */
export const SERVICE_FEE_RATE = 0.12;
export function quote(pricePerNight: number, cleaningFee: number, n: number) {
  const subtotal = pricePerNight * n;
  const serviceFee = Math.round(subtotal * SERVICE_FEE_RATE);
  return { subtotal, cleaningFee, serviceFee, total: subtotal + cleaningFee + serviceFee };
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
