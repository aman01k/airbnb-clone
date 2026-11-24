import { useState } from "react";
import { Link } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ListingSummary } from "../lib/api";
import { PROPERTY_LABEL, money, nights, plural } from "../lib/format";
import { Rating } from "./ui";

export function ListingCard({ listing, checkIn, checkOut }: { listing: ListingSummary; checkIn?: string; checkOut?: string }) {
  const [index, setIndex] = useState(0);
  const photos = listing.photos.length ? listing.photos : [""];
  const n = checkIn && checkOut ? nights(checkIn, checkOut) : 0;
  const href = `/listings/${listing.id}${checkIn && checkOut ? `?checkIn=${checkIn}&checkOut=${checkOut}` : ""}`;

  const step = (e: React.MouseEvent, dir: 1 | -1) => {
    e.preventDefault();
    setIndex((i) => (i + dir + photos.length) % photos.length);
  };

  return (
    <Link to={href} className="group block">
      <div className="relative aspect-[20/19] overflow-hidden rounded-2xl bg-gray-100">
        <img
          src={photos[index]}
          alt={listing.title}
          loading="lazy"
          className="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
        />
        {photos.length > 1 && (
          <>
            <button
              onClick={(e) => step(e, -1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 opacity-0 shadow transition group-hover:opacity-100 focus:opacity-100"
              aria-label="Previous photo"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={(e) => step(e, 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 opacity-0 shadow transition group-hover:opacity-100 focus:opacity-100"
              aria-label="Next photo"
            >
              <ChevronRight className="size-4" />
            </button>
            <div className="absolute inset-x-0 bottom-2.5 flex justify-center gap-1">
              {photos.map((_, i) => (
                <span key={i} className={`size-1.5 rounded-full ${i === index ? "bg-white" : "bg-white/55"}`} />
              ))}
            </div>
          </>
        )}
      </div>
      <div className="mt-3 flex items-start justify-between gap-2">
        <h3 className="font-semibold">
          {PROPERTY_LABEL[listing.propertyType]} in {listing.city}
        </h3>
        <Rating rating={listing.rating} className="shrink-0" />
      </div>
      <p className="line-clamp-1 text-sm text-muted">{listing.title}</p>
      <p className="text-sm text-muted">
        {plural(listing.maxGuests, "guest")} · {plural(listing.beds, "bed")}
      </p>
      <p className="mt-1.5 text-[15px]">
        <span className="font-semibold">{money(listing.pricePerNight)}</span> <span className="text-muted">night</span>
        {n > 0 && <span className="text-muted"> · {money(listing.pricePerNight * n)} total before fees</span>}
      </p>
    </Link>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[20/19] rounded-2xl bg-gray-200" />
      <div className="mt-3 h-4 w-2/3 rounded bg-gray-200" />
      <div className="mt-2 h-3 w-1/2 rounded bg-gray-200" />
      <div className="mt-2 h-3 w-1/3 rounded bg-gray-200" />
    </div>
  );
}
