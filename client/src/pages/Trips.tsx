import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { Luggage, MessageSquareText } from "lucide-react";
import { api, type Trip } from "../lib/api";
import { money, plural, prettyDate, shortDate, todayIsoLocal } from "../lib/format";
import { EmptyState, ErrorBox, FieldError, Modal, Spinner, StarInput, useToast } from "../components/ui";
import { ApiError } from "../lib/api";

export function Trips() {
  const q = useQuery({ queryKey: ["trips"], queryFn: () => api.myTrips().then((r) => r.bookings) });
  const [reviewing, setReviewing] = useState<Trip | null>(null);
  const [cancelling, setCancelling] = useState<Trip | null>(null);

  if (q.isPending) return <Spinner label="Loading your trips" />;
  if (q.isError) return <div className="mx-auto max-w-3xl p-6"><ErrorBox message={q.error.message} onRetry={() => q.refetch()} /></div>;

  const today = todayIsoLocal();
  const upcoming = q.data.filter((b) => b.status === "CONFIRMED" && b.checkOut > today).reverse();
  const past = q.data.filter((b) => b.status === "CONFIRMED" && b.checkOut <= today);
  const cancelled = q.data.filter((b) => b.status === "CANCELLED");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">Trips</h1>

      {q.data.length === 0 ? (
        <div className="mt-8">
          <EmptyState icon={<Luggage className="size-10" />} title="No trips booked yet">
            Time to dust off your bags and start planning your next adventure.
            <div className="mt-4">
              <Link to="/" className="btn-primary">Start searching</Link>
            </div>
          </EmptyState>
        </div>
      ) : (
        <>
          <Section title="Upcoming" empty="Nothing planned yet.">
            {upcoming.map((t) => <TripRow key={t.id} trip={t} onCancel={() => setCancelling(t)} />)}
          </Section>
          <Section title="Where you've been" empty="Your past stays will show up here.">
            {past.map((t) => <TripRow key={t.id} trip={t} onReview={() => setReviewing(t)} />)}
          </Section>
          {cancelled.length > 0 && (
            <Section title="Cancelled">
              {cancelled.map((t) => <TripRow key={t.id} trip={t} />)}
            </Section>
          )}
        </>
      )}

      {reviewing && <ReviewModal trip={reviewing} onClose={() => setReviewing(null)} />}
      {cancelling && <CancelModal trip={cancelling} onClose={() => setCancelling(null)} />}
    </div>
  );
}

function Section({ title, empty, children }: { title: string; empty?: string; children: React.ReactNode[] }) {
  return (
    <section className="mt-10">
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>
      {children.length ? <div className="space-y-4">{children}</div> : <p className="text-sm text-muted">{empty}</p>}
    </section>
  );
}

function TripRow({ trip, onCancel, onReview }: { trip: Trip; onCancel?: () => void; onReview?: () => void }) {
  const cancelled = trip.status === "CANCELLED";
  return (
    <article className={`card flex flex-col overflow-hidden sm:flex-row ${cancelled ? "opacity-70" : ""}`}>
      <Link to={`/listings/${trip.listing.id}`} className="relative aspect-[16/10] shrink-0 bg-gray-100 sm:aspect-auto sm:min-h-36 sm:w-56">
        <img src={trip.listing.photos[0]} alt="" className="absolute inset-0 size-full object-cover" />
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted">{trip.listing.city}, {trip.listing.country}</p>
          <Link to={`/listings/${trip.listing.id}`} className="text-lg font-semibold hover:underline">{trip.listing.title}</Link>
          <p className="mt-1 text-sm">
            {shortDate(trip.checkIn)} – {prettyDate(trip.checkOut)} · {plural(trip.nights, "night")} · {plural(trip.guests, "guest")}
          </p>
          <p className="mt-1 text-sm text-muted">
            {cancelled ? "Cancelled" : `Total paid ${money(trip.total)}`}
            {trip.review && ` · You rated this ${trip.review.rating}★`}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {trip.canReview && onReview && (
            <button className="btn-primary" onClick={onReview}>
              <MessageSquareText className="size-4" /> Leave a review
            </button>
          )}
          {trip.canCancel && onCancel && (
            <button className="btn-outline" onClick={onCancel}>Cancel trip</button>
          )}
        </div>
      </div>
    </article>
  );
}

function CancelModal({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const m = useMutation({
    mutationFn: () => api.cancelBooking(trip.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trips"] });
      qc.invalidateQueries({ queryKey: ["listing", trip.listing.id] });
      toast("success", "Your trip was cancelled.");
      onClose();
    },
  });
  return (
    <Modal title="Cancel this trip?" onClose={onClose}>
      <p className="text-muted">
        Your stay at <span className="font-medium text-ink">{trip.listing.title}</span> from {shortDate(trip.checkIn)} to {prettyDate(trip.checkOut)} will be
        cancelled and the dates released to other guests. This can't be undone.
      </p>
      {m.isError && <div className="mt-4"><ErrorBox message={m.error.message} /></div>}
      <div className="mt-6 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>Keep trip</button>
        <button className="btn bg-red-600 text-white hover:bg-red-700" onClick={() => m.mutate()} disabled={m.isPending}>
          {m.isPending ? "Cancelling…" : "Cancel trip"}
        </button>
      </div>
    </Modal>
  );
}

function ReviewModal({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const m = useMutation({
    mutationFn: () => api.review(trip.id, rating, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trips"] });
      qc.invalidateQueries({ queryKey: ["listing", trip.listing.id] });
      qc.invalidateQueries({ queryKey: ["listings"] });
      toast("success", "Thanks for your review!");
      onClose();
    },
  });
  const fields = m.error instanceof ApiError ? m.error.details ?? {} : {};

  return (
    <Modal title={`How was ${trip.listing.city}?`} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          m.mutate();
        }}
        className="space-y-4"
      >
        <p className="text-sm text-muted">{trip.listing.title}</p>
        <div>
          <span className="label">Your rating</span>
          <StarInput value={rating} onChange={setRating} />
          <FieldError message={fields.rating} />
        </div>
        <label className="block">
          <span className="label">Tell future guests about your stay</span>
          <textarea className="input min-h-28" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What did you love? Anything to know before booking?" />
          <FieldError message={fields.comment} />
        </label>
        {m.isError && !Object.keys(fields).length && <ErrorBox message={m.error.message} />}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Not now</button>
          <button className="btn-primary" disabled={m.isPending || rating === 0}>
            {m.isPending ? "Posting…" : "Post review"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
