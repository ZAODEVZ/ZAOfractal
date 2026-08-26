import { beforeEach, describe, expect, it } from "vitest";
import { normalizeConfig } from "../src/lib/config-loader.js";
import {
  openSession,
  refreshLeaderboard,
  snapshotVotes,
  tallyResults,
  type CycleContext,
} from "../src/handlers/cron-handlers.js";
import { FakeGitHub, MemoryStore, makeComment, makeIssue } from "./fakes.js";

const WEEK = 52;
const LABEL = `week-${WEEK}-contribution`;

const config = normalizeConfig({
  community: "The ZAO",
  github: { owner: "zao", repo: "fractal", discussionCategory: "Fractal Sessions" },
  sessionSchedule: {
    startDay: "Monday",
    startTime: "18:00",
    timezone: "America/New_York",
    epochDate: "2026-05-25T18:00:00-04:00",
    epochWeekNumber: WEEK,
  },
  ranking: { minVoters: 3 },
  contributionCriteria: [{ label: "Contribution", description: "shipped work" }],
});

const VOTERS = ["dana", "eli", "fiona"];

function seedGitHub() {
  return new FakeGitHub({
    issues: [
      makeIssue(11, "alice", LABEL),
      makeIssue(12, "bob", LABEL),
      makeIssue(13, "carol", LABEL),
      makeIssue(14, "alice", LABEL),
      makeIssue(99, "mallory", "unrelated"),
    ],
    users: Object.fromEntries(
      [...VOTERS, "alice", "bob", "carol"].map((login) => [login, {}]),
    ),
    discussionComments: [
      makeComment("dana", "/rank #12 #11 #13 #14"),
      makeComment("eli", "1. #12\n2. #13\n3. #11\n4. #14"),
      makeComment("fiona", "nice week everyone"),
      makeComment("fiona", "/rank #11 #12 #14 #13", "2026-05-30T18:00:00Z"),
    ],
  });
}

function context(github: FakeGitHub, store: MemoryStore, now = "2026-06-01T00:00:00Z"): CycleContext {
  return { config, client: github, store, now: new Date(now) };
}

