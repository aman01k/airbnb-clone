import { describe, expect, it } from "vitest";
import { addDays, nightsBetween, todayIso } from "../src/lib/dates.js";

describe("todayIso", () => {
  // 20:00 UTC on 24 Nov is already 01:30 on 25 Nov in India.
  const lateEveningUtc = new Date("2026-11-24T20:00:00Z");

  it("uses the app time zone, not UTC", () => {
    expect(todayIso(lateEveningUtc, "Asia/Kolkata")).toBe("2026-11-25");
    expect(todayIso(lateEveningUtc, "UTC")).toBe("2026-11-24");
    expect(todayIso(lateEveningUtc, "America/New_York")).toBe("2026-11-24");
  });

  it("defaults to India time", () => {
    const saved = process.env.APP_TIME_ZONE;
    delete process.env.APP_TIME_ZONE;
    expect(todayIso(lateEveningUtc)).toBe("2026-11-25");
    process.env.APP_TIME_ZONE = saved;
  });
});

describe("date helpers", () => {
  it("adds days across month and year ends", () => {
    expect(addDays("2026-11-29", 3)).toBe("2026-12-02");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("counts nights", () => {
    expect(nightsBetween("2026-12-30", "2027-01-02")).toBe(3);
  });
});
