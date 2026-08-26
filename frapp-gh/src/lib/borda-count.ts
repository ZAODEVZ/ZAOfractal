import type { VoterRanking } from "./types.js";

export interface AggregationInput {
  /** Every issue number eligible for ranking this week. */
  ballot: number[];
  /** Accepted voter ballots (already filtered for eligibility). */
  voters: VoterRanking[];
}

export interface ScoredIssue {
  issueNumber: number;
  /** Primary score. Lower is better for every algorithm here. */
  score: number;
  /** Count of first-place placements, used as the first tie-break. */
  firstPlaceVotes: number;
  /** Number of voters who placed this issue explicitly. */
  timesRanked: number;
}

/**
 * Rank positions a single voter assigns to every ballot item.
 *
 * A voter may submit a partial ballot (they only ranked 4 of 9 contributions).
 * Ranked items take their 1-based position. Unranked items share the average of
 * the positions left over, so a short ballot neither rewards nor punishes the
 * items the voter skipped relative to each other.
 */
export function positionsForVoter(ballot: number[], ranking: number[]): Map<number, number> {
  const ballotSet = new Set(ballot);
  const seen = new Set<number>();
  const positions = new Map<number, number>();

  let position = 0;
  for (const issueNumber of ranking) {
    if (!ballotSet.has(issueNumber) || seen.has(issueNumber)) continue;
    seen.add(issueNumber);
    position += 1;
    positions.set(issueNumber, position);
  }

  const unranked = ballot.filter((n) => !seen.has(n));
  if (unranked.length > 0) {
    // Average of the remaining positions: (position+1 ... ballot.length).
    const first = position + 1;
    const last = ballot.length;
    const average = (first + last) / 2;
    for (const issueNumber of unranked) positions.set(issueNumber, average);
  }

  return positions;
}

/**
 * Borda count: sum each issue's rank position across all voters.
 * Lower total = stronger consensus.
 */
export function bordaCount(input: AggregationInput): ScoredIssue[] {
  const totals = new Map<number, number>();
  const firsts = new Map<number, number>();
  const ranked = new Map<number, number>();

  for (const issueNumber of input.ballot) {
    totals.set(issueNumber, 0);
    firsts.set(issueNumber, 0);
    ranked.set(issueNumber, 0);
  }

  for (const voter of input.voters) {
    const positions = positionsForVoter(input.ballot, voter.ranking.issueNumbers);
    for (const [issueNumber, position] of positions) {
      totals.set(issueNumber, (totals.get(issueNumber) ?? 0) + position);
    }
    for (const issueNumber of voter.ranking.issueNumbers.slice(0, 1)) {
      if (totals.has(issueNumber)) firsts.set(issueNumber, (firsts.get(issueNumber) ?? 0) + 1);
    }
    for (const issueNumber of new Set(voter.ranking.issueNumbers)) {
      if (totals.has(issueNumber)) ranked.set(issueNumber, (ranked.get(issueNumber) ?? 0) + 1);
    }
  }

  return input.ballot.map((issueNumber) => ({
    issueNumber,
    score: totals.get(issueNumber) ?? 0,
    firstPlaceVotes: firsts.get(issueNumber) ?? 0,
    timesRanked: ranked.get(issueNumber) ?? 0,
  }));
}

export function median(values: number[]): number {
  if (values.length === 0) return Number.POSITIVE_INFINITY;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[mid] as number)
    : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

/**
 * Deterministic shuffle (mulberry32) so a re-run of the same week produces the
 * same breakout groups. Live fractal breakouts are random; a tally that must be
 * reproducible from a committed snapshot cannot be.
 */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let state = seed >>> 0 || 1;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

export function chunk<T>(items: T[], size: number): T[][] {
  if (size < 1) throw new Error("chunk size must be >= 1");
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  // Avoid a trailing group of one by folding it into the previous group.
  if (out.length > 1 && (out.at(-1) as T[]).length === 1) {
    const last = out.pop() as T[];
    (out.at(-1) as T[]).push(...last);
  }
  return out;
}

/**
 * Median-of-medians: split voters into breakout groups, take each group's
 * median rank per issue, then the median across groups. Closer to the live
 * fractal model and far less sensitive to one outlier ballot than Borda.
 */
export function medianOfMedians(
  input: AggregationInput,
  options: { breakoutSize?: number; seed?: number } = {},
): ScoredIssue[] {
  const breakoutSize = options.breakoutSize ?? 5;
  const groups = chunk(seededShuffle(input.voters, options.seed ?? 1), breakoutSize);
  const borda = new Map(bordaCount(input).map((s) => [s.issueNumber, s]));

  return input.ballot.map((issueNumber) => {
    const groupMedians = groups.map((group) =>
      median(
        group.map(
          (voter) =>
            positionsForVoter(input.ballot, voter.ranking.issueNumbers).get(issueNumber) ??
            input.ballot.length,
        ),
      ),
    );
    const base = borda.get(issueNumber);
    return {
      issueNumber,
      score: median(groupMedians),
      firstPlaceVotes: base?.firstPlaceVotes ?? 0,
      timesRanked: base?.timesRanked ?? 0,
    };
  });
}

/**
 * Sort scored issues into final order: lowest score wins, then most first-place
 * votes, then most voters who ranked it, then lowest issue number so the result
 * is stable across re-runs.
 */
export function sortScored(scored: ScoredIssue[]): ScoredIssue[] {
  return [...scored].sort(
    (a, b) =>
      a.score - b.score ||
      b.firstPlaceVotes - a.firstPlaceVotes ||
      b.timesRanked - a.timesRanked ||
      a.issueNumber - b.issueNumber,
  );
}
