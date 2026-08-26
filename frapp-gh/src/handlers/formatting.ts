import type {
  ContributionIssue,
  FrameworkConfig,
  Leaderboard,
  TallyResult,
  VoteSnapshot,
} from "../lib/types.js";
import type { CycleWindow } from "../lib/week.js";
import { formatCycleRange, formatInstant } from "../lib/week.js";
import { weekLabel } from "../lib/config-loader.js";

export const BOT_MARKER = "<!-- frapp-gh -->";

/** What one cycle is called in this community. ZAO: "Period". Default: "Week". */
export function cycleNoun(config: FrameworkConfig): string {
  return config.cycleNoun?.trim() || "Week";
}

export function sessionTitle(week: number, config?: FrameworkConfig): string {
  const noun = config ? cycleNoun(config) : "Week";
  return `${noun} ${week} Fractal Session`;
}

export function projectTitle(week: number, config?: FrameworkConfig): string {
  const noun = config ? cycleNoun(config) : "Week";
  return `Fractal ${noun} ${week} Ranking`;
}

/** The pinned session Discussion body: rules, dates, criteria. */
export function renderSessionBody(config: FrameworkConfig, window: CycleWindow): string {
  const tz = config.sessionSchedule.timezone;
  const label = weekLabel(config, window.weekNumber);
  const noun = cycleNoun(config);
  const criteria = config.contributionCriteria
    .map((c) => `- **${c.label}** - ${c.description}`)
    .join("\n");

  return `${BOT_MARKER}
# ${sessionTitle(window.weekNumber, config)} (${formatCycleRange(window, tz)})

Async Respect Game for **${config.community}**. No call required - everything happens in this repo.

## How this works

1. **Submit (now until ${formatInstant(window.voteCloseAt, tz)})**
   Open an Issue describing what you shipped, and label it \`${label}\`.
   Title: what you did. Body: a short summary plus an evidence link (PR, commit, doc, screenshot).

2. **Rank (until ${formatInstant(window.tallyAt, tz)})**
   Reply in this Discussion with your ranking, best first:

   \`\`\`
   /rank #12 #4 #7 #3
   \`\`\`

   A numbered list works too. You may rank a subset; unranked contributions share the leftover
   positions. Edit by posting again - your latest comment wins. Do not rank your own contribution
   above others out of habit; peers can see every ballot in the committed snapshot.

3. **Results (${formatInstant(window.tallyAt, tz)})**
   Rankings are aggregated with **${config.ranking.algorithm}** and Respect is posted here.

## Respect curve

${config.ranking.respectScores.map((n, i) => `Rank ${i + 1} = ${n}`).join(" | ")}

## Contribution criteria

${criteria || "_(none configured)_"}

## Eligibility

- Voters need a GitHub account at least ${config.ranking.minAccountAgeDays ?? 14} days old.
- Minimum ${config.ranking.minVoters} voters, or the ${noun.toLowerCase()} does not tally.
- Bots do not vote.

_Frapp-GH Phase 1 - ranking is off-chain. Nothing here mints tokens._`;
}

