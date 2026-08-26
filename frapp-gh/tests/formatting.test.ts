import { describe, expect, it } from "vitest";
import { normalizeConfig } from "../src/lib/config-loader.js";
import {
  cycleNoun,
  renderResults,
  renderSessionBody,
  renderTallyFailure,
  sessionTitle,
} from "../src/handlers/formatting.js";
import { cycleWindow } from "../src/lib/week.js";
import type { TallyResult } from "../src/lib/types.js";

const zao = normalizeConfig({
  community: "The ZAO",
  cycleNoun: "Period",
  github: { owner: "ZAODEVZ", repo: "ZAOfractal", issueLabel: "period-{N}-contribution" },
  sessionSchedule: { epochDate: "2026-08-24T18:00:00-04:00", epochWeekNumber: 110 },
  contributionCriteria: [{ label: "Vision", description: "strategy" }],
});

const generic = normalizeConfig({ github: { owner: "o", repo: "r" } });

const result: TallyResult = {
  week: 110,
  method: "borda",
  voterCount: 4,
  contributionCount: 2,
  ranked: [
    { issueNumber: 7, rank: 1, score: 5, author: "alice", title: "Shipped it", respectAwarded: 110 },
    { issueNumber: 8, rank: 2, score: 9, author: "bob", title: "Reviewed it", respectAwarded: 68 },
  ],
  respectDistributed: { alice: 110, bob: 68 },
  totalRespect: 178,
  rejectedVoters: [],
  tallyCompletedAt: "2026-08-31T22:00:00Z",
};

describe("cycle noun", () => {
  it("uses the community's own word for a cycle", () => {
    expect(cycleNoun(zao)).toBe("Period");
    expect(cycleNoun(generic)).toBe("Week");
    expect(sessionTitle(110, zao)).toBe("Period 110 Fractal Session");
    expect(sessionTitle(52, generic)).toBe("Week 52 Fractal Session");
  });

  it("carries the noun into the session body, results, and failure notice", () => {
    const body = renderSessionBody(zao, cycleWindow(zao, new Date("2026-08-26T12:00:00Z")));
    expect(body).toContain("Period 110 Fractal Session");
    expect(body).toContain("period-110-contribution");
    expect(body).toContain("the period does not tally");

    expect(renderResults(result, zao)).toContain("# Period 110 Results");
    expect(renderTallyFailure(110, "Only 1 ballot.", zao)).toContain("Period 110 did not tally");
    expect(renderTallyFailure(52, "Only 1 ballot.")).toContain("Week 52 did not tally");
  });

  it("falls back to Week when a config sets an empty noun", () => {
    expect(cycleNoun({ ...generic, cycleNoun: "   " })).toBe("Week");
  });
});
