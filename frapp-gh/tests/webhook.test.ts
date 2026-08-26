import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { normalizeConfig } from "../src/lib/config-loader.js";
import {
  handleDiscussionCommentEvent,
  handleIssueEvent,
  verifySignature,
} from "../src/handlers/webhook-handlers.js";
import { FakeGitHub, MemoryStore } from "./fakes.js";

const WEEK = 52;
const LABEL = `week-${WEEK}-contribution`;

const config = normalizeConfig({
  github: { owner: "zao", repo: "fractal" },
  sessionSchedule: {
    startDay: "Monday",
    startTime: "18:00",
    timezone: "America/New_York",
    epochDate: "2026-05-25T18:00:00-04:00",
    epochWeekNumber: WEEK,
  },
  contributionCriteria: [{ label: "Contribution", description: "shipped work" }],
});

function issuePayload(action: string, overrides: Record<string, unknown> = {}) {
  return {
    action,
    issue: {
      node_id: "I_kw1",
      number: 21,
      title: "Shipped the tally",
      body: "## What I Did\nBuilt the Borda aggregation and tested it end to end.\n\nhttps://github.com/zao/fractal/pull/9\n\n[Contribution]",
      labels: [{ name: LABEL }],
      user: { login: "alice" },
      created_at: "2026-05-27T10:00:00Z",
      ...overrides,
    },
  };
}

function context(github = new FakeGitHub(), store = new MemoryStore()) {
  return { config, client: github, store, now: new Date("2026-05-27T12:00:00Z") };
}

describe("verifySignature", () => {
  const secret = "s3cr3t";
  const payload = JSON.stringify({ hello: "world" });
  const good = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;

  it("accepts a correct signature", async () => {
    expect(await verifySignature(payload, good, secret)).toBe(true);
  });

  it("rejects a tampered payload, a wrong secret, and a missing header", async () => {
    expect(await verifySignature(`${payload} `, good, secret)).toBe(false);
    expect(await verifySignature(payload, good, "other")).toBe(false);
    expect(await verifySignature(payload, undefined, secret)).toBe(false);
    expect(await verifySignature(payload, "sha1=abc", secret)).toBe(false);
    expect(await verifySignature(payload, "sha256=short", secret)).toBe(false);
  });
});

describe("handleIssueEvent", () => {
  it("acknowledges a well-formed contribution", async () => {
    const github = new FakeGitHub();
    const outcome = await handleIssueEvent(context(github), issuePayload("opened"));
    expect(outcome.handled).toBe(true);
    expect(outcome.detail).toContain("0 nudges");
    expect(github.issueComments[0]?.body).toContain("Logged **#21**");
  });

  it("nudges a submission with no evidence, without rejecting it", async () => {
    const github = new FakeGitHub();
    const outcome = await handleIssueEvent(
      context(github),
      issuePayload("opened", { body: "did stuff" }),
    );
    expect(outcome.handled).toBe(true);
    expect(github.issueComments[0]?.body).toContain("No evidence link");
    expect(github.closedIssues).toEqual([]);
  });

  it("closes a malformed submission under hard enforcement", async () => {
    const github = new FakeGitHub();
    const ctx = { ...context(github), config: { ...config, enforcement: "hard" as const } };
    const outcome = await handleIssueEvent(ctx, issuePayload("opened", { body: "x" }));
    expect(outcome.detail).toContain("hard enforcement");
    expect(github.closedIssues).toEqual([21]);
  });

  it("ignores issues without this week's label", async () => {
    const outcome = await handleIssueEvent(
      context(),
      issuePayload("opened", { labels: [{ name: "bug" }] }),
    );
    expect(outcome.handled).toBe(false);
    expect(outcome.detail).toContain("not labeled");
  });

  it("ignores bots, deny-listed authors, and uninteresting actions", async () => {
    const bot = await handleIssueEvent(
      context(),
      issuePayload("opened", { user: { login: "dependabot[bot]" } }),
    );
    expect(bot.detail).toBe("bot author");

    const ctx = { ...context(), config: { ...config, denyList: ["alice"] } };
    expect((await handleIssueEvent(ctx, issuePayload("opened"))).detail).toBe("author on deny list");

    expect((await handleIssueEvent(context(), issuePayload("closed"))).detail).toBe("ignored action");
  });

  it("does not re-comment when a submission is edited", async () => {
    const github = new FakeGitHub();
    await handleIssueEvent(context(github), issuePayload("opened"));
    await handleIssueEvent(context(github), issuePayload("edited"));
    expect(github.issueComments).toHaveLength(1);
  });

  it("adds the issue to the week's board and counts it", async () => {
    const github = new FakeGitHub();
    const store = new MemoryStore();
    await store.writeWeekState({
      weekNumber: WEEK,
      status: "open",
      projectId: "P_1",
      startedAt: "2026-05-25T22:00:00Z",
      contributionCount: 0,
      voterCount: 0,
      respectDistributed: {},
    });
    await handleIssueEvent(context(github, store), issuePayload("opened"));
    expect(github.projectItems).toEqual(["I_kw1"]);
    expect((await store.readWeekState(WEEK))?.contributionCount).toBe(1);
  });

  it("survives a board that rejects the item", async () => {
    const github = new FakeGitHub();
    github.addIssueToProject = async () => {
      throw new Error("no projects scope");
    };
    const store = new MemoryStore();
    await store.writeWeekState({
      weekNumber: WEEK,
      status: "open",
      projectId: "P_1",
      startedAt: "2026-05-25T22:00:00Z",
      contributionCount: 0,
      voterCount: 0,
      respectDistributed: {},
    });
    const outcome = await handleIssueEvent(context(github, store), issuePayload("opened"));
    expect(outcome.handled).toBe(true);
  });
});

describe("handleDiscussionCommentEvent", () => {
  it("notes a ballot comment but defers counting to the snapshot", async () => {
    const outcome = await handleDiscussionCommentEvent(context(), {
      action: "created",
      comment: { body: "/rank #1 #2", user: { login: "dana" } },
    });
    expect(outcome.handled).toBe(false);
    expect(outcome.detail).toContain("ballot noted");
  });

  it("skips its own comments and ordinary chatter", async () => {
    expect(
      (await handleDiscussionCommentEvent(context(), {
        action: "created",
        comment: { body: "<!-- frapp-gh -->\nresults", user: { login: "bot" } },
      })).detail,
    ).toBe("own comment");

    expect(
      (await handleDiscussionCommentEvent(context(), {
        action: "created",
        comment: { body: "gm", user: { login: "dana" } },
      })).detail,
    ).toBe("not a ballot");
  });
});
