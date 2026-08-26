/**
 * The dashboard reads the committed snapshot in ../data, not a live API.
 *
 * scripts/pull-data.mjs writes those files from OP Mainnet; everything here is
 * a typed view over them plus the few derivations the tabs need. Nothing in
 * this module does I/O, so a tab never has a loading or offline state - if the
 * numbers look wrong, rerun the puller and read the diff.
 */

import summaryJson from '@data/summary.json';
import zorJson from '@data/zor-respect.json';
import ogJson from '@data/og-respect.json';
import awardsJson from '@data/award-events.json';
import periodsJson from '@data/periods.json';
import proposalsJson from '@data/orec-proposals.json';

export interface Holder {
  address: string;
  respect: number;
  awards?: number;
}

export interface AwardEvent {
  date: string;
  block: number;
  tx: string;
  recipient: string;
  periodNumber: number;
  groupNum: number | null;
  level: number | null;
  respect: number | null;
  mintType: number;
  tokenId: string;
}

export interface Period {
  periodNumber: number;
  date: string;
  groups: number;
  participants: number;
  awards: number;
  respect: number;
}

export interface Vote {
  voter: string;
  vote: 'Yes' | 'No' | 'None' | string;
  weight: number;
  block: number;
  at: string;
  tx: string;
}

export interface ProposalAction {
  target: string;
  call: string;
  memo: string;
  awards: { recipient: string; respect: number; periodNumber: number; mintType: number }[] | null;
  periodNumber: number | null;
  respectMinted: number | null;
  signalType: number | null;
  signalValue: number | null;
}

export interface Proposal {
  propId: string;
  createdAt: string | null;
  createdBlock: number | null;
  createdTx: string | null;
  executedAt?: string;
  executedTx?: string;
  stage: string;
  executed: boolean;
  executionFailed: boolean;
  canceled: boolean;
  yesWeight: number;
  noWeight: number;
  votes: Vote[];
  action?: ProposalAction;
}

export interface Summary {
  pulledAt: string;
  latestBlock: number;
  zor: {
    holders: number; awards: number; periodsRecorded: number;
    firstPeriod: number; latestPeriod: number;
    firstAward: string; latestAward: string;
    burns: number; respectMinted: number; respectBurned: number;
    respectHeld: number; reconciliationResidual: number;
  };
  og: {
    holders: number; treasury: string; transfers: number; mints: number;
    distributions: number; recipients: number; respectHeld: number;
    reconciliationResidual: number; firstDistribution: string;
    latestDistribution: string; totalSupply: number;
  };
  orec: {
    config: { voteLen: string; vetoLen: string; minWeight: string; respectContract: string; owner: string };
    proposals: number; executed: number; failed: number; canceled: number;
    byStage: Record<string, number>;
    respectMintingProposals: number;
    firstProposal: string; latestProposal: string;
  };
}

export const summary = summaryJson as Summary;
export const zorHolders = (zorJson as { holders: Holder[] }).holders;
export const ogHolders = (ogJson as { holders: Holder[] }).holders;
export const ogTreasury = (ogJson as { treasury: string }).treasury;
export const awardEvents = (awardsJson as { events: AwardEvent[] }).events;
export const periods = (periodsJson as { periods: Period[] }).periods;
export const proposals = (proposalsJson as { proposals: Proposal[] }).proposals;

/** Weekly sessions, newest first, with the stray period-0 mint dropped - it is
 * a single one-off award, not a Respect Game. */
export const sessions: Period[] = periods
  .filter((p) => p.periodNumber > 0)
  .slice()
  .sort((a, b) => b.periodNumber - a.periodNumber);

/** Every award in one weekly session, ordered by group then by rank. */
export function awardsForPeriod(periodNumber: number): AwardEvent[] {
  return awardEvents
    .filter((a) => a.periodNumber === periodNumber)
    .sort((a, b) => (a.groupNum ?? 0) - (b.groupNum ?? 0) || (b.respect ?? 0) - (a.respect ?? 0));
}

/** One member's full award history, newest first. */
export function awardsForMember(address: string): AwardEvent[] {
  const key = address.toLowerCase();
  return awardEvents
    .filter((a) => a.recipient.toLowerCase() === key)
    .sort((a, b) => b.block - a.block);
}

/** How many consecutive weekly periods run back from the latest one. A gap in
 * the period numbers breaks the streak, which is the honest way to count it. */
export function currentStreak(): number {
  const nums = sessions.map((p) => p.periodNumber);
  let streak = 0;
  for (let i = 0; i < nums.length; i++) {
    if (i > 0 && nums[i] !== nums[i - 1] - 1) break;
    streak++;
  }
  return streak;
}

/** Period numbers missing from the ZOR ledger between its first and last. */
export function periodGaps(): number[] {
  const nums = sessions.map((p) => p.periodNumber).sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let n = nums[0]; n < nums[nums.length - 1]; n++) {
    if (!nums.includes(n)) gaps.push(n);
  }
  return gaps;
}

/** Everyone who has ever held Respect on either ledger. */
export function allMembers(): { address: string; zor: number; og: number; awards: number }[] {
  const map = new Map<string, { address: string; zor: number; og: number; awards: number }>();
  const touch = (address: string) => {
    const key = address.toLowerCase();
    if (!map.has(key)) map.set(key, { address: key, zor: 0, og: 0, awards: 0 });
    return map.get(key)!;
  };
  for (const h of zorHolders) {
    const m = touch(h.address);
    m.zor = h.respect;
    m.awards = h.awards ?? 0;
  }
  for (const h of ogHolders) touch(h.address).og = h.respect;
  return [...map.values()];
}

export const proposalsNewestFirst = proposals
  .slice()
  .sort((a, b) => (b.createdBlock ?? 0) - (a.createdBlock ?? 0));
