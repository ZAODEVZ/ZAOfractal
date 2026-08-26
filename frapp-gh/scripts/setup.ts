#!/usr/bin/env tsx
/**
 * One-time repo setup check. Verifies credentials, config, Discussions
 * category, and the week label, then prints what is missing.
 *
 *   tsx scripts/setup.ts
 */
import { loadConfigFromDisk, weekLabel } from "../src/lib/config-loader.js";
import { createOctokit, OctokitGitHubClient } from "../src/lib/github-api.js";
import { cycleWindow, formatInstant, phaseFor } from "../src/lib/week.js";

async function main() {
  const config = loadConfigFromDisk();
  const octokit = createOctokit(process.env);
  const client = new OctokitGitHubClient({
    owner: config.github.owner,
    repo: config.github.repo,
    octokit,
  });

  const now = new Date();
  const window = cycleWindow(config, now);
  const tz = config.sessionSchedule.timezone;

  console.log(`Community:   ${config.community}`);
  console.log(`Repo:        ${config.github.owner}/${config.github.repo}`);
  console.log(`Week:        ${window.weekNumber} (${phaseFor(config, now)})`);
  console.log(`Opens:       ${formatInstant(window.opensAt, tz)}`);
  console.log(`Vote close:  ${formatInstant(window.voteCloseAt, tz)}`);
  console.log(`Tally:       ${formatInstant(window.tallyAt, tz)}`);
  console.log(`Algorithm:   ${config.ranking.algorithm}`);
  console.log(`Respect:     ${config.ranking.respectScores.join(", ")}`);
  console.log(`Min voters:  ${config.ranking.minVoters}`);
  console.log("");

  const problems: string[] = [];

  const label = weekLabel(config, window.weekNumber);
  try {
    await client.ensureLabel(label, `Frapp-GH week ${window.weekNumber} contribution`, "5319E7");
    console.log(`[ok] label ${label}`);
  } catch (err) {
    problems.push(`label ${label}: ${(err as Error).message}`);
  }

  try {
    const existing = await client.findDiscussionByTitle(`Week ${window.weekNumber} Fractal Session`);
    console.log(
      existing
        ? `[ok] session discussion exists: ${existing.url}`
        : `[--] no session discussion yet (run: npm run cycle:open)`,
    );
  } catch (err) {
    problems.push(
      `Discussions unreachable - enable Discussions and create the "${config.github.discussionCategory}" category. ${(err as Error).message}`,
    );
  }

  if (!process.env.FRAPP_GH_CRON_SECRET) {
    problems.push("FRAPP_GH_CRON_SECRET is unset - the deployed cycle endpoints will reject calls.");
  }
  if (!process.env.GITHUB_WEBHOOK_SECRET) {
    problems.push("GITHUB_WEBHOOK_SECRET is unset - the deployed webhook will reject deliveries.");
  }

  if (problems.length === 0) {
    console.log("\nReady.");
    return;
  }
  console.log("\nTo fix:");
  for (const p of problems) console.log(`  - ${p}`);
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
