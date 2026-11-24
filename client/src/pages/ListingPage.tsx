import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import { format } from "date-fns";
import { Bath, BedDouble, Check, ChevronLeft, DoorOpen, Grid3x3, MapPin, Pencil, Users } from "lucide-react";
import { ApiError, api, type ListingDetail } from "../lib/api";
import { useAuth } from "../lib/auth";
import { PROPERTY_LABEL, dateRangeLabel, fromIso, money, nights as countNights, plural, prettyDate, quote } from "../lib/format";
import { Popover, RangeCalendar, Stepper, type Range } from "../components/pickers";
import { Avatar, ErrorBox, Modal, Rating, Spinner, useToast } from "../components/ui";
import { NotFound } from "./NotFound";

export function ListingPage() {
  const { id = "" } = useParams();
  const q = useQuery({ queryKey: ["listing", id], queryFn: () => api.listing(id).then((r) => r.listing) });

  if (q.isPending) return <Spinner label="Loading stay" />;
  if (q.isError) {
    if (q.error instanceof ApiError && q.error.status === 404) return <NotFound message="This stay doesn't exist or was removed." />;
    return (
      <div className="mx-auto max-w-3xl p-6">
        <ErrorBox message={q.error.message} onRetry={() => q.refetch()} />
      </div>
    );
  }
  return <Listing listing={q.data} />;
}

/** Grid placement so 1–5 photos always fill the gallery without gaps. */
function photoSpan(i: number, count: number): string {
  if (i === 0) return count === 1 ? "col-span-4 row-span-2" : "col-span-4 row-span-2 sm:col-span-2";
  const layouts: Record<number, string[]> = {
    2: ["sm:col-span-2 sm:row-span-2"],
    3: ["sm:col-span-2", "sm:col-span-2"],
    4: ["sm:col-span-2", "", ""],
    5: ["", "", "", ""],
  };
  return `hidden sm:block ${layouts[count]?.[i - 1] ?? ""}`;
}

