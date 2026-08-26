#!/usr/bin/env tsx
/**
 * Cycle runner used by the GitHub Actions workflows.
 *
 *   tsx scripts/cycle.ts open|snapshot|tally|leaderboard [--week N] [--dry-run]
 *
 * Reads and writes state in the checked-out repo (FsStore); the workflow
 * commits the result. Auth comes from GITHUB_TOKEN.
 */
import { loadConfigFromDisk } from "../src/lib/config-loader.js";
import { createOctokit, OctokitGitHubClient } from "../src/lib/github-api.js";
import { FsStore } from "../src/lib/storage.js";
import {
  openSession,
  refreshLeaderboard,
  snapshotVotes,
  tallyResults,
  type CycleContext,
} from "../src/handlers/cron-handlers.js";

type Command = "open" | "snapshot" | "tally" | "leaderboard";

function parseArgs(argv: string[]) {
  const command = argv[2] as Command | undefined;
  const weekFlag = argv.indexOf("--week");
  return {
    command,
    week: weekFlag > -1 ? Number(argv[weekFlag + 1]) : undefined,
    dryRun: argv.includes("--dry-run"),
  };
}

async function main() {
  const { command, week, dryRun } = parseArgs(process.argv);
  if (!command || !["open", "snapshot", "tally", "leaderboard"].includes(command)) {
    console.error("Usage: tsx scripts/cycle.ts open|snapshot|tally|leaderboard [--week N] [--dry-run]");
    process.exit(2);
  }

  const config = loadConfigFromDisk();
  const octokit = createOctokit(process.env);
  const client = new OctokitGitHubClient({
    owner: config.github.owner,
    repo: config.github.repo,
    octokit,
  });
  const ctx: CycleContext = { config, client, store: new FsStore(), now: new Date(), dryRun };

  const result =
    command === "open"
      ? await openSession(ctx, week)
      : command === "snapshot"
        ? await snapshotVotes(ctx, week)
        : command === "tally"
          ? await tallyResults(ctx, week)
          : await refreshLeaderboard(ctx);

  console.log(result.message);
  if (process.env.GITHUB_OUTPUT) {
    const { appendFileSync } = await import("node:fs");
    appendFileSync(process.env.GITHUB_OUTPUT, `ok=${result.ok}\nweek=${result.week}\n`);
  }
  if (!result.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
