// Fractal week number, anchored to a known meeting.
//
// Anchor: Fractal 122 is Monday 2 November 2026, 6pm ET (23:00 UTC).
// Meetings run weekly on Mondays, so every 7 days before or after the anchor
// is one fractal lower or higher.
//
// The number shown is the current or upcoming meeting. It rolls over to the
// next number one day after a meeting starts (Tuesday 23:00 UTC), so on a
// Monday the page shows that evening's meeting. The one-day grace also absorbs
// the 1-hour shift when US daylight saving moves 6pm ET to 22:00 UTC.
//
// The homepage is static, so this runs at build time; index.astro also bundles
// it into a small client script (an external file, so the strict CSP allows it)
// so the number stays right between deploys.

export const FRACTAL_ANCHOR_NUMBER = 122;
export const FRACTAL_ANCHOR_MS = Date.UTC(2026, 10, 2, 23, 0, 0); // 2 Nov 2026 23:00 UTC
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const ROLLOVER_MS = 24 * 60 * 60 * 1000;

export function fractalNumberAt(nowMs: number): number {
  const weeks = Math.ceil((nowMs - FRACTAL_ANCHOR_MS - ROLLOVER_MS) / WEEK_MS);
  return Math.max(1, FRACTAL_ANCHOR_NUMBER + weeks);
}

export function currentFractalWeek(): number {
  return fractalNumberAt(Date.now());
}
