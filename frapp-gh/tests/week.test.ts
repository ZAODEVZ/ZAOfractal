import { describe, expect, it } from "vitest";
import { normalizeConfig } from "../src/lib/config-loader.js";
import {
  accountAgeDays,
  cycleWindow,
  formatCycleRange,
  mostRecentSessionStart,
  phaseFor,
  timezoneOffsetMs,
  weekNumberFor,
} from "../src/lib/week.js";

const config = normalizeConfig({
  github: { owner: "zao", repo: "fractal" },
  sessionSchedule: {
    startDay: "Monday",
    startTime: "18:00",
    timezone: "America/New_York",
    epochDate: "2026-05-25T18:00:00-04:00",
    epochWeekNumber: 52,
  },
});

describe("timezoneOffsetMs", () => {
  it("tracks US daylight saving", () => {
    // EDT is UTC-4 in June, EST is UTC-5 in January.
    expect(timezoneOffsetMs("America/New_York", new Date("2026-06-15T12:00:00Z"))).toBe(-4 * 3600_000);
    expect(timezoneOffsetMs("America/New_York", new Date("2026-01-15T12:00:00Z"))).toBe(-5 * 3600_000);
    expect(timezoneOffsetMs("UTC", new Date("2026-06-15T12:00:00Z"))).toBe(0);
  });
});

describe("mostRecentSessionStart", () => {
  it("finds Monday 6pm Eastern during daylight saving", () => {
    const start = mostRecentSessionStart(config, new Date("2026-05-28T15:00:00Z"));
    expect(start.toISOString()).toBe("2026-05-25T22:00:00.000Z");
  });

  it("finds Monday 6pm Eastern during standard time", () => {
    const start = mostRecentSessionStart(config, new Date("2026-01-15T15:00:00Z"));
    expect(start.toISOString()).toBe("2026-01-12T23:00:00.000Z");
  });

  it("does not jump forward to a session that has not happened yet", () => {
    // Monday 5pm Eastern: the 6pm session has not opened, so week N-1 is current.
    const start = mostRecentSessionStart(config, new Date("2026-05-25T21:00:00Z"));
    expect(start.toISOString()).toBe("2026-05-18T22:00:00.000Z");
  });

  it("rejects a nonsense start day", () => {
    const bad = { ...config, sessionSchedule: { ...config.sessionSchedule, startDay: "Funday" as never } };
    expect(() => mostRecentSessionStart(bad, new Date())).toThrow();
  });
});

describe("weekNumberFor", () => {
  it("counts cycles forward from the epoch", () => {
    expect(weekNumberFor(config, new Date("2026-05-27T12:00:00Z"))).toBe(52);
    expect(weekNumberFor(config, new Date("2026-06-03T12:00:00Z"))).toBe(53);
    expect(weekNumberFor(config, new Date("2026-07-01T12:00:00Z"))).toBe(57);
  });

  it("holds the number steady across a DST boundary", () => {
    // 2026-11-02 is the Monday after US clocks fall back.
    const before = weekNumberFor(config, new Date("2026-10-27T12:00:00Z"));
    const after = weekNumberFor(config, new Date("2026-11-03T12:00:00Z"));
    expect(after - before).toBe(1);
  });

  it("defaults to week 1 when no epoch is configured", () => {
    const noEpoch = normalizeConfig({ github: { owner: "o", repo: "r" } });
    expect(weekNumberFor(noEpoch, new Date("2026-05-27T12:00:00Z"))).toBe(1);
  });
});

describe("cycle phases", () => {
  it("moves through submission, voting, tally", () => {
    expect(phaseFor(config, new Date("2026-05-27T12:00:00Z"))).toBe("submission");
    expect(phaseFor(config, new Date("2026-05-31T02:00:00Z"))).toBe("voting");
    expect(phaseFor(config, new Date("2026-06-01T00:00:00Z"))).toBe("tally");
  });

  it("produces a window whose stages are ordered", () => {
    const window = cycleWindow(config, new Date("2026-05-27T12:00:00Z"));
    expect(window.opensAt.getTime()).toBeLessThan(window.voteCloseAt.getTime());
    expect(window.voteCloseAt.getTime()).toBeLessThan(window.tallyAt.getTime());
    expect(window.tallyAt.getTime()).toBeLessThan(window.endsAt.getTime());
    expect(formatCycleRange(window, "America/New_York")).toBe("May 25 - Jun 1");
  });
});

describe("accountAgeDays", () => {
  it("counts whole days", () => {
    expect(accountAgeDays("2026-05-01T00:00:00Z", new Date("2026-05-16T12:00:00Z"))).toBe(15);
  });
});
