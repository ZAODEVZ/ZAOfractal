import { describe, expect, it } from "vitest";
import {
  bordaCount,
  chunk,
  median,
  medianOfMedians,
  positionsForVoter,
  seededShuffle,
  sortScored,
} from "../src/lib/borda-count.js";
import type { VoterRanking } from "../src/lib/types.js";

function voter(username: string, issueNumbers: number[]): VoterRanking {
  return {
    githubUsername: username,
    accountAge: 999,
    eligibleTier: "tier-1",
    ranking: { issueNumbers },
    submittedAt: "2026-05-30T12:00:00Z",
    source: "discussion-comment",
  };
}

describe("positionsForVoter", () => {
  it("assigns 1-based positions to a full ballot", () => {
    const positions = positionsForVoter([1, 2, 3], [3, 1, 2]);
    expect(positions.get(3)).toBe(1);
    expect(positions.get(1)).toBe(2);
    expect(positions.get(2)).toBe(3);
  });

  it("gives unranked issues the average of the leftover positions", () => {
    // Ranked 1 of 5: positions 2..5 remain, average 3.5.
    const positions = positionsForVoter([1, 2, 3, 4, 5], [4]);
    expect(positions.get(4)).toBe(1);
    expect(positions.get(1)).toBe(3.5);
    expect(positions.get(5)).toBe(3.5);
  });

  it("ignores issues that are not on the ballot", () => {
    const positions = positionsForVoter([1, 2], [99, 2, 1]);
    expect(positions.get(2)).toBe(1);
    expect(positions.get(1)).toBe(2);
    expect(positions.has(99)).toBe(false);
  });

  it("keeps only the first placement of a duplicated issue", () => {
    const positions = positionsForVoter([1, 2, 3], [2, 2, 1, 3]);
    expect(positions.get(2)).toBe(1);
    expect(positions.get(1)).toBe(2);
    expect(positions.get(3)).toBe(3);
  });
});

describe("bordaCount", () => {
  it("sums rank positions, lowest total winning", () => {
    const scored = bordaCount({
      ballot: [1, 2, 3],
      voters: [voter("a", [1, 2, 3]), voter("b", [1, 3, 2]), voter("c", [2, 1, 3])],
    });
    const byIssue = new Map(scored.map((s) => [s.issueNumber, s]));
    expect(byIssue.get(1)?.score).toBe(1 + 1 + 2);
    expect(byIssue.get(2)?.score).toBe(2 + 3 + 1);
    expect(byIssue.get(3)?.score).toBe(3 + 2 + 3);
    expect(sortScored(scored).map((s) => s.issueNumber)).toEqual([1, 2, 3]);
  });

  it("counts first-place votes and how many voters ranked each issue", () => {
    const scored = bordaCount({
      ballot: [7, 8],
      voters: [voter("a", [7, 8]), voter("b", [7]), voter("c", [8, 7])],
    });
    const seven = scored.find((s) => s.issueNumber === 7);
    expect(seven?.firstPlaceVotes).toBe(2);
    expect(seven?.timesRanked).toBe(3);
    expect(scored.find((s) => s.issueNumber === 8)?.timesRanked).toBe(2);
  });

  it("returns every ballot item even when nobody ranked it", () => {
    const scored = bordaCount({ ballot: [1, 2], voters: [] });
    expect(scored.map((s) => s.score)).toEqual([0, 0]);
  });
});

describe("a contribution nobody ranked", () => {
  // Decided rule, not an accident of the averaging: zero placements is a valid
  // outcome, it still earns whatever the curve pays at its rank, and it can
  // never sit above work a voter actually placed.
  it("still scores, and settles below everything that was placed", () => {
    const scored = bordaCount({
      ballot: [1, 2, 3],
      voters: [voter("a", [1, 2]), voter("b", [2, 1]), voter("c", [1, 2])],
    });
    const three = scored.find((s) => s.issueNumber === 3);

    expect(three?.timesRanked).toBe(0);
    expect(three?.firstPlaceVotes).toBe(0);
    expect(three?.score).toBe(9); // position 3 on each of three ballots
    expect(sortScored(scored).map((s) => s.issueNumber)).toEqual([1, 2, 3]);
  });

  it("cannot outrank a placed contribution on an equal score", () => {
    const scored = sortScored([
      { issueNumber: 9, score: 6, firstPlaceVotes: 0, timesRanked: 0 },
      { issueNumber: 4, score: 6, firstPlaceVotes: 0, timesRanked: 1 },
    ]);
    expect(scored.map((s) => s.issueNumber)).toEqual([4, 9]);
  });

  it("holds when every voter submits an empty-ish ballot", () => {
    const scored = bordaCount({
      ballot: [1, 2],
      voters: [voter("a", []), voter("b", [])],
    });
    // Both unplaced, both get the same leftover average; issue number decides.
    expect(scored.every((s) => s.timesRanked === 0)).toBe(true);
    expect(sortScored(scored).map((s) => s.issueNumber)).toEqual([1, 2]);
  });
});

describe("sortScored tie-breaks", () => {
  it("prefers more first-place votes, then more voters, then lower issue number", () => {
    const sorted = sortScored([
      { issueNumber: 5, score: 4, firstPlaceVotes: 0, timesRanked: 2 },
      { issueNumber: 3, score: 4, firstPlaceVotes: 1, timesRanked: 2 },
      { issueNumber: 9, score: 4, firstPlaceVotes: 0, timesRanked: 3 },
      { issueNumber: 1, score: 2, firstPlaceVotes: 0, timesRanked: 1 },
    ]);
    expect(sorted.map((s) => s.issueNumber)).toEqual([1, 3, 9, 5]);
  });
});

describe("median helpers", () => {
  it("computes odd and even medians", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBe(Number.POSITIVE_INFINITY);
  });

  it("chunks and folds a trailing group of one", () => {
    expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4, 5]]);
    expect(chunk([1], 5)).toEqual([[1]]);
    expect(() => chunk([1], 0)).toThrow();
  });

  it("shuffles deterministically for a given seed", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(seededShuffle(items, 52)).toEqual(seededShuffle(items, 52));
    expect(seededShuffle(items, 52)).not.toEqual(seededShuffle(items, 7));
    expect([...seededShuffle(items, 52)].sort((a, b) => a - b)).toEqual(items);
  });
});

describe("medianOfMedians", () => {
  it("resists a single outlier ballot that Borda would follow", () => {
    // Eight voters put #1 first; one outlier buries it last.
    const voters = [
      ...Array.from({ length: 8 }, (_, i) => voter(`v${i}`, [1, 2, 3])),
      voter("outlier", [3, 2, 1]),
    ];
    const input = { ballot: [1, 2, 3], voters };
    const mom = new Map(
      medianOfMedians(input, { breakoutSize: 3, seed: 1 }).map((s) => [s.issueNumber, s.score]),
    );
    expect(mom.get(1)).toBeLessThan(mom.get(3) as number);
    expect(sortScored(medianOfMedians(input, { breakoutSize: 3, seed: 1 }))[0]?.issueNumber).toBe(1);
  });

  it("is reproducible for the same seed", () => {
    const input = {
      ballot: [1, 2, 3, 4],
      voters: Array.from({ length: 9 }, (_, i) => voter(`v${i}`, [1, 2, 3, 4].slice(i % 2))),
    };
    expect(medianOfMedians(input, { seed: 52 })).toEqual(medianOfMedians(input, { seed: 52 }));
  });
});
