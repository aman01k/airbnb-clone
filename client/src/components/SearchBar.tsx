import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Search, X } from "lucide-react";
import { api } from "../lib/api";
import { dateRangeLabel, plural } from "../lib/format";
import { Popover, RangeCalendar, Stepper, type Range } from "./pickers";

export interface SearchValue {
  city: string;
  checkIn?: string;
  checkOut?: string;
  guests: number;
}

export function SearchBar({ value, onSearch }: { value: SearchValue; onSearch: (v: SearchValue) => void }) {
  const [city, setCity] = useState(value.city);
  const [range, setRange] = useState<Range>({ checkIn: value.checkIn, checkOut: value.checkOut });
  const [guests, setGuests] = useState(value.guests);
  const [whereOpen, setWhereOpen] = useState(false);
  const [whenOpen, setWhenOpen] = useState(false);
  const [whoOpen, setWhoOpen] = useState(false);

  // Keep in sync when the URL changes (back button, clearing filters).
  useEffect(() => {
    setCity(value.city);
    setRange({ checkIn: value.checkIn, checkOut: value.checkOut });
    setGuests(value.guests);
  }, [value.city, value.checkIn, value.checkOut, value.guests]);

  const destinations = useQuery({ queryKey: ["destinations"], queryFn: api.destinations, staleTime: 5 * 60_000 });
  const matches = (destinations.data?.destinations ?? []).filter((d) => d.city.toLowerCase().includes(city.trim().toLowerCase()));

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setWhereOpen(false);
    setWhenOpen(false);
    setWhoOpen(false);
    const complete = range.checkIn && range.checkOut;
    onSearch({ city: city.trim(), checkIn: complete ? range.checkIn : undefined, checkOut: complete ? range.checkOut : undefined, guests });
  };

  const segment = "flex flex-col whitespace-nowrap rounded-full px-5 py-2.5 text-left transition hover:bg-gray-100";

  return (
    <form
      onSubmit={submit}
      className="mx-auto flex w-full max-w-3xl flex-col gap-1 rounded-3xl border border-line bg-white p-2 shadow-lg shadow-black/5 md:flex-row md:items-center md:rounded-full"
      role="search"
    >
      <div className="flex-[1.3]">
        <Popover
          open={whereOpen && matches.length > 0}
          setOpen={setWhereOpen}
          trigger={
            <label className={`${segment} cursor-text`}>
              <span className="text-xs font-semibold">Where</span>
              <input
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setWhereOpen(true);
                }}
                onFocus={() => setWhereOpen(true)}
                placeholder="Search destinations"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
                aria-label="Destination"
                autoComplete="off"
              />
            </label>
          }
        >
          <ul className="w-72" role="listbox" aria-label="Destinations">
            {matches.slice(0, 8).map((d) => (
              <li key={d.city}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-gray-50"
                  onClick={() => {
                    setCity(d.city);
                    setWhereOpen(false);
                    setWhenOpen(true);
                  }}
                >
                  <span className="flex size-10 items-center justify-center rounded-xl bg-gray-100">
                    <MapPin className="size-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{d.city}</span>
                    <span className="block text-xs text-muted">
                      {d.country} · {plural(d.count, "stay")}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Popover>
      </div>

      <div className="hidden h-8 w-px bg-line md:block" />

      <div className="flex-1">
        <Popover
          open={whenOpen}
          setOpen={setWhenOpen}
          align="center"
          trigger={
            <button type="button" className={`${segment} w-full`} onClick={() => setWhenOpen((o) => !o)}>
              <span className="text-xs font-semibold">When</span>
              <span className={`text-sm ${range.checkIn && range.checkOut ? "" : "text-muted"}`}>
                {dateRangeLabel(range.checkIn, range.checkOut) || "Add dates"}
              </span>
            </button>
          }
        >
          <RangeCalendar
            value={range}
            onChange={(r) => {
              setRange(r);
              if (r.checkIn && r.checkOut) setWhenOpen(false);
            }}
            months={typeof window !== "undefined" && window.innerWidth < 768 ? 1 : 2}
          />
          {(range.checkIn || range.checkOut) && (
            <div className="flex justify-end border-t border-line pt-3">
              <button type="button" className="btn-ghost py-1.5 text-sm underline" onClick={() => setRange({})}>
                Clear dates
              </button>
            </div>
          )}
        </Popover>
      </div>

      <div className="hidden h-8 w-px bg-line md:block" />

      <div className="flex flex-1 items-center gap-2">
        <div className="flex-1">
          <Popover
            open={whoOpen}
            setOpen={setWhoOpen}
            align="right"
            trigger={
              <button type="button" className={`${segment} w-full`} onClick={() => setWhoOpen((o) => !o)}>
                <span className="text-xs font-semibold">Who</span>
                <span className={`text-sm ${guests ? "" : "text-muted"}`}>{guests ? plural(guests, "guest") : "Add guests"}</span>
              </button>
            }
          >
            <div className="w-72">
              <Stepper label="Guests" hint="Adults and children" value={guests} min={0} max={16} onChange={setGuests} />
            </div>
          </Popover>
        </div>
        {(city || range.checkIn || guests > 0) && (
          <button
            type="button"
            onClick={() => {
              setCity("");
              setRange({});
              setGuests(0);
              onSearch({ city: "", guests: 0 });
            }}
            className="rounded-full p-2 text-muted hover:bg-gray-100"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        )}
        <button type="submit" className="btn-primary rounded-full px-5 py-3.5" aria-label="Search">
          <Search className="size-4" strokeWidth={3} />
          <span className="md:hidden lg:inline">Search</span>
        </button>
      </div>
    </form>
  );
}
