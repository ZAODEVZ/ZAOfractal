// Typed views over the JSON that scripts/build-data.mjs bundles into the app.
import leaderboardJson from '../data/leaderboard.json';
import membersJson from '../data/members.json';
import proposalsJson from '../data/proposals.json';
import summaryJson from '../data/summary.json';

export interface ZorRow { a: string; r: number; n: number }
export interface OgRow { a: string; r: number }
export interface MemberAward { s: number; l: number | null; r: number | null; d: string }
export interface Member { z: number; o: number; h: MemberAward[] }
export interface Proposal {
  id: string;
  at: string;
  stage: string;
  yes: number;
  no: number;
  memo: string;
  call: string | null;
  period: number | null;
  minted: number | null;
  awards: { a: string; r: number }[];
  votes: { a: string; v: string; w: number }[];
  tx: string | null;
}
export interface Session { n: number; d: string; p: number; r: number }
export interface Summary {
  pulledAt: string;
  holders: number;
  ogHolders: number;
  awards: number;
  sessions: number;
  respect: number;
  ogRespect: number;
  proposals: number;
  executed: number;
  recent: Session[];
}

export const leaderboard = leaderboardJson as unknown as { zor: ZorRow[]; og: OgRow[] };
export const members = membersJson as unknown as Record<string, Member>;
export const proposals = proposalsJson as unknown as Proposal[];
export const summary = summaryJson as unknown as Summary;

export function proposalTitle(p: Proposal): string {
  if (p.period != null && p.minted != null) return `Respect awards for Fractal ${p.period}`;
  if (p.memo) return p.memo;
  if (p.call) return `Call: ${p.call}`;
  return `Proposal ${p.id.slice(0, 10)}`;
}
