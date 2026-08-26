import { sortScored, type ScoredIssue } from "./borda-count.js";
import type { ContributionIssue, RankedIssue, RankingConfig } from "./types.js";

/**
 * ZAO's 2x Fibonacci curve. Ranks beyond the curve earn 0 - the live fractal
 * awards six places per breakout, so an async cycle with 30 contributions still
 * only pays the top six.
 */
export function respectForRank(rank: number, respectScores: number[]): number {
  return respectScores[rank - 1] ?? 0;
}

export function generateRespectCurve(length: number): number[] {
  // 2x Fibonacci from the ZAO curve, extended downward: 110, 68, 42, 26, 16, 10, 6, 4, 2 ...
  const curve = [110, 68, 42, 26, 16, 10];
  while (curve.length < length) {
    const a = curve.at(-1) as number;
    const b = curve.at(-2) as number;
    curve.push(Math.max(0, b - a));
  }
  return curve.slice(0, length);
}

/**
 * Turn scored issues into a final ranked list with Respect attached.
 * Issues whose author is unknown (deleted account) are still ranked so the
 * ordering stays honest, but Respect for them lands under "unknown".
 */
export function assignRespect(
  scored: ScoredIssue[],
  issues: Map<number, ContributionIssue>,
  ranking: RankingConfig,
): RankedIssue[] {
  const sorted = sortScored(scored);
  const byScore = new Map<number, number[]>();
  for (const s of sorted) {
    const key = s.score;
    byScore.set(key, [...(byScore.get(key) ?? []), s.issueNumber]);
  }

  return sorted.map((s, index) => {
    const rank = index + 1;
    const issue = issues.get(s.issueNumber);
    const tied = (byScore.get(s.score) ?? []).filter((n) => n !== s.issueNumber);
    const entry: RankedIssue = {
      issueNumber: s.issueNumber,
      rank,
      score: s.score,
      author: issue?.author ?? "unknown",
      title: issue?.title ?? `#${s.issueNumber}`,
      respectAwarded: respectForRank(rank, ranking.respectScores),
    };
    if (tied.length > 0) entry.tiedWith = tied;
    return entry;
  });
}

/** Sum Respect per author. One author can hold several ranked contributions. */
export function buildRespectMap(ranked: RankedIssue[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of ranked) {
    if (r.respectAwarded <= 0) continue;
    out[r.author] = (out[r.author] ?? 0) + r.respectAwarded;
  }
  return out;
}

export function totalRespect(respectMap: Record<string, number>): number {
  return Object.values(respectMap).reduce((sum, n) => sum + n, 0);
}
