import { describe, expect, it } from "vitest";
import {
  assignRespect,
  buildRespectMap,
  generateRespectCurve,
  respectForRank,
  totalRespect,
} from "../src/lib/respect-scorer.js";
import type { ContributionIssue, RankingConfig } from "../src/lib/types.js";

const ZAO_CURVE = [110, 68, 42, 26, 16, 10];

const ranking: RankingConfig = {
  algorithm: "borda",
  respectScores: ZAO_CURVE,
  minVoters: 3,
  voterEligibility: "tier-1",
};

function issues(entries: Array<[number, string]>): Map<number, ContributionIssue> {
  return new Map(
    entries.map(([number, author]) => [
      number,
      {
        id: `I_${number}`,
        number,
        title: `Contribution #${number}`,
        body: "",
        labels: [],
        author,
        createdAt: "2026-05-26T00:00:00Z",
      },
    ]),
  );
}

describe("respectForRank", () => {
  it("follows the 2x Fibonacci curve", () => {
    expect(ZAO_CURVE.map((_, i) => respectForRank(i + 1, ZAO_CURVE))).toEqual(ZAO_CURVE);
  });

  it("awards nothing past the end of the curve", () => {
    expect(respectForRank(7, ZAO_CURVE)).toBe(0);
    expect(respectForRank(99, ZAO_CURVE)).toBe(0);
  });

  it("extends the curve downward when a longer one is asked for", () => {
    const curve = generateRespectCurve(8);
    expect(curve.slice(0, 6)).toEqual(ZAO_CURVE);
    expect(curve).toHaveLength(8);
    expect(curve[6]).toBeLessThan(curve[5] as number);
  });
});

describe("assignRespect", () => {
  it("ranks by score and attaches the curve", () => {
    const ranked = assignRespect(
      [
        { issueNumber: 2, score: 9, firstPlaceVotes: 0, timesRanked: 3 },
        { issueNumber: 1, score: 4, firstPlaceVotes: 2, timesRanked: 3 },
        { issueNumber: 3, score: 12, firstPlaceVotes: 0, timesRanked: 3 },
      ],
      issues([
        [1, "alice"],
        [2, "bob"],
        [3, "carol"],
      ]),
      ranking,
    );
    expect(ranked.map((r) => [r.rank, r.issueNumber, r.respectAwarded])).toEqual([
      [1, 1, 110],
      [2, 2, 68],
      [3, 3, 42],
    ]);
  });

  it("flags ties so the results comment can explain the ordering", () => {
    const ranked = assignRespect(
      [
        { issueNumber: 4, score: 6, firstPlaceVotes: 1, timesRanked: 2 },
        { issueNumber: 5, score: 6, firstPlaceVotes: 0, timesRanked: 2 },
      ],
      issues([
        [4, "alice"],
        [5, "bob"],
      ]),
      ranking,
    );
    expect(ranked[0]?.issueNumber).toBe(4);
    expect(ranked[0]?.tiedWith).toEqual([5]);
    expect(ranked[1]?.tiedWith).toEqual([4]);
  });

  it("keeps ranking issues whose author is gone", () => {
    const ranked = assignRespect(
      [{ issueNumber: 8, score: 1, firstPlaceVotes: 1, timesRanked: 1 }],
      issues([]),
      ranking,
    );
    expect(ranked[0]?.author).toBe("unknown");
    expect(ranked[0]?.respectAwarded).toBe(110);
  });
});

describe("Respect for work nobody ranked", () => {
  it("pays the curve at the rank it lands on", () => {
    const ranked = assignRespect(
      [
        { issueNumber: 1, score: 4, firstPlaceVotes: 2, timesRanked: 2 },
        { issueNumber: 2, score: 8, firstPlaceVotes: 0, timesRanked: 2 },
        { issueNumber: 3, score: 9, firstPlaceVotes: 0, timesRanked: 0 },
      ],
      issues([
        [1, "alice"],
        [2, "bob"],
        [3, "carol"],
      ]),
      ranking,
    );

    const unplaced = ranked.find((r) => r.issueNumber === 3);
    expect(unplaced?.rank).toBe(3);
    expect(unplaced?.respectAwarded).toBe(42);
    expect(buildRespectMap(ranked).carol).toBe(42);
  });

  it("earns nothing once it falls past the end of the curve", () => {
    const shortCurve = { ...ranking, respectScores: [110, 68] };
    const ranked = assignRespect(
      [
        { issueNumber: 1, score: 1, firstPlaceVotes: 3, timesRanked: 3 },
        { issueNumber: 2, score: 5, firstPlaceVotes: 0, timesRanked: 3 },
        { issueNumber: 3, score: 9, firstPlaceVotes: 0, timesRanked: 0 },
      ],
      issues([
        [1, "alice"],
        [2, "bob"],
        [3, "carol"],
      ]),
      shortCurve,
    );
    expect(ranked.find((r) => r.issueNumber === 3)?.respectAwarded).toBe(0);
    expect(buildRespectMap(ranked).carol).toBeUndefined();
  });
});

describe("buildRespectMap", () => {
  it("sums multiple ranked contributions from one author", () => {
    const ranked = assignRespect(
      [
        { issueNumber: 1, score: 2, firstPlaceVotes: 2, timesRanked: 2 },
        { issueNumber: 2, score: 5, firstPlaceVotes: 0, timesRanked: 2 },
      ],
      issues([
        [1, "alice"],
        [2, "alice"],
      ]),
      ranking,
    );
    const map = buildRespectMap(ranked);
    expect(map).toEqual({ alice: 178 });
    expect(totalRespect(map)).toBe(178);
  });

  it("omits authors whose contributions fell below the curve", () => {
    const scored = Array.from({ length: 7 }, (_, i) => ({
      issueNumber: i + 1,
      score: i + 1,
      firstPlaceVotes: 0,
      timesRanked: 1,
    }));
    const map = buildRespectMap(
      assignRespect(
        scored,
        issues(scored.map((s) => [s.issueNumber, `user${s.issueNumber}`])),
        ranking,
      ),
    );
    expect(Object.keys(map)).toHaveLength(6);
    expect(map.user7).toBeUndefined();
    expect(totalRespect(map)).toBe(272);
  });
});
