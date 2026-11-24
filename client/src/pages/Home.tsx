import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { Building2, Castle, House, SearchX, SlidersHorizontal, Tent, BedDouble } from "lucide-react";
import { PROPERTY_TYPES, api, type PropertyType, type SearchParams } from "../lib/api";
import { PROPERTY_LABEL, dateRangeLabel, money, plural } from "../lib/format";
import { ListingCard, ListingCardSkeleton } from "../components/ListingCard";
import { SearchBar, type SearchValue } from "../components/SearchBar";
import { EmptyState, ErrorBox, Modal } from "../components/ui";

const TYPE_ICON: Record<PropertyType, typeof House> = {
  HOUSE: House,
  APARTMENT: Building2,
  VILLA: Castle,
  CABIN: Tent,
  ROOM: BedDouble,
};

const SORTS = [
  { value: "recommended", label: "Most reviewed" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "newest", label: "Newest" },
] as const;

function readParams(sp: URLSearchParams): SearchParams {
  const num = (k: string) => (sp.get(k) ? Number(sp.get(k)) : undefined);
  return {
    city: sp.get("city") ?? undefined,
    checkIn: sp.get("checkIn") ?? undefined,
    checkOut: sp.get("checkOut") ?? undefined,
    guests: num("guests"),
    minPrice: num("minPrice"),
    maxPrice: num("maxPrice"),
    types: (sp.get("types")?.split(",").filter((t) => PROPERTY_TYPES.includes(t as PropertyType)) as PropertyType[]) ?? [],
    sort: (sp.get("sort") as SearchParams["sort"]) ?? "recommended",
  };
}

export function Home() {
  const [sp, setSp] = useSearchParams();
  const params = readParams(sp);
  const [showFilters, setShowFilters] = useState(false);

  const update = (patch: Partial<SearchParams>) => {
    const next = { ...params, ...patch };
    const out = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined || v === "" || v === 0 || (Array.isArray(v) && !v.length) || (k === "sort" && v === "recommended")) continue;
      out.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }
    setSp(out);
  };

  const results = useInfiniteQuery({
    queryKey: ["listings", params],
    queryFn: ({ pageParam }) => api.searchListings({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
  });

  const items = results.data?.pages.flatMap((p) => p.items) ?? [];
  const total = results.data?.pages[0]?.total ?? 0;
  const activeFilters = (params.minPrice ? 1 : 0) + (params.maxPrice ? 1 : 0) + (params.sort !== "recommended" ? 1 : 0);
  const hasSearch = Boolean(params.city || params.checkIn || params.guests);

  const toggleType = (t: PropertyType) =>
    update({ types: params.types!.includes(t) ? params.types!.filter((x) => x !== t) : [...params.types!, t] });

  return (
    <>
      <section className="border-b border-line bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-10 sm:px-6 sm:pt-14 lg:px-8">
          {!hasSearch && (
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
                Find your next <span className="text-brand-500">nest</span>.
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-muted sm:text-lg">
                Villas in Goa, cabins in Manali and havelis in Jaipur. Book unique stays hosted by locals.
              </p>
            </div>
          )}
          <SearchBar
            value={{ city: params.city ?? "", checkIn: params.checkIn, checkOut: params.checkOut, guests: params.guests ?? 0 }}
            onSearch={(v: SearchValue) => update({ city: v.city, checkIn: v.checkIn, checkOut: v.checkOut, guests: v.guests })}
          />
        </div>
      </section>

      <div className="sticky top-18 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
          {PROPERTY_TYPES.map((t) => {
            const Icon = TYPE_ICON[t];
            const active = params.types!.includes(t);
            return (
              <button key={t} onClick={() => toggleType(t)} className={`chip flex shrink-0 items-center gap-2 ${active ? "chip-active" : ""}`} aria-pressed={active}>
                <Icon className="size-4" />
                {PROPERTY_LABEL[t]}
              </button>
            );
          })}
          <div className="ml-auto shrink-0 pl-2">
            <button onClick={() => setShowFilters(true)} className={`chip flex items-center gap-2 ${activeFilters ? "chip-active" : ""}`}>
              <SlidersHorizontal className="size-4" />
              Filters
              {activeFilters > 0 && <span className="rounded-full bg-white px-1.5 text-xs text-ink">{activeFilters}</span>}
            </button>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {results.isSuccess && (
          <p className="mb-6 text-sm text-muted">
            {plural(total, "stay")}
            {params.city && ` in ${params.city}`}
            {params.checkIn && ` · ${dateRangeLabel(params.checkIn, params.checkOut)}`}
            {params.guests ? ` · ${plural(params.guests, "guest")}` : ""}
          </p>
        )}

        {results.isError && <ErrorBox message={results.error.message} onRetry={() => results.refetch()} />}

        {results.isPending ? (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        ) : items.length === 0 && results.isSuccess ? (
          <EmptyState icon={<SearchX className="size-10" />} title="No stays match your search">
            Try other dates, fewer guests or removing a filter.
            <div className="mt-4">
              <button className="btn-outline" onClick={() => setSp(new URLSearchParams())}>
                Clear everything
              </button>
            </div>
          </EmptyState>
        ) : (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((l) => (
              <ListingCard key={l.id} listing={l} checkIn={params.checkIn} checkOut={params.checkOut} />
            ))}
          </div>
        )}

        {results.hasNextPage && (
          <div className="mt-12 flex justify-center">
            <button className="btn-outline px-6" onClick={() => results.fetchNextPage()} disabled={results.isFetchingNextPage}>
              {results.isFetchingNextPage ? "Loading…" : "Show more stays"}
            </button>
          </div>
        )}
      </section>

      {showFilters && <FiltersModal params={params} onClose={() => setShowFilters(false)} onApply={(p) => update(p)} />}
    </>
  );
}

