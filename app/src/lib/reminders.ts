// Monday reminders as dated local notifications. A repeating "Monday at X" trigger
// would use the phone's clock and drift an hour from New York twice a year, so we
// schedule exact instants for the coming weeks and top them up on each app open.
import { upcomingMeetings } from './time.ts';

export const WEEKS_AHEAD = 12;
export const HEADS_UP_MS = 60 * 60 * 1000;
export const CHANNEL_ID = 'fractal-monday';

export interface PlannedReminder {
  id: string;
  at: number;
  title: string;
  body: string;
}

export function planReminders(now: number, weeks = WEEKS_AHEAD): PlannedReminder[] {
  const out: PlannedReminder[] = [];
  for (const m of upcomingMeetings(now, weeks)) {
    const headsUp = m.startsAt - HEADS_UP_MS;
    if (headsUp > now) {
      out.push({
        id: `fractal-${m.number}-soon`,
        at: headsUp,
        title: `Fractal ${m.number} in one hour`,
        body: 'Get your contributions ready for the room.',
      });
    }
    out.push({
      id: `fractal-${m.number}-start`,
      at: m.startsAt,
      title: `Fractal ${m.number} is starting`,
      body: 'The Respect Game is on. Join the room.',
    });
  }
  return out;
}

/** The notification calls we need, so the sync logic can be tested without a device. */
export interface NotificationPort {
  listIds(): Promise<string[]>;
  cancelAll(): Promise<void>;
  schedule(r: PlannedReminder): Promise<void>;
}

/** Replace whatever is pending with a fresh plan. Returns how many were scheduled. */
export async function enableReminders(port: NotificationPort, now: number): Promise<number> {
  const plan = planReminders(now);
  await port.cancelAll();
  for (const r of plan) await port.schedule(r);
  return plan.length;
}

/** On app open: if reminders are on, extend the horizon. Pending ones mean on. */
export async function topUpReminders(port: NotificationPort, now: number): Promise<boolean> {
  const pending = await port.listIds();
  if (pending.length === 0) return false;
  await enableReminders(port, now);
  return true;
}
