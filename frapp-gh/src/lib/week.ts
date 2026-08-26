import type { FrameworkConfig, ISO8601 } from "./types.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export type CyclePhase = "submission" | "voting" | "tally" | "closed";

export interface CycleWindow {
  weekNumber: number;
  /** Session opens: contributions accepted from here. */
  opensAt: Date;
  /** Voting closes and the snapshot is taken. */
  voteCloseAt: Date;
  /** Results are tallied and posted. */
  tallyAt: Date;
  /** Start of the next cycle. */
  endsAt: Date;
}

/**
 * Resolve the wall-clock offset (ms) of an IANA timezone at a given instant.
 * Uses Intl rather than a tz library so this stays dependency-free on the edge.
 */
export function timezoneOffsetMs(timezone: string, at: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(at).map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) === 24 ? 0 : Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUTC - at.getTime();
}

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/**
 * The most recent instant matching schedule.startDay at schedule.startTime in
 * schedule.timezone, at or before `now`.
 */
export function mostRecentSessionStart(config: FrameworkConfig, now: Date): Date {
  const { startDay, startTime, timezone } = config.sessionSchedule;
  const targetDow = WEEKDAYS.indexOf(startDay as (typeof WEEKDAYS)[number]);
  if (targetDow < 0) throw new Error(`Unknown startDay: ${startDay}`);
  const [hh, mm] = startTime.split(":").map(Number);

  // Walk back day by day from `now` until we land on the right weekday whose
  // scheduled instant is <= now. Two-pass offset resolution handles DST edges.
  for (let back = 0; back <= 8; back++) {
    const probe = new Date(now.getTime() - back * DAY_MS);
    const local = new Date(probe.getTime() + timezoneOffsetMs(timezone, probe));
    if (local.getUTCDay() !== targetDow) continue;

    const localMidnightUTC = Date.UTC(
      local.getUTCFullYear(),
      local.getUTCMonth(),
      local.getUTCDate(),
    );
    const wallClock = localMidnightUTC + (hh ?? 0) * 3600_000 + (mm ?? 0) * 60_000;
    let instant = new Date(wallClock - timezoneOffsetMs(timezone, probe));
    instant = new Date(wallClock - timezoneOffsetMs(timezone, instant));
    if (instant.getTime() <= now.getTime()) return instant;
  }
  throw new Error("Could not resolve a session start; check sessionSchedule");
}

/**
 * Week number for an instant. Counts cycles forward from
 * sessionSchedule.epochDate / epochWeekNumber. Without an epoch, week 1 is the
 * current cycle (useful for a fresh install).
 */
export function weekNumberFor(config: FrameworkConfig, now: Date): number {
  const start = mostRecentSessionStart(config, now);
  const { epochDate, epochWeekNumber = 1, cycleLength } = config.sessionSchedule;
  if (!epochDate) return epochWeekNumber;
  const epoch = mostRecentSessionStart(config, new Date(epochDate));
  const elapsed = start.getTime() - epoch.getTime();
  return epochWeekNumber + Math.round(elapsed / (cycleLength * DAY_MS));
}

export function cycleWindow(config: FrameworkConfig, now: Date): CycleWindow {
  const { cycleLength, voteCloseOffsetDays = 5, tallyOffsetDays = 6 } = config.sessionSchedule;
  const opensAt = mostRecentSessionStart(config, now);
  return {
    weekNumber: weekNumberFor(config, now),
    opensAt,
    voteCloseAt: new Date(opensAt.getTime() + voteCloseOffsetDays * DAY_MS),
    tallyAt: new Date(opensAt.getTime() + tallyOffsetDays * DAY_MS),
    endsAt: new Date(opensAt.getTime() + cycleLength * DAY_MS),
  };
}

export function phaseFor(config: FrameworkConfig, now: Date): CyclePhase {
  const w = cycleWindow(config, now);
  const t = now.getTime();
  if (t < w.voteCloseAt.getTime()) return "submission";
  if (t < w.tallyAt.getTime()) return "voting";
  if (t < w.endsAt.getTime()) return "tally";
  return "closed";
}

/** Human-readable date range for a cycle, e.g. "May 24 - May 31". */
export function formatCycleRange(window: CycleWindow, timezone: string): string {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
  });
  return `${fmt.format(window.opensAt)} - ${fmt.format(window.endsAt)}`;
}

export function formatInstant(at: Date, timezone: string): ISO8601 | string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short",
    hour12: true,
  }).format(at);
}

export function accountAgeDays(createdAt: ISO8601, now: Date): number {
  return Math.floor((now.getTime() - new Date(createdAt).getTime()) / DAY_MS);
}
