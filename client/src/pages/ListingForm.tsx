import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router";
import { ChevronLeft, ImageOff } from "lucide-react";
import { ApiError, PROPERTY_TYPES, api, type ListingDetail, type ListingInput } from "../lib/api";
import { useAuth } from "../lib/auth";
import { PROPERTY_LABEL } from "../lib/format";
import { ErrorBox, FieldError, Spinner, useToast } from "../components/ui";
import { NotFound } from "./NotFound";

const AMENITIES = [
  "Wifi", "Kitchen", "Air conditioning", "Heating", "Workspace", "Washer", "Free parking", "Pool",
  "Garden", "Balcony", "Rooftop", "Fireplace", "Elevator", "Breakfast available", "Mountain view",
  "Sea view", "Lake view", "River view",
];

const EMPTY: ListingInput = {
  title: "", description: "", propertyType: "HOUSE", city: "", country: "India",
  pricePerNight: 3000, cleaningFee: 500, maxGuests: 2, bedrooms: 1, beds: 1, baths: 1, amenities: ["Wifi"], photos: [],
};

export function ListingFormPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const existing = useQuery({
    queryKey: ["listing", id],
    queryFn: () => api.listing(id!).then((r) => r.listing),
    enabled: Boolean(id),
  });

  if (!id) return <ListingForm />;
  if (existing.isPending) return <Spinner />;
  if (existing.isError) return <NotFound message="This stay doesn't exist or was removed." />;
  if (existing.data.hostId !== user?.id) return <NotFound message="You can only edit stays you host." />;
  return <ListingForm listing={existing.data} />;
}

function ListingForm({ listing }: { listing?: ListingDetail }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [v, setV] = useState<ListingInput>(() =>
    listing
      ? {
          title: listing.title, description: listing.description, propertyType: listing.propertyType, city: listing.city,
          country: listing.country, pricePerNight: listing.pricePerNight, cleaningFee: listing.cleaningFee, maxGuests: listing.maxGuests,
          bedrooms: listing.bedrooms, beds: listing.beds, baths: listing.baths, amenities: listing.amenities, photos: listing.photos,
        }
      : EMPTY,
  );
  const [photoText, setPhotoText] = useState(v.photos.join("\n"));
  const set = <K extends keyof ListingInput>(k: K, value: ListingInput[K]) => setV((s) => ({ ...s, [k]: value }));

  const save = useMutation({
    mutationFn: (input: ListingInput) => (listing ? api.updateListing(listing.id, input) : api.createListing(input)),
    onSuccess: ({ listing: saved }) => {
      qc.invalidateQueries({ queryKey: ["host"] });
      qc.invalidateQueries({ queryKey: ["listings"] });
      qc.invalidateQueries({ queryKey: ["listing", saved.id] });
      qc.invalidateQueries({ queryKey: ["destinations"] });
      toast("success", listing ? "Changes saved." : "Your stay is live!");
      navigate(`/listings/${saved.id}`);
    },
    onError: () => window.scrollTo({ top: 0, behavior: "smooth" }),
  });
  const err = save.error instanceof ApiError ? save.error.details ?? {} : {};
  const photoErr = Object.entries(err).find(([k]) => k.startsWith("photos"))?.[1];
  const photos = photoText.split("\n").map((s) => s.trim()).filter(Boolean);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    save.mutate({ ...v, photos });
  };

  const num = (k: "pricePerNight" | "cleaningFee" | "maxGuests" | "bedrooms" | "beds" | "baths", label: string, min = 0) => (
    <label className="block">
      <span className="label">{label}</span>
      <input
        className="input"
        type="number"
        min={min}
        value={Number.isNaN(v[k]) ? "" : v[k]}
        onChange={(e) => set(k, e.target.valueAsNumber)}
        required
      />
      <FieldError message={err[k]} />
    </label>
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link to="/host" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        <ChevronLeft className="size-4" /> Host dashboard
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">{listing ? "Edit your stay" : "List a new stay"}</h1>
      <p className="mt-1 text-muted">{listing ? "Changes show up for guests right away." : "Tell guests what makes your place special."}</p>

      <form onSubmit={submit} className="mt-8 space-y-10" noValidate>
        {save.isError && <ErrorBox message={save.error.message} />}

        <fieldset className="space-y-4">
          <legend className="mb-4 text-lg font-semibold">The basics</legend>
          <label className="block">
            <span className="label">Title</span>
            <input className="input" value={v.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Sunlit villa near Anjuna beach" maxLength={90} />
            <FieldError message={err.title} />
          </label>
          <div>
            <span className="label">Type of place</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {PROPERTY_TYPES.map((t) => (
                <button type="button" key={t} onClick={() => set("propertyType", t)} className={`chip rounded-xl py-3 ${v.propertyType === t ? "chip-active" : ""}`}>
                  {PROPERTY_LABEL[t]}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="label">Description</span>
            <textarea className="input min-h-32" value={v.description} onChange={(e) => set("description", e.target.value)} placeholder="What's the space like? What's nearby?" />
            <FieldError message={err.description} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">City</span>
              <input className="input" value={v.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Goa" />
              <FieldError message={err.city} />
            </label>
            <label className="block">
              <span className="label">Country</span>
              <input className="input" value={v.country} onChange={(e) => set("country", e.target.value)} />
              <FieldError message={err.country} />
            </label>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-4 text-lg font-semibold">Space and pricing</legend>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {num("maxGuests", "Guests", 1)}
            {num("bedrooms", "Bedrooms")}
            {num("beds", "Beds", 1)}
            {num("baths", "Bathrooms")}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {num("pricePerNight", "Price per night (₹)", 100)}
            {num("cleaningFee", "Cleaning fee (₹)")}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-4 text-lg font-semibold">Amenities</legend>
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map((a) => {
              const on = v.amenities.includes(a);
              return (
                <button
                  type="button"
                  key={a}
                  aria-pressed={on}
                  className={`chip ${on ? "chip-active" : ""}`}
                  onClick={() => set("amenities", on ? v.amenities.filter((x) => x !== a) : [...v.amenities, a])}
                >
                  {a}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1 text-lg font-semibold">Photos</legend>
          <p className="mb-3 text-sm text-muted">Paste image links (https), one per line. The first one is the cover photo.</p>
          <textarea
            className="input min-h-28 font-mono text-xs"
            value={photoText}
            onChange={(e) => setPhotoText(e.target.value)}
            placeholder="https://images.unsplash.com/photo-…"
          />
          <FieldError message={photoErr} />
          {photos.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {photos.map((src, i) => (
                <PhotoPreview key={`${src}-${i}`} src={src} cover={i === 0} />
              ))}
            </div>
          )}
        </fieldset>

        <div className="flex justify-end gap-2 border-t border-line pt-6">
          <Link to="/host" className="btn-ghost">Cancel</Link>
          <button className="btn-primary px-6" disabled={save.isPending}>
            {save.isPending ? "Saving…" : listing ? "Save changes" : "Publish stay"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PhotoPreview({ src, cover }: { src: string; cover: boolean }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
      {broken ? (
        <div className="flex size-full flex-col items-center justify-center gap-1 text-xs text-muted">
          <ImageOff className="size-5" /> Can't load
        </div>
      ) : (
        <img src={src} alt="" className="size-full object-cover" onError={() => setBroken(true)} />
      )}
      {cover && <span className="absolute left-1.5 top-1.5 rounded-md bg-white px-1.5 py-0.5 text-[10px] font-semibold shadow">Cover</span>}
    </div>
  );
}
