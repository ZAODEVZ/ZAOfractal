#!/usr/bin/env tsx
/**
 * Replay a whole async period locally, against recorded webhook payloads.
 * No GitHub App, no network, no credentials.
 *
 *   tsx scripts/replay.ts                                  # the default scenario
 *   tsx scripts/replay.ts fixtures/scenarios/full-period.json
 *   tsx scripts/replay.ts <scenario> --results             # print the results comment too
 */
import { loadScenario, runScenario } from "../src/testing/replay.js";

const args = process.argv.slice(2);
const path = args.find((a) => !a.startsWith("--")) ?? "fixtures/scenarios/full-period.json";
const showResults = args.includes("--results");
const showTranscript = !args.includes("--quiet");

const scenario = loadScenario(path);
const result = await runScenario(scenario);

console.log(`\n${result.scenario}\n${"=".repeat(result.scenario.length)}\n`);

if (showTranscript) {
  for (const entry of result.transcript) {
    const when = entry.at.slice(0, 16).replace("T", " ");
    const code = entry.status === 0 ? "  -" : String(entry.status).padStart(3);
    console.log(`${when}  ${code}  ${entry.what.padEnd(28)} ${entry.summary}`);
  }
  console.log("");
}

if (result.snapshot) {
  const voters = Object.values(result.snapshot.voters);
  const counted = voters.filter((v) => !v.rejected);
  console.log(`Ballot: ${result.snapshot.ballot.map((n) => `#${n}`).join(" ")}`);
  console.log(`Ballots counted: ${counted.length} of ${voters.length}`);
  for (const v of voters) {
    const placed = v.ranking.issueNumbers.map((n) => `#${n}`).join(" ") || "(none)";
    console.log(`  ${v.rejected ? "x" : "+"} ${v.githubUsername.padEnd(10)} ${placed}${v.rejected ? `   [${v.rejected}]` : ""}`);
  }
  console.log("");
}

if (result.tally) {
  console.log(`Results (${result.tally.method}, ${result.tally.voterCount} ballots):`);
  for (const r of result.tally.ranked) {
    console.log(
      `  ${String(r.rank).padStart(2)}. #${String(r.issueNumber).padEnd(4)} @${r.author.padEnd(10)} ${String(
        r.respectAwarded,
      ).padStart(3)}  ${r.title}`,
    );
  }
  console.log(`\n  Total Respect: ${result.tally.totalRespect}`);
}

if (result.leaderboard) {
  console.log(`\nLeaderboard: ${result.leaderboard.entries.length} members, ${result.leaderboard.totalRespectDistributed} Respect`);
}

if (showResults && result.resultsMarkdown) {
  console.log(`\n--- Discussion comment as posted ---\n`);
  console.log(result.resultsMarkdown);
}

const failures = result.transcript.filter((t) => t.status >= 400);
if (failures.length > 0) {
  console.error(`\n${failures.length} step(s) failed:`);
  for (const f of failures) console.error(`  ${f.at} ${f.what} -> ${f.status} ${f.summary}`);
  process.exit(1);
}