function Listing({ listing }: { listing: ListingDetail }) {
  const [showPhotos, setShowPhotos] = useState(false);
  const photos = listing.photos;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        <ChevronLeft className="size-4" /> All stays
      </Link>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{listing.title}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <Rating rating={listing.rating} />
        {listing.reviewCount > 0 && (
          <a href="#reviews" className="font-medium underline">
            {plural(listing.reviewCount, "review")}
          </a>
        )}
        <span className="text-muted">·</span>
        <span className="inline-flex items-center gap-1 font-medium">
          <MapPin className="size-3.5" />
          {listing.city}, {listing.country}
        </span>
      </div>

      {/* Photo grid */}
      <div className="relative mt-6 grid h-[280px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl sm:h-[440px]">
        {photos.slice(0, 5).map((src, i) => (
          <button
            key={i}
            onClick={() => setShowPhotos(true)}
            className={`group overflow-hidden bg-gray-100 ${photoSpan(i, Math.min(photos.length, 5))}`}
            aria-label={`Open photo ${i + 1}`}
          >
            <img src={src} alt="" className="size-full object-cover transition group-hover:brightness-90" />
          </button>
        ))}
        {photos.length > 1 && (
          <button onClick={() => setShowPhotos(true)} className="btn absolute bottom-4 right-4 border border-ink bg-white py-1.5 shadow">
            <Grid3x3 className="size-4" /> Show all photos
          </button>
        )}
      </div>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_380px]">
        <div>
          <div className="flex items-start justify-between gap-4 border-b border-line pb-6">
            <div>
              <h2 className="text-xl font-semibold">
                {PROPERTY_LABEL[listing.propertyType]} hosted by {listing.host.name}
              </h2>
              <p className="mt-1 text-muted">
                {plural(listing.maxGuests, "guest")} · {plural(listing.bedrooms, "bedroom")} · {plural(listing.beds, "bed")} ·{" "}
                {plural(listing.baths, "bathroom")}
              </p>
            </div>
            <Avatar name={listing.host.name} url={listing.host.avatarUrl} size={52} />
          </div>

          <div className="grid grid-cols-2 gap-4 border-b border-line py-6 sm:grid-cols-4">
            {[
              { icon: Users, label: plural(listing.maxGuests, "guest") },
              { icon: DoorOpen, label: plural(listing.bedrooms, "bedroom") },
              { icon: BedDouble, label: plural(listing.beds, "bed") },
              { icon: Bath, label: plural(listing.baths, "bath") },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border border-line p-3 text-sm">
                <Icon className="size-5" /> {label}
              </div>
            ))}
          </div>

          <div className="border-b border-line py-6">
            <h2 className="mb-3 text-xl font-semibold">About this place</h2>
            <p className="whitespace-pre-line leading-relaxed text-ink/90">{listing.description}</p>
          </div>

          {listing.amenities.length > 0 && (
            <div className="border-b border-line py-6">
              <h2 className="mb-4 text-xl font-semibold">What this place offers</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {listing.amenities.map((a) => (
                  <li key={a} className="flex items-center gap-3">
                    <Check className="size-4 text-emerald-600" /> {a}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-4 py-6">
            <Avatar name={listing.host.name} url={listing.host.avatarUrl} size={56} />
            <div>
              <h3 className="font-semibold">Hosted by {listing.host.name}</h3>
              <p className="text-sm text-muted">Hosting on Nestly since {format(new Date(listing.host.createdAt), "MMMM yyyy")}</p>
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <BookingCard listing={listing} />
        </aside>
      </div>

      <section id="reviews" className="mt-6 scroll-mt-24 border-t border-line pt-10">
        <h2 className="mb-6 flex items-center gap-3 text-xl font-semibold">
          <Rating rating={listing.rating} className="text-xl" />
          {listing.reviewCount > 0 ? <span>· {plural(listing.reviewCount, "review")}</span> : <span className="text-base font-normal text-muted">No reviews yet</span>}
        </h2>
        <div className="grid gap-x-16 gap-y-8 md:grid-cols-2">
          {listing.reviews.map((r) => (
            <article key={r.id}>
              <div className="flex items-center gap-3">
                <Avatar name={r.author.name} url={r.author.avatarUrl} size={44} />
                <div>
                  <div className="font-semibold">{r.author.name}</div>
                  <div className="text-sm text-muted">{format(new Date(r.createdAt), "MMMM yyyy")}</div>
                </div>
              </div>
              <div className="mt-2 text-sm" aria-label={`${r.rating} out of 5 stars`}>
                {"★".repeat(r.rating)}
                <span className="text-gray-300">{"★".repeat(5 - r.rating)}</span>
              </div>
              <p className="mt-1.5 leading-relaxed text-ink/90">{r.comment}</p>
            </article>
          ))}
        </div>
      </section>

      {showPhotos && (
        <Modal title={`Photos of ${listing.title}`} onClose={() => setShowPhotos(false)}>
          <div className="-mx-2 max-h-[70vh] space-y-3 overflow-y-auto px-2">
            {photos.map((src, i) => (
              <img key={i} src={src} alt={`Photo ${i + 1}`} className="w-full rounded-xl" />
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

function BookingCard({ listing }: { listing: ListingDetail }) {
  const { user } = useAuth();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const toast = useToast();

  const isBooked = (iso?: string | null) => !!iso && listing.bookedRanges.some((b) => iso >= b.checkIn && iso < b.checkOut);
  const initialIn = sp.get("checkIn");
  const initialOut = sp.get("checkOut");
  // Only keep dates from the search if they're still free for this stay.
  const initialFree =
    initialIn && initialOut && !listing.bookedRanges.some((b) => initialIn < b.checkOut && initialOut > b.checkIn) && !isBooked(initialIn);
  const [range, setRange] = useState<Range>(initialFree ? { checkIn: initialIn!, checkOut: initialOut! } : {});
  const [guests, setGuests] = useState(1);
  const [calOpen, setCalOpen] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);

  const n = range.checkIn && range.checkOut ? countNights(range.checkIn, range.checkOut) : 0;
  const price = quote(listing.pricePerNight, listing.cleaningFee, n);
  const isHost = user?.id === listing.hostId;

  const book = useMutation({
    mutationFn: () => api.book({ listingId: listing.id, checkIn: range.checkIn!, checkOut: range.checkOut!, guests }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["listing", listing.id] });
      qc.invalidateQueries({ queryKey: ["trips"] });
      qc.invalidateQueries({ queryKey: ["listings"] });
      toast("success", `You're going to ${listing.city}! Booking confirmed.`);
      navigate("/trips");
    },
    onError: (e) => {
      // Someone may have just taken those dates; refresh the calendar.
      if (e instanceof ApiError && e.status === 409) qc.invalidateQueries({ queryKey: ["listing", listing.id] });
    },
  });

  const reserve = () => {
    if (!n) return setCalOpen(true);
    if (!user) {
      const next = `${location.pathname}?checkIn=${range.checkIn}&checkOut=${range.checkOut}`;
      return navigate(`/login?next=${encodeURIComponent(next)}`);
    }
    book.mutate();
  };

  return (
    <div className="card p-6 shadow-xl shadow-black/5">
      <div className="mb-5 flex items-baseline justify-between">
        <p>
          <span className="text-2xl font-bold">{money(listing.pricePerNight)}</span> <span className="text-muted">night</span>
        </p>
        <Rating rating={listing.rating} count={listing.reviewCount} />
      </div>

      <div className="rounded-xl border border-ink/40">
        <Popover
          open={calOpen}
          setOpen={setCalOpen}
          align="right"
          trigger={
            <button type="button" className="grid w-full grid-cols-2 text-left" onClick={() => setCalOpen((o) => !o)}>
              <span className="border-r border-ink/40 px-3 py-2.5">
                <span className="block text-[10px] font-bold uppercase tracking-wide">Check-in</span>
                <span className={`text-sm ${range.checkIn ? "" : "text-muted"}`}>{range.checkIn ? prettyDate(range.checkIn) : "Add date"}</span>
              </span>
              <span className="px-3 py-2.5">
                <span className="block text-[10px] font-bold uppercase tracking-wide">Check-out</span>
                <span className={`text-sm ${range.checkOut ? "" : "text-muted"}`}>{range.checkOut ? prettyDate(range.checkOut) : "Add date"}</span>
              </span>
            </button>
          }
        >
          <div className="mb-2 flex items-center justify-between">
            <div>
              <div className="font-semibold">{n ? plural(n, "night") : "Select dates"}</div>
              <div className="text-sm text-muted">
                {n ? `${format(fromIso(range.checkIn!), "d MMM")} – ${format(fromIso(range.checkOut!), "d MMM yyyy")}` : "Struck-through dates are already booked"}
              </div>
            </div>
            {range.checkIn && (
              <button className="text-sm font-semibold underline" onClick={() => setRange({})}>
                Clear
              </button>
            )}
          </div>
          <RangeCalendar
            value={range}
            booked={listing.bookedRanges}
            months={typeof window !== "undefined" && window.innerWidth < 768 ? 1 : 2}
            onChange={(r) => {
              setRange(r);
              book.reset();
              if (r.checkIn && r.checkOut) setCalOpen(false);
            }}
          />
        </Popover>
        <Popover
          open={guestsOpen}
          setOpen={setGuestsOpen}
          align="right"
          trigger={
            <button type="button" className="w-full border-t border-ink/40 px-3 py-2.5 text-left" onClick={() => setGuestsOpen((o) => !o)}>
              <span className="block text-[10px] font-bold uppercase tracking-wide">Guests</span>
              <span className="text-sm">{plural(guests, "guest")}</span>
            </button>
          }
        >
          <div className="w-72">
            <Stepper label="Guests" hint={`This place allows up to ${listing.maxGuests}`} value={guests} min={1} max={listing.maxGuests} onChange={setGuests} />
          </div>
        </Popover>
      </div>

      {isHost ? (
        <Link to={`/host/listings/${listing.id}/edit`} className="btn-outline mt-4 w-full py-3">
          <Pencil className="size-4" /> This is your stay. Edit it
        </Link>
      ) : (
        <button className="btn-primary mt-4 w-full py-3 text-base" onClick={reserve} disabled={book.isPending}>
          {book.isPending ? "Booking…" : n ? "Reserve" : "Check availability"}
        </button>
      )}

      {book.isError && (
        <div className="mt-3">
          <ErrorBox message={book.error.message} />
        </div>
      )}

      {n > 0 && !isHost && (
        <>
          <p className="mt-3 text-center text-sm text-muted">You won't be charged in this demo</p>
          <dl className="mt-5 space-y-3 text-[15px]">
            <div className="flex justify-between">
              <dt className="underline decoration-dotted">
                {money(listing.pricePerNight)} × {plural(n, "night")}
              </dt>
              <dd>{money(price.subtotal)}</dd>
            </div>
            {price.cleaningFee > 0 && (
              <div className="flex justify-between">
                <dt className="underline decoration-dotted">Cleaning fee</dt>
                <dd>{money(price.cleaningFee)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="underline decoration-dotted">Nestly service fee</dt>
              <dd>{money(price.serviceFee)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-4 font-semibold">
              <dt>Total ({dateRangeLabel(range.checkIn, range.checkOut)})</dt>
              <dd>{money(price.total)}</dd>
            </div>
          </dl>
        </>
      )}
    </div>
  );
}
