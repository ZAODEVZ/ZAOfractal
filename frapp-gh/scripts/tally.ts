#!/usr/bin/env tsx
/**
 * Offline tally: run the aggregation over a snapshot JSON without touching
 * GitHub. Useful for checking a week's math or comparing algorithms.
 *
 *   tsx scripts/tally.ts .github/frapp-gh/vote-snapshots/week-52.json [--method borda|median-of-medians]
 */
import { readFileSync } from "node:fs";
import { bordaCount, medianOfMedians } from "../src/lib/borda-count.js";
import { loadConfigFromDisk } from "../src/lib/config-loader.js";
import { assignRespect, buildRespectMap, totalRespect } from "../src/lib/respect-scorer.js";
import type { ContributionIssue, VoteSnapshot } from "../src/lib/types.js";

const [, , snapshotPath, ...rest] = process.argv;
if (!snapshotPath) {
  console.error("Usage: tsx scripts/tally.ts <snapshot.json> [--method borda|median-of-medians]");
  process.exit(2);
}

const methodFlag = rest.indexOf("--method");
const config = loadConfigFromDisk();
const method =
  methodFlag > -1 ? (rest[methodFlag + 1] as "borda" | "median-of-medians") : config.ranking.algorithm;

const snapshot = JSON.parse(readFileSync(snapshotPath, "utf-8")) as VoteSnapshot;
const voters = Object.values(snapshot.voters).filter(
  (v) => !v.rejected && v.ranking.issueNumbers.length > 0,
);

const issues = new Map<number, ContributionIssue>(
  snapshot.ballot.map((number) => [
    number,
    {
      id: String(number),
      number,
      title: `#${number}`,
      body: "",
      labels: [],
      author: "unknown",
      createdAt: snapshot.snapshotTimestamp,
    },
  ]),
);

const input = { ballot: snapshot.ballot, voters };
const scored =
  method === "median-of-medians"
    ? medianOfMedians(input, { breakoutSize: config.ranking.breakoutSize, seed: snapshot.week })
    : bordaCount(input);

const ranked = assignRespect(scored, issues, config.ranking);
const respect = buildRespectMap(ranked);

console.log(`Week ${snapshot.week} - ${method} - ${voters.length} ballots\n`);
for (const entry of ranked) {
  console.log(
    `${String(entry.rank).padStart(2)}. #${entry.issueNumber}  score=${entry.score
      .toFixed(2)
      .padStart(6)}  respect=${entry.respectAwarded}`,
  );
}
console.log(`\nTotal Respect: ${totalRespect(respect)}`);
