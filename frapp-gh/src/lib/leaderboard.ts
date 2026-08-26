import type { Leaderboard, LeaderboardEntry, WeekState } from "./types.js";

/**
 * Fold every completed week into a cumulative Respect leaderboard.
 * Weeks that never reached "completed" are ignored - a cycle that failed the
 * minVoters check must not award Respect.
 */
export function buildLeaderboard(
  community: string,
  weeks: WeekState[],
  options: { asOf?: string; recentLimit?: number } = {},
): Leaderboard {
  const recentLimit = options.recentLimit ?? 5;
  const completed = weeks
    .filter((w) => w.status === "completed" || w.status === "archived")
    .sort((a, b) => a.weekNumber - b.weekNumber);

  const totals = new Map<string, number>();
  const activity = new Map<string, LeaderboardEntry["recentActivity"]>();
  const weeksSeen = new Map<string, Set<number>>();

  for (const week of completed) {
    for (const [username, respect] of Object.entries(week.respectDistributed ?? {})) {
      if (respect <= 0) continue;
      totals.set(username, (totals.get(username) ?? 0) + respect);
      const list = activity.get(username) ?? [];
      list.push({
        week: week.weekNumber,
        respectAwarded: respect,
        contribution: week.contributionTitles?.[username] ?? "",
      });
      activity.set(username, list);
      const seen = weeksSeen.get(username) ?? new Set<number>();
      seen.add(week.weekNumber);
      weeksSeen.set(username, seen);
    }
  }

  const entries: LeaderboardEntry[] = [...totals.entries()]
    .sort(([usernameA, a], [usernameB, b]) => b - a || usernameA.localeCompare(usernameB))
    .map(([githubUsername, totalRespect], index) => ({
      rank: index + 1,
      githubUsername,
      totalRespect,
      weeksParticipated: weeksSeen.get(githubUsername)?.size ?? 0,
      recentActivity: (activity.get(githubUsername) ?? [])
        .sort((a, b) => b.week - a.week)
        .slice(0, recentLimit),
    }));

  return {
    asOf: options.asOf ?? new Date().toISOString(),
    community,
    totalRespectDistributed: entries.reduce((sum, e) => sum + e.totalRespect, 0),
    weeksCounted: completed.map((w) => w.weekNumber),
    entries,
  };
}
