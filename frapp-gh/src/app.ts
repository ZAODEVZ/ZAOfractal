import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { parseConfig, CONFIG_FILENAME } from "./lib/config-loader.js";
import type { FrameworkConfig } from "./lib/types.js";
import { createOctokit, OctokitGitHubClient, type GitHubClient } from "./lib/github-api.js";
import { GitHubStore, type Store } from "./lib/storage.js";
import {
  openSession,
  snapshotVotes,
  tallyResults,
  refreshLeaderboard,
  type CycleContext,
} from "./handlers/cron-handlers.js";
import {
  handleDiscussionCommentEvent,
  handleInstallationEvent,
  handleIssueEvent,
  verifySignature,
} from "./handlers/webhook-handlers.js";
import { cycleWindow, phaseFor } from "./lib/week.js";

export interface Env {
  GITHUB_TOKEN?: string;
  GITHUB_APP_ID?: string;
  GITHUB_APP_PRIVATE_KEY?: string;
  GITHUB_APP_INSTALLATION_ID?: string;
  GITHUB_WEBHOOK_SECRET?: string;
  /** Shared secret required by the cron endpoints. */
  FRAPP_GH_CRON_SECRET?: string;
  /** Inline config JSON. Overrides the copy committed to the repo. */
  FRAPP_GH_CONFIG?: string;
  FRAPP_GH_OWNER?: string;
  FRAPP_GH_REPO?: string;
}

export interface Deps {
  config: FrameworkConfig;
  client: GitHubClient;
  store: Store;
  /** Injectable clock. The replay harness drives this to move through a period. */
  now?: () => Date;
}

/** Test seam: hand the app a fake GitHub and store instead of the network. */
export type DepsFactory = (env: Env) => Promise<Deps>;

export async function defaultDeps(env: Env): Promise<Deps> {
  const octokit = createOctokit(env);
  const owner = env.FRAPP_GH_OWNER;
  const repo = env.FRAPP_GH_REPO;

  let config: FrameworkConfig;
  if (env.FRAPP_GH_CONFIG) {
    config = parseConfig(env.FRAPP_GH_CONFIG);
  } else {
    if (!owner || !repo) {
      throw new Error(
        "Set FRAPP_GH_CONFIG, or FRAPP_GH_OWNER + FRAPP_GH_REPO so the config can be read from the repo.",
      );
    }
    const bootstrap = new OctokitGitHubClient({ owner, repo, octokit });
    const file = await bootstrap.getFile(CONFIG_FILENAME);
    if (!file) throw new Error(`${owner}/${repo} has no ${CONFIG_FILENAME}`);
    config = parseConfig(file.content);
  }

  const client = new OctokitGitHubClient({
    owner: config.github.owner,
    repo: config.github.repo,
    octokit,
  });
  return { config, client, store: new GitHubStore(client) };
}

function cycleContext(deps: Deps, dryRun = false): CycleContext {
  return { ...deps, now: deps.now?.() ?? new Date(), dryRun };
}

function requireCronSecret(env: Env, header: string | undefined): boolean {
  if (!env.FRAPP_GH_CRON_SECRET) return false;
  return header === env.FRAPP_GH_CRON_SECRET;
}

