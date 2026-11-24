import { useEffect, useRef, useState, type ReactNode } from "react";
import { DayPicker, type DateRange, type Matcher } from "react-day-picker";
import "react-day-picker/style.css";
import { Minus, Plus } from "lucide-react";
import { addDays, startOfToday } from "date-fns";
import { fromIso, toIso } from "../lib/format";

/** A trigger that opens a floating panel; closes on outside click or Escape. */
export function Popover({
  trigger,
  children,
  align = "left",
  open,
  setOpen,
}: {
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right" | "center";
  open: boolean;
  setOpen: (o: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen]);

  const pos = align === "right" ? "right-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "left-0";
  return (
    <div className="relative" ref={ref}>
      {trigger}
      {open && (
        <div className={`absolute top-full z-40 mt-2 rounded-2xl border border-line bg-white p-4 shadow-xl ${pos}`}>{children}</div>
      )}
    </div>
  );
}

export interface Range {
  checkIn?: string;
  checkOut?: string;
}

export const MAX_NIGHTS = 30;

/**
 * Picks a check-in/check-out range around existing bookings.
 *
 * A booking from the 10th to the 13th occupies the nights of the 10th, 11th
 * and 12th. So the 10th can't be a check-in day, but it *can* be someone
 * else's check-out day, and the 13th is free to check in again.
 */
export function RangeCalendar({
  value,
  onChange,
  booked = [],
  months = 2,
}: {
  value: Range;
  onChange: (r: Range) => void;
  booked?: { checkIn: string; checkOut: string }[];
  months?: number;
}) {
  const today = startOfToday();
  const isBookedNight = (iso: string) => booked.some((b) => iso >= b.checkIn && iso < b.checkOut);
  const bookedNights: Matcher[] = booked.map((b) => ({ from: fromIso(b.checkIn), to: addDays(fromIso(b.checkOut), -1) }));

  const choosingCheckOut = Boolean(value.checkIn && !value.checkOut);
  let disabled: Matcher[];
  if (choosingCheckOut) {
    // Check-out can be any day up to the next booking's first night (or the max stay length).
    const start = value.checkIn!;
    const nextBooking = booked.map((b) => b.checkIn).filter((d) => d > start).sort()[0];
    const maxStay = toIso(addDays(fromIso(start), MAX_NIGHTS));
    const limit = nextBooking && nextBooking < maxStay ? nextBooking : maxStay;
    disabled = [
      { before: today },
      { after: fromIso(limit) },
      ...booked.filter((b) => b.checkOut <= start).map((b) => ({ from: fromIso(b.checkIn), to: addDays(fromIso(b.checkOut), -1) })),
    ];
  } else {
    disabled = [{ before: today }, ...bookedNights];
  }

  const selected: DateRange | undefined = value.checkIn
    ? { from: fromIso(value.checkIn), to: value.checkOut ? fromIso(value.checkOut) : undefined }
    : undefined;

  return (
    <DayPicker
      mode="range"
      numberOfMonths={months}
      pagedNavigation
      selected={selected}
      defaultMonth={selected?.from ?? today}
      startMonth={today}
      disabled={disabled}
      onSelect={(_range, clicked) => {
        const day = toIso(clicked);
        // With a full range (or nothing) selected, a click starts over.
        if (!choosingCheckOut) return onChange(isBookedNight(day) ? {} : { checkIn: day });
        const start = value.checkIn!;
        if (day <= start) return onChange(isBookedNight(day) ? {} : { checkIn: day });
        onChange({ checkIn: start, checkOut: day });
      }}
    />
  );
}

export function Stepper({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-2">
      <div>
        <div className="font-medium">{label}</div>
        {hint && <div className="text-sm text-muted">{hint}</div>}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-full border border-line hover:border-ink disabled:opacity-30 disabled:hover:border-line"
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          aria-label={`Fewer ${label.toLowerCase()}`}
        >
          <Minus className="size-3.5" />
        </button>
        <span className="w-5 text-center tabular-nums" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-full border border-line hover:border-ink disabled:opacity-30 disabled:hover:border-line"
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          aria-label={`More ${label.toLowerCase()}`}
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

export function useDisclosure() {
  const [open, setOpen] = useState(false);
  return { open, setOpen };
}
