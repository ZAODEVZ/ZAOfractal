/**
 * Local replay harness.
 *
 * Plays a whole async period against recorded GitHub webhook payloads with no
 * live App, no network, and no credentials. The point is that the fake GitHub's
 * state is *derived from the same payloads the handlers receive* - an issue
 * exists on the ballot because an `issues.opened` delivery said so, and a ballot
 * counts because a `discussion_comment` delivery carried it. That is what makes
 * a green replay evidence about the real flow rather than about the fake.
 */
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createApp, type Deps } from "../app.js";
import { normalizeConfig } from "../lib/config-loader.js";
import type { FrameworkConfig, Leaderboard, TallyResult, VoteSnapshot } from "../lib/types.js";
import { FakeGitHub, MemoryStore, type FakeSeed } from "./fakes.js";
import type { ContributionIssue } from "../lib/types.js";

export const REPLAY_WEBHOOK_SECRET = "replay-webhook-secret";
export const REPLAY_CRON_SECRET = "replay-cron-secret";

export interface ScenarioStep {
  /** Simulated wall-clock for this step. Drives the injected clock. */
  at: string;
  /** GitHub event name, e.g. "issues" or "discussion_comment". */
  webhook?: string;
  /** Payload filename under fixtures/webhooks/. */
  payload?: string;
  /** Cycle step to run instead of a webhook. */
  cycle?: "open" | "snapshot" | "tally";
  /** Optional note rendered in the transcript. */
  note?: string;
}

export interface Scenario {
  name: string;
  /** Config overrides merged over the defaults below. */
  config?: Record<string, unknown>;
  /** Extra seeding for the fake, chiefly voter account ages. */
  seed?: FakeSeed;
  steps: ScenarioStep[];
}

export interface TranscriptEntry {
  at: string;
  what: string;
  status: number;
  summary: string;
}

export interface ReplayResult {
  scenario: string;
  config: FrameworkConfig;
  transcript: TranscriptEntry[];
  github: FakeGitHub;
  store: MemoryStore;
  snapshot: VoteSnapshot | null;
  tally: TallyResult | null;
  leaderboard: Leaderboard | null;
  /** The results comment as it would appear in the Discussion. */
  resultsMarkdown: string | null;
}

function sign(body: string): string {
  return `sha256=${createHmac("sha256", REPLAY_WEBHOOK_SECRET).update(body).digest("hex")}`;
}

/**
 * Apply a delivery to the fake the way GitHub's own state would move, so later
 * REST reads (listIssuesByLabel, listDiscussionComments) see what the webhook
 * announced.
 */
export function applyPayloadToFake(github: FakeGitHub, event: string, payload: any): void {
  if (event === "issues") {
    const raw = payload.issue;
    if (!raw) return;
    const labels: string[] = (raw.labels ?? []).map((l: any) =>
      typeof l === "string" ? l : l.name,
    );
    const contribution: ContributionIssue = {
      id: raw.node_id,
      number: raw.number,
      title: raw.title,
      body: raw.body ?? "",
      labels,
      author: raw.user?.login ?? "unknown",
      createdAt: raw.created_at,
    };
    const existing = github.issues.findIndex((i) => i.number === raw.number);
    if (existing >= 0) github.issues[existing] = contribution;
    else github.issues.push(contribution);
    return;
  }

  if (event === "discussion_comment") {
    const raw = payload.comment;
    if (!raw) return;
    github.discussionComments.push({
      id: raw.node_id ?? String(raw.id),
      author: raw.user?.login ?? "unknown",
      body: raw.body ?? "",
      createdAt: raw.created_at,
    });
  }
}

