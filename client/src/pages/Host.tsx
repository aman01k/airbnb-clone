import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { CalendarDays, Home as HomeIcon, IndianRupee, Pencil, Plus, Trash2 } from "lucide-react";
import { api, type HostListing, type Reservation } from "../lib/api";
import { useAuth } from "../lib/auth";
import { PROPERTY_LABEL, money, plural, prettyDate, shortDate } from "../lib/format";
import { Avatar, EmptyState, ErrorBox, Modal, Rating, Spinner, useToast } from "../components/ui";

export function HostDashboard() {
  const { user } = useAuth();
  const listings = useQuery({ queryKey: ["host", "listings"], queryFn: () => api.hostListings().then((r) => r.listings) });
  const reservations = useQuery({ queryKey: ["host", "reservations"], queryFn: api.hostReservations });
  const [tab, setTab] = useState<"upcoming" | "past" | "cancelled">("upcoming");
  const [deleting, setDeleting] = useState<HostListing | null>(null);

  const upcomingEarnings = reservations.data?.upcoming.reduce((s, r) => s + r.subtotal + r.cleaningFee, 0) ?? 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome, {user?.name.split(" ")[0]}</h1>
          <p className="mt-1 text-muted">Manage your stays and see who's coming.</p>
        </div>
        <Link to="/host/listings/new" className="btn-primary">
          <Plus className="size-4" /> List a new stay
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat icon={HomeIcon} label="Active stays" value={listings.data ? String(listings.data.length) : "…"} />
        <Stat icon={CalendarDays} label="Upcoming reservations" value={reservations.data ? String(reservations.data.upcoming.length) : "…"} />
        <Stat icon={IndianRupee} label="Upcoming earnings" value={reservations.data ? money(upcomingEarnings) : "…"} hint="Nightly rate + cleaning fees" />
      </div>

      <section className="mt-12">
        <h2 className="mb-4 text-xl font-semibold">Reservations</h2>
        <div className="mb-4 flex gap-2" role="tablist">
          {(["upcoming", "past", "cancelled"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className={`chip capitalize ${tab === t ? "chip-active" : ""}`} onClick={() => setTab(t)}>
              {t} {reservations.data && <span className="opacity-70">({reservations.data[t].length})</span>}
            </button>
          ))}
        </div>
        {reservations.isPending ? (
          <Spinner />
        ) : reservations.isError ? (
          <ErrorBox message={reservations.error.message} onRetry={() => reservations.refetch()} />
        ) : reservations.data[tab].length === 0 ? (
          <p className="rounded-xl bg-gray-50 p-6 text-center text-sm text-muted">No {tab} reservations.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Guest</th>
                  <th className="px-4 py-3 font-semibold">Stay</th>
                  <th className="px-4 py-3 font-semibold">Dates</th>
                  <th className="px-4 py-3 text-right font-semibold">Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {reservations.data[tab].map((r: Reservation) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={r.guest.name} size={32} />
                        <div>
                          <div className="font-medium">{r.guest.name}</div>
                          <div className="text-xs text-muted">{plural(r.guests, "guest")}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/listings/${r.listing.id}`} className="font-medium hover:underline">{r.listing.title}</Link>
                      <div className="text-xs text-muted">{r.listing.city}</div>
                    </td>
                    <td className="px-4 py-3">
                      {shortDate(r.checkIn)} – {prettyDate(r.checkOut)}
                      <div className="text-xs text-muted">{plural(r.nights, "night")}</div>
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${r.status === "CANCELLED" ? "text-muted line-through" : ""}`}>
                      {money(r.subtotal + r.cleaningFee)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-xl font-semibold">Your stays</h2>
        {listings.isPending ? (
          <Spinner />
        ) : listings.isError ? (
          <ErrorBox message={listings.error.message} onRetry={() => listings.refetch()} />
        ) : listings.data.length === 0 ? (
          <EmptyState icon={<HomeIcon className="size-10" />} title="You haven't listed a stay yet">
            Share your home with travellers. It takes about five minutes.
            <div className="mt-4">
              <Link to="/host/listings/new" className="btn-primary">List your first stay</Link>
            </div>
          </EmptyState>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.data.map((l) => (
              <article key={l.id} className="card overflow-hidden">
                <Link to={`/listings/${l.id}`} className="block aspect-[16/10] bg-gray-100">
                  <img src={l.photos[0]} alt="" className="size-full object-cover" />
                </Link>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/listings/${l.id}`} className="line-clamp-1 font-semibold hover:underline">{l.title}</Link>
                    <Rating rating={l.rating} />
                  </div>
                  <p className="text-sm text-muted">
                    {PROPERTY_LABEL[l.propertyType]} · {l.city} · {money(l.pricePerNight)}/night
                  </p>
                  <p className="mt-1 text-sm">{plural(l.upcomingBookings, "upcoming booking")}</p>
                  <div className="mt-4 flex gap-2">
                    <Link to={`/host/listings/${l.id}/edit`} className="btn-outline flex-1 py-2">
                      <Pencil className="size-4" /> Edit
                    </Link>
                    <button className="btn-ghost py-2 text-red-600 hover:bg-red-50" onClick={() => setDeleting(l)} aria-label={`Delete ${l.title}`}>
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {deleting && <DeleteModal listing={deleting} onClose={() => setDeleting(null)} />}
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint }: { icon: typeof HomeIcon; label: string; value: string; hint?: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Icon className="size-4" /> {label}
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}

function DeleteModal({ listing, onClose }: { listing: HostListing; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const m = useMutation({
    mutationFn: () => api.deleteListing(listing.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["host"] });
      qc.invalidateQueries({ queryKey: ["listings"] });
      qc.invalidateQueries({ queryKey: ["destinations"] });
      toast("success", "Your stay was removed.");
      onClose();
    },
  });
  return (
    <Modal title="Delete this stay?" onClose={onClose}>
      <p className="text-muted">
        <span className="font-medium text-ink">{listing.title}</span> will be removed from Nestly along with its reviews and past bookings. This can't be
        undone.
      </p>
      {m.isError && <div className="mt-4"><ErrorBox message={m.error.message} /></div>}
      <div className="mt-6 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>Keep it</button>
        <button className="btn bg-red-600 text-white hover:bg-red-700" onClick={() => m.mutate()} disabled={m.isPending}>
          {m.isPending ? "Deleting…" : "Delete stay"}
        </button>
      </div>
    </Modal>
  );
}
