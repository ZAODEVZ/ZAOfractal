import { describe, expect, it } from "vitest";
import { loadScenario, runScenario } from "../src/testing/replay.js";

/**
 * The whole point of the harness: a full period, driven by recorded GitHub
 * deliveries, with no App and no network. If this goes red the async flow is
 * broken somewhere between webhook receipt and the results comment.
 */
describe("full period replay", () => {
  const scenario = loadScenario("fixtures/scenarios/full-period.json");

  it("plays every step without a failure", async () => {
    const result = await runScenario(scenario);
    const failures = result.transcript.filter((t) => t.status >= 400);
    expect(failures).toEqual([]);
    expect(result.transcript).toHaveLength(scenario.steps.length);
  });

  it("builds the ballot from labeled submissions only", async () => {
    const { snapshot, transcript } = await runScenario(scenario);

    // 41-46 are labeled contributions. 47 was withdrawn, 48 is a bot.
    expect(snapshot?.ballot).toEqual([41, 42, 43, 44, 45, 46]);
    expect(transcript.find((t) => t.summary.includes("bot author"))).toBeDefined();
    expect(transcript.find((t) => t.summary.includes("withdrew #47"))).toBeDefined();
    expect(
      transcript.find((t) => t.summary === "not labeled period-111-contribution"),
    ).toBeDefined();
  });

  it("nudges a thin submission without rejecting it", async () => {
    const { github } = await runScenario(scenario);
    const nudge = github.issueComments.find((c) => c.issueNumber === 47);
    expect(nudge?.body).toContain("No evidence link");
    expect(github.closedIssues).toEqual([]);
  });

  it("acknowledges each submission once, not again on edit", async () => {
    const { github } = await runScenario(scenario);
    const acks = github.issueComments.filter(
      (c) => c.issueNumber === 41 && c.body.includes("Logged **#41**"),
    );
    expect(acks).toHaveLength(1);
  });

  it("reads ballots in both accepted formats and honours the later comment", async () => {
    const { snapshot } = await runScenario(scenario);

    expect(snapshot?.voters.hana?.ranking.issueNumbers).toEqual([41, 44, 43, 42, 46]);
    // ivan wrote a numbered list, not a /rank command.
    expect(snapshot?.voters.ivan?.ranking.issueNumbers).toEqual([44, 41, 42, 43, 46]);
    // kim chattered first, then posted a real ballot.
    expect(snapshot?.voters.kim?.ranking.issueNumbers).toEqual([43, 41, 44, 46, 42]);
    // jae ranked only two of six.
    expect(snapshot?.voters.jae?.ranking.issueNumbers).toEqual([41, 42]);
  });

  it("rejects the under-age account and counts the rest", async () => {
    const { snapshot, tally } = await runScenario(scenario);
    expect(snapshot?.voters.newbie?.rejected).toMatch(/6 days old; 14 required/);
    expect(tally?.voterCount).toBe(4);
  });

  it("produces the ZAO curve over the consensus order", async () => {
    const { tally } = await runScenario(scenario);
    expect(tally?.ranked.map((r) => r.issueNumber)).toEqual([41, 44, 43, 42, 46, 45]);
    expect(tally?.ranked.map((r) => r.respectAwarded)).toEqual([110, 68, 42, 26, 16, 10]);
    expect(tally?.respectDistributed).toEqual({
      alice: 110,
      dana: 68,
      carol: 42,
      bob: 26,
      frank: 16,
      erin: 10,
    });
    expect(tally?.totalRespect).toBe(272);
  });

  it("posts a results comment naming the period, and writes the leaderboard", async () => {
    const { resultsMarkdown, leaderboard } = await runScenario(scenario);
    expect(resultsMarkdown).toContain("# Period 111 Results");
    expect(resultsMarkdown).toContain("@alice");
    expect(resultsMarkdown).toContain("Phase 1: off-chain only");
    expect(leaderboard?.entries[0]).toMatchObject({ githubUsername: "alice", totalRespect: 110 });
    expect(leaderboard?.weeksCounted).toEqual([111]);
  });

  it("is deterministic across runs", async () => {
    const a = await runScenario(scenario);
    const b = await runScenario(scenario);
    expect(b.tally?.ranked).toEqual(a.tally?.ranked);
    expect(b.transcript.map((t) => t.summary)).toEqual(a.transcript.map((t) => t.summary));
  });

  it("refuses the period when too few ballots arrive", async () => {
    const thin = {
      ...scenario,
      steps: scenario.steps.filter(
        (s) => !["discussion_comment.ballot.ivan.json", "discussion_comment.ballot.kim.json"].includes(s.payload ?? ""),
      ),
    };
    const { tally, github } = await runScenario(thin);
    expect(tally).toBeNull();
    expect(github.postedDiscussionComments.at(-1)?.body).toContain("did not tally");
  });
});
