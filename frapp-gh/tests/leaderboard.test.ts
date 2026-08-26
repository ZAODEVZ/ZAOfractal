import { describe, expect, it } from "vitest";
import { buildLeaderboard } from "../src/lib/leaderboard.js";
import type { WeekState } from "../src/lib/types.js";

function week(weekNumber: number, respect: Record<string, number>, status: WeekState["status"] = "completed"): WeekState {
  return {
    weekNumber,
    status,
    startedAt: "2026-05-18T22:00:00Z",
    contributionCount: Object.keys(respect).length,
    voterCount: 3,
    respectDistributed: respect,
    contributionTitles: Object.fromEntries(Object.keys(respect).map((k) => [k, `${k} shipped w${weekNumber}`])),
  };
}

describe("buildLeaderboard", () => {
  it("sums respect across completed weeks and ranks by total", () => {
    const board = buildLeaderboard("The ZAO", [
      week(51, { alice: 110, bob: 68 }),
      week(52, { bob: 110, carol: 42 }),
    ], { asOf: "2026-06-01T00:00:00Z" });

    expect(board.entries.map((e) => [e.githubUsername, e.totalRespect])).toEqual([
      ["bob", 178],
      ["alice", 110],
      ["carol", 42],
    ]);
    expect(board.totalRespectDistributed).toBe(330);
    expect(board.weeksCounted).toEqual([51, 52]);
    expect(board.asOf).toBe("2026-06-01T00:00:00Z");
  });

  it("ignores weeks that never completed", () => {
    const board = buildLeaderboard("The ZAO", [
      week(51, { alice: 110 }),
      week(52, { mallory: 110 }, "voting-closed"),
      week(53, { alice: 68 }, "open"),
    ]);
    expect(board.entries).toHaveLength(1);
    expect(board.entries[0]?.totalRespect).toBe(110);
  });

  it("counts archived weeks", () => {
    const board = buildLeaderboard("The ZAO", [week(50, { alice: 26 }, "archived")]);
    expect(board.entries[0]?.totalRespect).toBe(26);
  });

  it("lists recent activity newest first and caps it", () => {
    const weeks = Array.from({ length: 7 }, (_, i) => week(40 + i, { alice: 10 }));
    const board = buildLeaderboard("The ZAO", weeks, { recentLimit: 3 });
    const entry = board.entries[0]!;
    expect(entry.recentActivity.map((a) => a.week)).toEqual([46, 45, 44]);
    expect(entry.recentActivity[0]?.contribution).toBe("alice shipped w46");
    expect(entry.weeksParticipated).toBe(7);
  });

  it("breaks equal totals alphabetically and skips zero awards", () => {
    const board = buildLeaderboard("The ZAO", [week(51, { zed: 42, adam: 42, ghost: 0 })]);
    expect(board.entries.map((e) => e.githubUsername)).toEqual(["adam", "zed"]);
  });

  it("returns an empty board when nothing completed", () => {
    const board = buildLeaderboard("The ZAO", []);
    expect(board.entries).toEqual([]);
    expect(board.totalRespectDistributed).toBe(0);
  });
});
