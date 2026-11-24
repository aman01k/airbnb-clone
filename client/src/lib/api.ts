// ---------------------------------------------------------------------------
// Types mirroring the API responses
// ---------------------------------------------------------------------------

export type PropertyType = "APARTMENT" | "HOUSE" | "VILLA" | "CABIN" | "ROOM";
export const PROPERTY_TYPES: PropertyType[] = ["HOUSE", "APARTMENT", "VILLA", "CABIN", "ROOM"];

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface ListingSummary {
  id: string;
  title: string;
  city: string;
  country: string;
  propertyType: PropertyType;
  pricePerNight: number;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  photos: string[];
  rating: number | null;
  reviewCount: number;
}

export interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  author: { id: string; name: string; avatarUrl: string | null };
}

export interface ListingDetail extends ListingSummary {
  description: string;
  cleaningFee: number;
  baths: number;
  amenities: string[];
  hostId: string;
  host: { id: string; name: string; avatarUrl: string | null; createdAt: string };
  reviews: Review[];
  bookedRanges: { checkIn: string; checkOut: string }[];
}

export interface ListingInput {
  title: string;
  description: string;
  propertyType: PropertyType;
  city: string;
  country: string;
  pricePerNight: number;
  cleaningFee: number;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  baths: number;
  amenities: string[];
  photos: string[];
}

export interface Booking {
  id: string;
  listingId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  subtotal: number;
  cleaningFee: number;
  serviceFee: number;
  total: number;
  status: "CONFIRMED" | "CANCELLED";
  createdAt: string;
}

export interface Trip extends Booking {
  listing: { id: string; title: string; city: string; country: string; photos: string[] };
  review: { id: string; rating: number } | null;
  canCancel: boolean;
  canReview: boolean;
}

export interface Reservation extends Booking {
  listing: { id: string; title: string; city: string };
  guest: { id: string; name: string };
}

export interface HostListing extends ListingSummary {
  upcomingBookings: number;
}

export interface SearchParams {
  city?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  minPrice?: number;
  maxPrice?: number;
  types?: PropertyType[];
  sort?: "recommended" | "price_asc" | "price_desc" | "newest";
  page?: number;
}

// ---------------------------------------------------------------------------
// Fetch wrapper
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: Record<string, string>,
  ) {
    super(message);
  }
}

const BASE = import.meta.env.VITE_API_URL ?? "";

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      credentials: "include",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? "Something went wrong.", data.details);
  return data as T;
}

function qs(params: object): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) continue;
    sp.set(k, Array.isArray(v) ? v.join(",") : String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const api = {
  me: () => request<{ user: User | null }>("GET", "/auth/me"),
  login: (email: string, password: string) => request<{ user: User }>("POST", "/auth/login", { email, password }),
  register: (name: string, email: string, password: string) =>
    request<{ user: User }>("POST", "/auth/register", { name, email, password }),
  logout: () => request<void>("POST", "/auth/logout"),

  searchListings: (p: SearchParams) =>
    request<{ items: ListingSummary[]; total: number; page: number; pageSize: number }>("GET", `/listings${qs(p)}`),
  destinations: () => request<{ destinations: { city: string; country: string; count: number }[] }>("GET", "/listings/destinations"),
  listing: (id: string) => request<{ listing: ListingDetail }>("GET", `/listings/${id}`),
  createListing: (input: ListingInput) => request<{ listing: ListingDetail }>("POST", "/listings", input),
  updateListing: (id: string, input: Partial<ListingInput>) => request<{ listing: ListingDetail }>("PATCH", `/listings/${id}`, input),
  deleteListing: (id: string) => request<void>("DELETE", `/listings/${id}`),

  book: (input: { listingId: string; checkIn: string; checkOut: string; guests: number }) =>
    request<{ booking: Booking }>("POST", "/bookings", input),
  myTrips: () => request<{ bookings: Trip[] }>("GET", "/bookings/mine"),
  cancelBooking: (id: string) => request<{ booking: Booking }>("POST", `/bookings/${id}/cancel`),
  review: (bookingId: string, rating: number, comment: string) =>
    request<{ review: unknown }>("POST", `/bookings/${bookingId}/review`, { rating, comment }),

  hostListings: () => request<{ listings: HostListing[] }>("GET", "/host/listings"),
  hostReservations: () => request<{ upcoming: Reservation[]; past: Reservation[]; cancelled: Reservation[] }>("GET", "/host/reservations"),
};