describe("full cycle", () => {
  let github: FakeGitHub;
  let store: MemoryStore;

  beforeEach(() => {
    github = seedGitHub();
    store = new MemoryStore();
  });

  it("opens the session, creating the label and the discussion", async () => {
    const result = await openSession(context(github, store, "2026-05-26T12:00:00Z"));
    expect(result.ok).toBe(true);
    expect(result.week).toBe(WEEK);
    expect(github.labels).toContain(LABEL);
    expect(github.discussions[0]?.title).toBe(`Week ${WEEK} Fractal Session`);

    const state = await store.readWeekState(WEEK);
    expect(state?.status).toBe("open");
    expect(state?.discussionNumber).toBe(100);
  });

  it("refuses to open when Discussions are not enabled", async () => {
    const noDiscussions = new FakeGitHub({ discussionCategories: [] });
    const result = await openSession(context(noDiscussions, store, "2026-05-26T12:00:00Z"));
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Discussions are not enabled");
    expect(noDiscussions.discussions).toHaveLength(0);
  });

  it("refuses to open when the configured category is missing, naming what exists", async () => {
    const wrongCategory = new FakeGitHub({ discussionCategories: ["General", "Ideas"] });
    const result = await openSession(context(wrongCategory, store, "2026-05-26T12:00:00Z"));
    expect(result.ok).toBe(false);
    expect(result.message).toContain('No Discussion category named "Fractal Sessions"');
    expect(result.message).toContain("General, Ideas");
  });

  it("does not reopen a week that already closed voting", async () => {
    await openSession(context(github, store, "2026-05-26T12:00:00Z"));
    await store.writeWeekState({ ...(await store.readWeekState(WEEK))!, status: "voting-closed" });
    const second = await openSession(context(github, store, "2026-05-26T12:00:00Z"));
    expect(second.ok).toBe(false);
    expect(second.message).toContain("already voting-closed");
  });

  it("snapshots ballots from discussion comments, latest comment winning", async () => {
    await openSession(context(github, store, "2026-05-26T12:00:00Z"));
    const result = await snapshotVotes(context(github, store, "2026-05-30T22:00:00Z"), WEEK);

    expect(result.ok).toBe(true);
    const snapshot = result.data!;
    expect(snapshot.ballot).toEqual([11, 12, 13, 14]);
    expect(Object.keys(snapshot.voters).sort()).toEqual(["dana", "eli", "fiona"]);
    // fiona's chatter is replaced by her later /rank comment.
    expect(snapshot.voters.fiona?.ranking.issueNumbers).toEqual([11, 12, 14, 13]);
    expect(Object.values(snapshot.voters).every((v) => !v.rejected)).toBe(true);
    expect(await store.readWeekState(WEEK).then((s) => s?.status)).toBe("voting-closed");
  });

  it("rejects ballots from accounts under the age floor", async () => {
    github.users.dana = { login: "dana", createdAt: "2026-05-29T00:00:00Z", type: "User" };
    await openSession(context(github, store, "2026-05-26T12:00:00Z"));
    const result = await snapshotVotes(context(github, store, "2026-05-30T22:00:00Z"), WEEK);
    expect(result.data?.voters.dana?.rejected).toMatch(/days old/);
  });

  it("rejects bot ballots and deny-listed voters", async () => {
    github.users.eli = { login: "eli", createdAt: "2015-01-01T00:00:00Z", type: "Bot" };
    const denyCtx = {
      ...context(github, store, "2026-05-30T22:00:00Z"),
      config: { ...config, denyList: ["fiona"] },
    };
    await openSession(context(github, store, "2026-05-26T12:00:00Z"));
    const result = await snapshotVotes(denyCtx, WEEK);
    expect(result.data?.voters.eli?.rejected).toMatch(/bots/);
    expect(result.data?.voters.fiona?.rejected).toMatch(/deny list/);
  });

  it("falls back to the project board when nobody comments a ballot", async () => {
    const boardGitHub = new FakeGitHub({
      issues: [makeIssue(11, "alice", LABEL), makeIssue(12, "bob", LABEL)],
      discussionComments: [makeComment("dana", "no ballot here")],
      projectOrder: [12, 11],
    });
    const boardCtx = {
      ...context(boardGitHub, store, "2026-05-30T22:00:00Z"),
      config: { ...config, github: { ...config.github, projectNumber: 4 } },
    };
    await openSession({ ...boardCtx, now: new Date("2026-05-26T12:00:00Z") });
    const result = await snapshotVotes(boardCtx, WEEK);
    expect(result.data?.voters["project-board"]?.ranking.issueNumbers).toEqual([12, 11]);
  });

  it("tallies, awards the curve, and posts results", async () => {
    await openSession(context(github, store, "2026-05-26T12:00:00Z"));
    await snapshotVotes(context(github, store, "2026-05-30T22:00:00Z"), WEEK);
    const result = await tallyResults(context(github, store), WEEK);

    expect(result.ok).toBe(true);
    const tally = result.data!;
    // dana: 12,11,13,14  eli: 12,13,11,14  fiona: 11,12,14,13
    // borda -> 11: 2+3+1=6, 12: 1+1+2=4, 13: 3+2+4=9, 14: 4+4+3=11
    expect(tally.ranked.map((r) => r.issueNumber)).toEqual([12, 11, 13, 14]);
    expect(tally.ranked.map((r) => r.respectAwarded)).toEqual([110, 68, 42, 26]);
    expect(tally.respectDistributed).toEqual({ bob: 110, alice: 94, carol: 42 });
    expect(tally.totalRespect).toBe(246);

    const posted = github.postedDiscussionComments.at(-1)?.body ?? "";
    expect(posted).toContain("Week 52 Results");
    expect(posted).toContain("@bob");
    expect(posted).toContain("110");

    const state = await store.readWeekState(WEEK);
    expect(state?.status).toBe("completed");
    expect(state?.tallyMethod).toBe("borda");
    expect(store.leaderboard?.entries[0]?.githubUsername).toBe("bob");
  });

  it("refuses to tally below minVoters and says so in the discussion", async () => {
    const quiet = new FakeGitHub({
      issues: [makeIssue(11, "alice", LABEL), makeIssue(12, "bob", LABEL)],
      users: { dana: {} },
      discussionComments: [makeComment("dana", "/rank #11 #12")],
    });
    await openSession(context(quiet, store, "2026-05-26T12:00:00Z"));
    await snapshotVotes(context(quiet, store, "2026-05-30T22:00:00Z"), WEEK);
    const result = await tallyResults(context(quiet, store), WEEK);

    expect(result.ok).toBe(false);
    expect(result.message).toContain("Only 1 eligible ballot");
    expect(quiet.postedDiscussionComments.at(-1)?.body).toContain("did not tally");
    expect(await store.readWeekState(WEEK).then((s) => s?.status)).toBe("voting-closed");
  });

  it("reports missing state instead of throwing", async () => {
    expect((await snapshotVotes(context(github, store), 99)).ok).toBe(false);
    expect((await tallyResults(context(github, store), 99)).message).toContain("no state");
  });

  it("writes nothing in dry-run mode", async () => {
    const dry = { ...context(github, store, "2026-05-26T12:00:00Z"), dryRun: true };
    const result = await openSession(dry);
    expect(result.message).toContain("dry-run");
    expect(github.discussions).toHaveLength(0);
    expect(await store.readWeekState(WEEK)).toBeNull();
  });

  it("accumulates respect across weeks in the leaderboard", async () => {
    await store.writeWeekState({
      weekNumber: 51,
      status: "completed",
      startedAt: "2026-05-18T22:00:00Z",
      contributionCount: 2,
      voterCount: 3,
      respectDistributed: { alice: 110, bob: 68 },
      contributionTitles: { alice: "Wrote the spec" },
    });
    await openSession(context(github, store, "2026-05-26T12:00:00Z"));
    await snapshotVotes(context(github, store, "2026-05-30T22:00:00Z"), WEEK);
    await tallyResults(context(github, store), WEEK);
    await refreshLeaderboard(context(github, store));

    const board = store.leaderboard!;
    expect(board.weeksCounted).toEqual([51, 52]);
    expect(board.entries.find((e) => e.githubUsername === "alice")?.totalRespect).toBe(204);
    expect(board.entries.find((e) => e.githubUsername === "alice")?.weeksParticipated).toBe(2);
    expect(board.totalRespectDistributed).toBe(424);
  });
});