export function createApp(depsFactory: DepsFactory = defaultDeps) {
  const app = new Hono<{ Bindings: Env }>();

  app.use("*", logger());
  app.use("/api/*", cors({ origin: "*", allowMethods: ["GET", "POST", "OPTIONS"] }));

  app.get("/health", (c) => c.json({ ok: true, service: "frapp-gh", phase: 1 }));

  // --- GitHub webhook ------------------------------------------------------
  app.post("/webhook/github", async (c) => {
    const env = c.env ?? (process.env as unknown as Env);
    const raw = await c.req.text();
    const secret = env.GITHUB_WEBHOOK_SECRET;

    if (!secret) return c.json({ error: "GITHUB_WEBHOOK_SECRET is not configured" }, 500);
    const valid = await verifySignature(raw, c.req.header("x-hub-signature-256"), secret);
    if (!valid) return c.json({ error: "bad signature" }, 401);

    const event = c.req.header("x-github-event") ?? "";
    const payload = JSON.parse(raw);
    if (event === "ping") return c.json({ ok: true, pong: true });

    const deps = await depsFactory(env);
    const ctx = { ...deps, now: deps.now?.() ?? new Date() };

    try {
      if (event === "issues") return c.json(await handleIssueEvent(ctx, payload));
      if (event === "discussion_comment") {
        return c.json(await handleDiscussionCommentEvent(ctx, payload));
      }
      if (event === "installation" || event === "installation_repositories") {
        return c.json(await handleInstallationEvent(ctx, payload));
      }
      return c.json({ handled: false, action: event, detail: "unsubscribed event" });
    } catch (err) {
      console.error("[frapp-gh] webhook error", err);
      // 200 keeps GitHub from retrying a payload we will fail on again.
      return c.json({ handled: false, error: (err as Error).message });
    }
  });

  // --- Cycle endpoints (cron-triggered) -----------------------------------
  const cronRoutes = [
    ["open", openSession],
    ["snapshot", snapshotVotes],
    ["tally", tallyResults],
  ] as const;

  for (const [name, handler] of cronRoutes) {
    app.post(`/api/v1/cycle/${name}`, async (c) => {
      const env = c.env ?? (process.env as unknown as Env);
      if (!requireCronSecret(env, c.req.header("x-frapp-gh-secret"))) {
        return c.json({ error: "unauthorized" }, 401);
      }
      const week = c.req.query("week") ? Number(c.req.query("week")) : undefined;
      const dryRun = c.req.query("dryRun") === "true";
      const deps = await depsFactory(env);
      const result = await handler(cycleContext(deps, dryRun), week);
      return c.json(result, result.ok ? 200 : 409);
    });
  }

  // --- Read endpoints ------------------------------------------------------
  app.get("/api/v1/status", async (c) => {
    const env = c.env ?? (process.env as unknown as Env);
    const deps = await depsFactory(env);
    const { config, store } = deps;
    const now = deps.now?.() ?? new Date();
    const window = cycleWindow(config, now);
    const state = await store.readWeekState(window.weekNumber);
    return c.json({
      community: config.community,
      week: window.weekNumber,
      phase: phaseFor(config, now),
      opensAt: window.opensAt.toISOString(),
      voteCloseAt: window.voteCloseAt.toISOString(),
      tallyAt: window.tallyAt.toISOString(),
      algorithm: config.ranking.algorithm,
      respectScores: config.ranking.respectScores,
      state,
    });
  });

  app.get("/api/v1/votes/:week", async (c) => {
    const env = c.env ?? (process.env as unknown as Env);
    const { store } = await depsFactory(env);
    const snapshot = await store.readSnapshot(Number(c.req.param("week")));
    if (!snapshot) return c.json({ error: "no snapshot for that week" }, 404);
    return c.json(snapshot);
  });

  app.get("/api/v1/weeks/:week", async (c) => {
    const env = c.env ?? (process.env as unknown as Env);
    const { store } = await depsFactory(env);
    const state = await store.readWeekState(Number(c.req.param("week")));
    if (!state) return c.json({ error: "no state for that week" }, 404);
    return c.json(state);
  });

  app.get("/api/v1/leaderboard", async (c) => {
    const env = c.env ?? (process.env as unknown as Env);
    const deps = await depsFactory(env);
    const cached = await deps.store.readLeaderboard();
    if (cached) return c.json(cached);
    await refreshLeaderboard(cycleContext(deps));
    return c.json((await deps.store.readLeaderboard()) ?? { entries: [] });
  });

  app.onError((err, c) => {
    console.error("[frapp-gh]", err);
    return c.json({ error: err.message }, 500);
  });

  return app;
}

export const app = createApp();
