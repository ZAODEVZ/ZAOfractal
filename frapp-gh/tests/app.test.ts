import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { createApp, type Deps } from "../src/app.js";
import { normalizeConfig } from "../src/lib/config-loader.js";
import { FakeGitHub, MemoryStore, makeComment, makeIssue } from "./fakes.js";

const WEEK = 52;
const LABEL = `week-${WEEK}-contribution`;
const SECRET = "hook-secret";
const CRON_SECRET = "cron-secret";

const config = normalizeConfig({
  community: "The ZAO",
  github: { owner: "zao", repo: "fractal" },
  sessionSchedule: {
    startDay: "Monday",
    startTime: "18:00",
    timezone: "America/New_York",
    // No epochDate: every instant maps to WEEK, so the suite does not drift
    // with the calendar.
    epochWeekNumber: WEEK,
  },
  ranking: { minVoters: 2 },
});

const env = {
  GITHUB_WEBHOOK_SECRET: SECRET,
  FRAPP_GH_CRON_SECRET: CRON_SECRET,
};

function harness() {
  const github = new FakeGitHub({
    issues: [makeIssue(11, "alice", LABEL), makeIssue(12, "bob", LABEL)],
    users: { dana: {}, eli: {} },
    discussionComments: [makeComment("dana", "/rank #12 #11"), makeComment("eli", "/rank #12 #11")],
  });
  const store = new MemoryStore();
  const deps: Deps = { config, client: github, store };
  return { github, store, app: createApp(async () => deps) };
}

function sign(body: string) {
  return `sha256=${createHmac("sha256", SECRET).update(body).digest("hex")}`;
}

describe("HTTP surface", () => {
  it("reports health without credentials", async () => {
    const { app } = harness();
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, phase: 1 });
  });

  it("rejects an unsigned webhook", async () => {
    const { app } = harness();
    const res = await app.request(
      "/webhook/github",
      { method: "POST", headers: { "x-github-event": "issues" }, body: "{}" },
      env,
    );
    expect(res.status).toBe(401);
  });

  it("answers a signed ping", async () => {
    const { app } = harness();
    const body = JSON.stringify({ zen: "hi" });
    const res = await app.request(
      "/webhook/github",
      {
        method: "POST",
        headers: { "x-github-event": "ping", "x-hub-signature-256": sign(body) },
        body,
      },
      env,
    );
    expect(await res.json()).toMatchObject({ pong: true });
  });

  it("routes a signed issue event to the handler", async () => {
    const { app, github } = harness();
    const body = JSON.stringify({
      action: "opened",
      issue: {
        node_id: "I_1",
        number: 11,
        title: "t",
        body: "## What I Did\nA real description of shipped work.\n\nhttps://example.com/pr/1",
        labels: [{ name: LABEL }],
        user: { login: "alice" },
        created_at: "2026-05-27T00:00:00Z",
      },
    });
    const res = await app.request(
      "/webhook/github",
      {
        method: "POST",
        headers: { "x-github-event": "issues", "x-hub-signature-256": sign(body) },
        body,
      },
      env,
    );
    expect(await res.json()).toMatchObject({ handled: true });
    expect(github.issueComments).toHaveLength(1);
  });

  it("guards the cycle endpoints with the cron secret", async () => {
    const { app } = harness();
    const unauthorized = await app.request("/api/v1/cycle/open", { method: "POST" }, env);
    expect(unauthorized.status).toBe(401);

    const ok = await app.request(
      "/api/v1/cycle/open",
      { method: "POST", headers: { "x-frapp-gh-secret": CRON_SECRET } },
      env,
    );
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ ok: true, week: WEEK });
  });

  it("runs open -> snapshot -> tally over HTTP", async () => {
    const { app, store } = harness();
    const headers = { "x-frapp-gh-secret": CRON_SECRET };
    await app.request("/api/v1/cycle/open", { method: "POST", headers }, env);
    await app.request(`/api/v1/cycle/snapshot?week=${WEEK}`, { method: "POST", headers }, env);
    const tally = await app.request(`/api/v1/cycle/tally?week=${WEEK}`, { method: "POST", headers }, env);

    expect(tally.status).toBe(200);
    const body: any = await tally.json();
    expect(body.data.ranked[0].issueNumber).toBe(12);
    expect(store.leaderboard?.entries[0]?.githubUsername).toBe("bob");

    const votes = await app.request(`/api/v1/votes/${WEEK}`, {}, env);
    expect((await votes.json()).ballot).toEqual([11, 12]);

    const board = await app.request("/api/v1/leaderboard", {}, env);
    expect((await board.json()).entries).toHaveLength(2);
  });

  it("returns 409 when a cycle step is out of order", async () => {
    const { app } = harness();
    const res = await app.request(
      "/api/v1/cycle/tally?week=99",
      { method: "POST", headers: { "x-frapp-gh-secret": CRON_SECRET } },
      env,
    );
    expect(res.status).toBe(409);
  });

  it("reports the current phase", async () => {
    const { app } = harness();
    const res = await app.request("/api/v1/status", {}, env);
    const body: any = await res.json();
    expect(body.community).toBe("The ZAO");
    expect(body.algorithm).toBe("borda");
    expect(["submission", "voting", "tally", "closed"]).toContain(body.phase);
  });

  it("404s on a week with no data", async () => {
    const { app } = harness();
    expect((await app.request("/api/v1/weeks/99", {}, env)).status).toBe(404);
    expect((await app.request("/api/v1/votes/99", {}, env)).status).toBe(404);
  });
});
