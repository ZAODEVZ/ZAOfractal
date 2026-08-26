/**
 * Core types for Frapp-GH Phase 1 (async ranking, no on-chain).
 * Mirrors section 8 of the PRD (research/06-frapp-gh-prd.md in ZAOfractal).
 */

export type ISO8601 = string;

export type Weekday =
  | "Sunday"
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday";

export type RankingAlgorithm = "borda" | "median-of-medians";

export type IdentityTier = "tier-1" | "tier-2" | "tier-3";

export interface SessionSchedule {
  /** Day the session opens and contributions start. */
  startDay: Weekday;
  /** 24h local time, e.g. "18:00". */
  startTime: string;
  /** IANA timezone, e.g. "America/New_York". */
  timezone: string;
  /** Length of a full cycle in days (typically 7). */
  cycleLength: number;
  /** Days after startDay when voting closes (default 5 = Saturday for a Monday start). */
  voteCloseOffsetDays?: number;
  /** Days after startDay when results are tallied (default 6 = Sunday for a Monday start). */
  tallyOffsetDays?: number;
  /** UTC instant when the reference week began, e.g. "2026-05-24T22:00:00Z". */
  epochDate?: ISO8601;
  /** Week number assigned to epochDate. Later weeks count up from it. */
  epochWeekNumber?: number;
}

export interface RankingConfig {
  algorithm: RankingAlgorithm;
  /** Respect awarded by final rank position, e.g. 2x Fibonacci [110, 68, 42, 26, 16, 10]. */
  respectScores: number[];
  /** Tally refuses to run below this many eligible voters. */
  minVoters: number;
  voterEligibility: IdentityTier;
  /** Minimum GitHub account age in days for a vote to count (tier-1 sybil floor). */
  minAccountAgeDays?: number;
  /** Group size used by the median-of-medians algorithm. */
  breakoutSize?: number;
}

export interface GithubConfig {
  owner: string;
  repo: string;
  /** Label template; "{N}" is replaced by the week number. */
  issueLabel: string;
  discussionCategory: string;
  /** Optional Projects v2 board number used as the ranking surface. */
  projectNumber?: number;
  /**
   * Directory holding this tool inside the repo, e.g. "frapp-gh". The GitHub
   * contents API is repo-root-relative, so anything written through it needs
   * this prefix. Empty when the tool is the repo.
   */
  pathPrefix?: string;
}

export interface OrdaoConfig {
  /** Phase 2 only. Phase 1 always treats this as disabled. */
  enabled: boolean;
  respectContractAddress?: string;
  orecContractAddress?: string;
  chainId?: number;
}

export interface ContributionCriterion {
  label: string;
  description: string;
}

export interface FrameworkConfig {
  community: string;
  /**
   * What this community calls one cycle, singular and capitalized.
   * ZAO says "Period" and numbers them on-chain; the default is "Week".
   * Internal field names stay week-shaped; this only changes what people read.
   */
  cycleNoun?: string;
  sessionSchedule: SessionSchedule;
  ranking: RankingConfig;
  github: GithubConfig;
  ordao?: OrdaoConfig;
  contributionCriteria: ContributionCriterion[];
  /** OG members. Phase 1 stores it; vote weighting is Phase 2. */
  seedList?: string[];
  /** Accounts whose votes and contributions are ignored (bots). */
  denyList?: string[];
  /** Soft = warn on malformed submissions. Hard = close them. */
  enforcement?: "soft" | "hard";
}

export type WeekStatus = "open" | "voting-closed" | "completed" | "archived";

export interface WeekState {
  weekNumber: number;
  status: WeekStatus;
  discussionId?: string;
  discussionNumber?: number;
  discussionUrl?: string;
  projectId?: string;
  projectUrl?: string;
  startedAt: ISO8601;
  votingClosedAt?: ISO8601;
  tallyCompletedAt?: ISO8601;
  contributionCount: number;
  voterCount: number;
  respectDistributed: Record<string, number>;
  tallyMethod?: RankingAlgorithm;
  /** Top contribution title per author, for leaderboard context. */
  contributionTitles?: Record<string, string>;
  /** Phase 2. */
  ordaoProposalId?: string;
}

export interface ContributionIssue {
  id: string;
  number: number;
  title: string;
  body: string;
  labels: string[];
  author: string;
  createdAt: ISO8601;
  /** Evidence links parsed out of the issue body. */
  evidence?: string[];
  criteria?: string[];
  finalRank?: number;
  respectAwarded?: number;
}

export interface VoterRanking {
  githubUsername: string;
  /** Account age in days at snapshot time. */
  accountAge: number;
  eligibleTier: IdentityTier;
  ranking: {
    /** Issue numbers, best first. */
    issueNumbers: number[];
  };
  submittedAt: ISO8601;
  /** Where the ranking came from. */
  source: "discussion-comment" | "project-board" | "manual";
  /** Set when the voter was excluded, with the reason. */
  rejected?: string;
}

export interface VoteSnapshot {
  week: number;
  snapshotTimestamp: ISO8601;
  discussionNumber?: number;
  /** Issue numbers eligible for ranking this week. */
  ballot: number[];
  voters: Record<string, VoterRanking>;
}

export interface RankedIssue {
  issueNumber: number;
  rank: number;
  score: number;
  author: string;
  title: string;
  respectAwarded: number;
  /** Issue numbers this entry is tied with after the primary score. */
  tiedWith?: number[];
}

export interface TallyResult {
  week: number;
  method: RankingAlgorithm;
  voterCount: number;
  contributionCount: number;
  ranked: RankedIssue[];
  respectDistributed: Record<string, number>;
  totalRespect: number;
  /** Voters dropped for eligibility or malformed ballots. */
  rejectedVoters: Array<{ username: string; reason: string }>;
  tallyCompletedAt: ISO8601;
}

export interface LeaderboardEntry {
  rank: number;
  githubUsername: string;
  totalRespect: number;
  weeksParticipated: number;
  recentActivity: Array<{
    week: number;
    respectAwarded: number;
    contribution: string;
  }>;
}

export interface Leaderboard {
  asOf: ISO8601;
  community: string;
  totalRespectDistributed: number;
  weeksCounted: number[];
  entries: LeaderboardEntry[];
}