const DEFAULT_CONFIG = {
  community: "The ZAO",
  cycleNoun: "Period",
  github: {
    owner: "ZAODEVZ",
    repo: "ZAOfractal",
    issueLabel: "period-{N}-contribution",
    discussionCategory: "Fractal Sessions",
  },
  sessionSchedule: {
    startDay: "Monday",
    startTime: "18:00",
    timezone: "America/New_York",
    epochDate: "2026-08-24T18:00:00-04:00",
    epochWeekNumber: 110,
  },
  ranking: { algorithm: "borda", minVoters: 3, minAccountAgeDays: 14 },
  contributionCriteria: [
    { label: "Vision", description: "Long-term thinking" },
    { label: "Contribution", description: "Work shipped" },
    { label: "Collaboration", description: "Helped others" },
    { label: "Innovation", description: "New ideas" },
    { label: "Onboarding", description: "Brought people in" },
  ],
};

function mergeConfig(overrides?: Record<string, unknown>): FrameworkConfig {
  const merged: Record<string, any> = { ...DEFAULT_CONFIG, ...(overrides ?? {}) };
  for (const key of ["github", "sessionSchedule", "ranking"]) {
    merged[key] = { ...(DEFAULT_CONFIG as any)[key], ...((overrides as any)?.[key] ?? {}) };
  }
  return normalizeConfig(merged);
}

export async function runScenario(
  scenario: Scenario,
  options: { fixtureDir?: string } = {},
): Promise<ReplayResult> {
  const fixtureDir = options.fixtureDir ?? "fixtures/webhooks";
  const config = mergeConfig(scenario.config);
  const github = new FakeGitHub(scenario.seed ?? {});
  const store = new MemoryStore();

  let clock = new Date(scenario.steps[0]?.at ?? new Date().toISOString());
  const deps: Deps = { config, client: github, store, now: () => clock };
  const app = createApp(async () => deps);

  const env = {
    GITHUB_WEBHOOK_SECRET: REPLAY_WEBHOOK_SECRET,
    FRAPP_GH_CRON_SECRET: REPLAY_CRON_SECRET,
  };

  const transcript: TranscriptEntry[] = [];
  let tally: TallyResult | null = null;

  for (const step of scenario.steps) {
    clock = new Date(step.at);

    if (step.cycle) {
      const res = await app.request(
        `/api/v1/cycle/${step.cycle}`,
        { method: "POST", headers: { "x-frapp-gh-secret": REPLAY_CRON_SECRET } },
        env,
      );
      const body: any = await res.json();
      if (step.cycle === "tally" && body.data?.ranked) tally = body.data as TallyResult;
      transcript.push({
        at: step.at,
        what: `cycle:${step.cycle}`,
        status: res.status,
        summary: body.message ?? JSON.stringify(body),
      });
      continue;
    }

    if (!step.webhook || !step.payload) {
      transcript.push({ at: step.at, what: "noop", status: 0, summary: step.note ?? "" });
      continue;
    }

    const payload = JSON.parse(readFileSync(join(fixtureDir, step.payload), "utf-8"));
    const body = JSON.stringify(payload);

    // GitHub's own state moves first; then the delivery reaches the handler.
    applyPayloadToFake(github, step.webhook, payload);

    const res = await app.request(
      "/webhook/github",
      {
        method: "POST",
        headers: { "x-github-event": step.webhook, "x-hub-signature-256": sign(body) },
        body,
      },
      env,
    );
    const outcome: any = await res.json();
    transcript.push({
      at: step.at,
      what: `${step.webhook}.${payload.action ?? "event"}`,
      status: res.status,
      summary: outcome.detail ?? outcome.error ?? (outcome.pong ? "pong" : JSON.stringify(outcome)),
    });
  }

  const period = Math.max(
    ...[...store.weeks.keys(), ...store.snapshots.keys(), 0].filter((n) => Number.isFinite(n)),
  );
  const results = github.postedDiscussionComments.filter((c) => c.body.includes("Results"));

  return {
    scenario: scenario.name,
    config,
    transcript,
    github,
    store,
    snapshot: store.snapshots.get(period) ?? null,
    tally,
    leaderboard: store.leaderboard,
    resultsMarkdown: results.at(-1)?.body ?? null,
  };
}

export function loadScenario(path: string): Scenario {
  return JSON.parse(readFileSync(path, "utf-8")) as Scenario;
}
