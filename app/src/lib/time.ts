// Next-fractal time logic. Pure, no React Native imports, so `node --test` runs it.
//
// Meetings are Mondays at 18:00 on the New York wall clock, so their UTC instant
// moves by an hour across US daylight saving. Fractal numbers come from the
// site's anchor (Fractal 122 = 2 Nov 2026) through its own fractalNumberAt.
import { fractalNumberAt } from '../../../site/src/lib/week.ts';

export const MEETING_TZ = 'America/New_York';
export const MEETING_HOUR = 18;
/** How long a meeting counts as in session after it starts. */
export const IN_SESSION_MS = 90 * 60 * 1000;

const HOUR_MS = 3_600_000;

const nyParts = new Intl.DateTimeFormat('en-US', {
  timeZone: MEETING_TZ,
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
});

/** The New York wall clock at an instant, written as if it were UTC. */
function nyWallAsUtc(ms: number): number {
  const p: Record<string, number> = {};
  for (const { type, value } of nyParts.formatToParts(new Date(ms))) {
    if (type !== 'literal') p[type] = Number(value);
  }
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

/** New York offset from UTC at an instant, in ms (-4h in summer, -5h in winter). */
export function nyOffsetMs(ms: number): number {
  const whole = Math.floor(ms / 1000) * 1000;
  return nyWallAsUtc(whole) - whole;
}

/** The UTC instant of 18:00 New York on a calendar date (month is 0-based). */
export function meetingInstant(year: number, month: number, day: number): number {
  const wall = Date.UTC(year, month, day, MEETING_HOUR);
  // 18:00 is never near a clock change (those happen at 02:00), so the offset
  // sampled about when the meeting happens is the right one.
  return wall - nyOffsetMs(wall + 5 * HOUR_MS);
}

export interface Meeting {
  number: number;
  startsAt: number;
}

export function meetingFor(startsAt: number): Meeting {
  return { number: fractalNumberAt(startsAt), startsAt };
}

/** The first meeting starting strictly after `now`. */
export function nextMeeting(now: number): Meeting {
  const d = new Date(nyWallAsUtc(now));
  const daysToMonday = (1 - d.getUTCDay() + 7) % 7;
  const startsAt = (offset: number) =>
    meetingInstant(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + daysToMonday + offset);
  const first = startsAt(0);
  return meetingFor(first > now ? first : startsAt(7));
}

/** The latest meeting at or before `now`. */
export function previousMeeting(now: number): Meeting {
  const next = nextMeeting(now);
  // Stepping back on the calendar keeps 18:00 New York across a clock change.
  const wall = new Date(nyWallAsUtc(next.startsAt));
  return meetingFor(meetingInstant(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate() - 7));
}

/** The meeting running right now, if any. */
export function meetingInSession(now: number): Meeting | null {
  const prev = previousMeeting(now);
  return now - prev.startsAt < IN_SESSION_MS ? prev : null;
}

/** The next `count` meetings after `now`, in order. */
export function upcomingMeetings(now: number, count: number): Meeting[] {
  const out: Meeting[] = [];
  let cursor = now;
  for (let i = 0; i < count; i++) {
    const m = nextMeeting(cursor);
    out.push(m);
    cursor = m.startsAt;
  }
  return out;
}

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function countdownTo(target: number, now: number): Countdown {
  const s = Math.max(0, Math.ceil((target - now) / 1000));
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

/** Share of the gap between the last meeting and the next that has passed, 0 to 1. */
export function weekProgress(now: number): number {
  const next = nextMeeting(now).startsAt;
  const prev = previousMeeting(now).startsAt;
  return Math.min(1, Math.max(0, (now - prev) / (next - prev)));
}