export function renderSubmissionAck(
  config: FrameworkConfig,
  week: number,
  issue: ContributionIssue,
  problems: string[],
): string {
  const header = `${BOT_MARKER}\nLogged **#${issue.number}** as a ${cycleNoun(config)} ${week} contribution by @${issue.author}.`;
  if (problems.length === 0) {
    return `${header}\n\nEvidence found: ${
      (issue.evidence ?? []).map((e) => `\`${e}\``).join(", ") || "none"
    }. It will appear on the ranking ballot when voting opens.`;
  }
  return `${header}\n\nBefore voting closes, please tidy this up:\n\n${problems
    .map((p) => `- ${p}`)
    .join("\n")}\n\nThe contribution still counts - this is a nudge, not a rejection.`;
}

export function renderVotingClosed(snapshot: VoteSnapshot, config: FrameworkConfig): string {
  const voters = Object.values(snapshot.voters);
  const accepted = voters.filter((v) => !v.rejected);
  const rejected = voters.filter((v) => v.rejected);

  let out = `${BOT_MARKER}\n## Voting closed for ${cycleNoun(config).toLowerCase()} ${snapshot.week}\n\n`;
  out += `Ballots counted: **${accepted.length}** (minimum ${config.ranking.minVoters})\n`;
  out += `Contributions on the ballot: **${snapshot.ballot.length}**\n\n`;
  if (accepted.length > 0) {
    out += `| Voter | Placed | Source |\n|---|---|---|\n`;
    for (const v of accepted) {
      out += `| @${v.githubUsername} | ${v.ranking.issueNumbers.length} | ${v.source} |\n`;
    }
    out += "\n";
  }
  if (rejected.length > 0) {
    out += `Not counted:\n\n${rejected
      .map((v) => `- @${v.githubUsername} - ${v.rejected}`)
      .join("\n")}\n\n`;
  }
  out += `Snapshot committed to \`.github/frapp-gh/vote-snapshots/week-${snapshot.week}.json\`. Results next.`;
  return out;
}

/** The results comment posted to the session Discussion. */
export function renderResults(result: TallyResult, config: FrameworkConfig): string {
  let out = `${BOT_MARKER}\n# ${cycleNoun(config)} ${result.week} Results\n\n`;
  out += `Tally method: **${result.method}** | Ballots counted: **${result.voterCount}** | Contributions: **${result.contributionCount}**\n\n`;
  out += `| Rank | Issue | Author | Respect | Contribution |\n|---|---|---|---|---|\n`;

  for (const entry of result.ranked) {
    const tie = entry.tiedWith?.length ? ` (tie-break vs ${entry.tiedWith.map((n) => `#${n}`).join(", ")})` : "";
    out += `| ${entry.rank} | #${entry.issueNumber} | @${entry.author} | ${entry.respectAwarded} | ${entry.title}${tie} |\n`;
  }

  out += `\n**Total Respect distributed: ${result.totalRespect}**\n\n`;

  const zeroed = result.ranked.filter((r) => r.respectAwarded === 0);
  if (zeroed.length > 0) {
    out += `${zeroed.length} contribution(s) ranked below the Respect curve (${config.ranking.respectScores.length} paid places) and earned 0 this week.\n\n`;
  }
  if (result.rejectedVoters.length > 0) {
    out += `Ballots not counted:\n\n${result.rejectedVoters
      .map((v) => `- @${v.username} - ${v.reason}`)
      .join("\n")}\n\n`;
  }

  out += `Scores are rank sums - lower is better. Full ballots: \`.github/frapp-gh/vote-snapshots/week-${result.week}.json\`.\n\n`;
  out += `_Phase 1: off-chain only. No Respect tokens were minted._`;
  return out;
}

export function renderTallyFailure(
  week: number,
  reason: string,
  config?: FrameworkConfig,
): string {
  const noun = config ? cycleNoun(config) : "Week";
  return `${BOT_MARKER}\n## ${noun} ${week} did not tally\n\n${reason}\n\nNo Respect is awarded for this cycle. Contributions stay open - carry them into the next ${noun.toLowerCase()} if they were not ranked.`;
}

export function renderLeaderboardMarkdown(leaderboard: Leaderboard, limit = 25): string {
  let out = `# ${leaderboard.community} Respect Leaderboard\n\n`;
  out += `As of ${leaderboard.asOf} | ${leaderboard.weeksCounted.length} weeks | ${leaderboard.totalRespectDistributed} Respect distributed\n\n`;
  out += `| Rank | Member | Respect | Weeks |\n|---|---|---|---|\n`;
  for (const entry of leaderboard.entries.slice(0, limit)) {
    out += `| ${entry.rank} | @${entry.githubUsername} | ${entry.totalRespect} | ${entry.weeksParticipated} |\n`;
  }
  return out;
}