function FiltersModal({
  params,
  onClose,
  onApply,
}: {
  params: SearchParams;
  onClose: () => void;
  onApply: (p: Partial<SearchParams>) => void;
}) {
  const [min, setMin] = useState(params.minPrice?.toString() ?? "");
  const [max, setMax] = useState(params.maxPrice?.toString() ?? "");
  const [sort, setSort] = useState(params.sort ?? "recommended");
  const presets = [
    { label: `Under ${money(3000)}`, min: "", max: "3000" },
    { label: `${money(3000)}–${money(7000)}`, min: "3000", max: "7000" },
    { label: `Over ${money(7000)}`, min: "7000", max: "" },
  ];

  return (
    <Modal title="Filters" onClose={onClose}>
      <h3 className="mb-3 font-semibold">Price per night</h3>
      <div className="mb-3 flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            className={`chip ${min === p.min && max === p.max ? "chip-active" : ""}`}
            onClick={() => {
              setMin(p.min);
              setMax(p.max);
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="label">Minimum (₹)</span>
          <input className="input" inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} placeholder="0" />
        </label>
        <label>
          <span className="label">Maximum (₹)</span>
          <input className="input" inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} placeholder="Any" />
        </label>
      </div>

      <h3 className="mb-3 mt-6 font-semibold">Sort by</h3>
      <div className="flex flex-wrap gap-2">
        {SORTS.map((s) => (
          <button key={s.value} type="button" className={`chip ${sort === s.value ? "chip-active" : ""}`} onClick={() => setSort(s.value)}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-line pt-4">
        <button
          className="btn-ghost underline"
          onClick={() => {
            setMin("");
            setMax("");
            setSort("recommended");
          }}
        >
          Clear all
        </button>
        <button
          className="btn-primary px-6"
          onClick={() => {
            onApply({ minPrice: min ? Number(min) : undefined, maxPrice: max ? Number(max) : undefined, sort });
            onClose();
          }}
        >
          Show stays
        </button>
      </div>
    </Modal>
  );
}
