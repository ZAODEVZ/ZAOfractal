// Live ZAO Fractal numbers, read from ornode at build time.
//
// ornode (zao-ornode.frapps.xyz) is the public, keyless index of every OREC
// proposal behind zao.frapps.xyz. Every Respect award is a proposal whose
// calldata names its recipients, so walking the proposal list gives who has
// been awarded and in which meeting, with no name lookup and no chain RPC.
//
// The read follows zao-fractal-bot PR #37 (web/lib/fractalData.ts, MIT, same
// owner): POST /v1/getProposals, paged by a timestamp cursor. The calldata is
// decoded by hand below, for the two selectors ornode carries, so the site
// needs no new dependency. Nothing is copied from ordao or orfrapps.
//
// A failed read gives no number, never a stale or zero one: the Hero and home
// page show nothing rather than something that looks real. Wire-up is P3/P4.

export const ORNODE_URL = 'https://zao-ornode.frapps.xyz';
/** The ZOR Respect contract on Optimism, the target of every award proposal. */
export const ZOR_RESPECT_ADDRESS = '0x9885CCeEf7E8371Bf8d6f2413723D25917E7445c';

// ornode caps `limit` at 50 with no error and pages newest first by createTs,
// strictly below `before` (probed in zao-fractal-bot, 2026-09-29).
const PAGE = 25;
const WIDE = 50;
const TIMEOUT_MS = 15_000;

/** mintRespectGroup((uint256 id, uint64 value)[], bytes) */
const SEL_GROUP = '5da7e1d4';
/** mintRespect((uint256 id, uint64 value), bytes) */
const SEL_SINGLE = 'dfd469ed';
/** Award ids pack the meeting as period + 1 (zao-fractal-bot awardVerification.ts). */
const PERIOD_MEETING_OFFSET = 1;

export interface OrnodeProposal {
  id: string;
  content?: { addr: string; cdata: string };
  attachment?: { propType?: string };
  createTs: number;
  status: string;
}

export interface Award {
  wallet: string;
  value: number;
  meeting: number;
}

/** A number and the date it was read. null means the read failed: show nothing. */
export interface LiveNumber {
  value: number;
  /** YYYY-MM-DD, UTC, the day of the build that read it. */
  readOn: string;
}

export interface FractalLive {
  /** Wallets that have received Respect in at least one executed award. Pending awards do not count until they land. */
  members: LiveNumber | null;
  /**
   * The highest meeting number with an award proposal that did not fail: the
   * session count by the fractal's own numbering. Not executed-only, because a
   * session's awards stay NotExecuted for days while votes run (on 2026-11-01
   * the executed high was 119 while 120 and 121 had been held).
   */
  sessionsHeld: LiveNumber | null;
  /** Why the read failed, for the build log. null when it worked. */
  error: string | null;
}

const word = (hex: string, i: number) => hex.slice(i * 64, i * 64 + 64);
const big = (w: string) => BigInt('0x' + w);

function unpack(id: bigint, value: bigint): Award {
  const wallet = '0x' + (id & ((1n << 160n) - 1n)).toString(16).padStart(40, '0');
  const period = Number((id >> 160n) & ((1n << 64n) - 1n));
  return { wallet, value: Number(value), meeting: period + PERIOD_MEETING_OFFSET };
}

/** Recipients of one award proposal, or [] for anything that is not an award to ZOR. */
export function decodeAwards(p: OrnodeProposal): Award[] {
  if (!p.content || p.content.addr.toLowerCase() !== ZOR_RESPECT_ADDRESS.toLowerCase()) return [];
  const data = p.content.cdata.toLowerCase().replace(/^0x/, '');
  const sel = data.slice(0, 8);
  const args = data.slice(8);
  try {
    if (sel === SEL_SINGLE) {
      return [unpack(big(word(args, 0)), big(word(args, 1)))];
    }
    if (sel === SEL_GROUP) {
      const at = Number(big(word(args, 0))) / 32; // offset of the array, in words
      const n = Number(big(word(args, at)));
      if (!Number.isSafeInteger(n) || n < 0 || n > 10_000) return [];
      const out: Award[] = [];
      for (let i = 0; i < n; i++) {
        const id = word(args, at + 1 + 2 * i);
        const value = word(args, at + 2 + 2 * i);
        if (id.length !== 64 || value.length !== 64) return [];
        out.push(unpack(big(id), big(value)));
      }
      return out;
    }
  } catch {
    return [];
  }
  return [];
}

export type FetchPage = (spec: { limit: number; before?: number }) => Promise<OrnodeProposal[]>;

/**
 * Every proposal, newest first. ornode's cursor is a timestamp, and timestamps
 * are not unique, so each page re-reads the oldest second and skips ids already
 * seen. A full page that adds nothing is re-read wide once; if that is full and
 * adds nothing too, completeness cannot be shown and this throws rather than
 * return a short list as everything.
 */
export async function readAllProposals(fetchPage: FetchPage, pageSize = PAGE, wide = WIDE): Promise<OrnodeProposal[]> {
  const seen = new Map<string, OrnodeProposal>();
  const absorb = (page: OrnodeProposal[]) => {
    let added = 0;
    for (const p of page) if (!seen.has(p.id)) (seen.set(p.id, p), added++);
    return added;
  };
  const oldest = (page: OrnodeProposal[]) => Math.min(...page.map((p) => p.createTs));
  let before: number | undefined;
  for (;;) {
    const cursor = before === undefined ? {} : { before };
    let limit = pageSize;
    let page = await fetchPage({ limit, ...cursor });
    let added = absorb(page);
    if (page.length === limit && added === 0) {
      limit = wide;
      page = await fetchPage({ limit, ...cursor });
      added = absorb(page);
      if (page.length === limit && added === 0) {
        throw new Error(`at least ${limit} proposals share createTs ${oldest(page)}; cannot show the list is complete`);
      }
    }
    if (page.length < limit) {
      // A short page is the end only if the server honoured the limit.
      if (page.length > 0) {
        const older = await fetchPage({ limit: 1, before: oldest(page) });
        if (older.length > 0) throw new Error(`ornode returned ${page.length} of ${limit} yet older proposals exist`);
      }
      break;
    }
    before = oldest(page) + 1;
  }
  return [...seen.values()];
}

/** The two numbers from a proposal list. Pure, so it is testable without a network. */
export function summarise(proposals: OrnodeProposal[]): { members: number; sessionsHeld: number } {
  const wallets = new Set<string>();
  let latest = 0;
  for (const p of proposals) {
    if (p.status === 'ExecutionFailed') continue;
    for (const a of decodeAwards(p)) {
      if (p.status === 'Executed') wallets.add(a.wallet);
      if (a.meeting > latest) latest = a.meeting;
    }
  }
  return { members: wallets.size, sessionsHeld: latest };
}

async function ornodePage(spec: { limit: number; before?: number }): Promise<OrnodeProposal[]> {
  const res = await fetch(`${ORNODE_URL}/v1/getProposals`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ spec }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`ornode getProposals: HTTP ${res.status}`);
  const body = (await res.json()) as { proposals?: OrnodeProposal[] };
  if (!Array.isArray(body.proposals)) throw new Error('ornode getProposals: no proposals array');
  return body.proposals;
}

let cached: Promise<FractalLive> | undefined;

/**
 * Members and sessions held, read once per build (every page that asks shares
 * the one read). Never throws: a failure is `null` numbers plus `error`.
 */
export function getFractalLive(fetchPage: FetchPage = ornodePage, now: Date = new Date()): Promise<FractalLive> {
  if (fetchPage === ornodePage && cached) return cached;
  const run = (async (): Promise<FractalLive> => {
    const readOn = now.toISOString().slice(0, 10);
    try {
      const proposals = await readAllProposals(fetchPage);
      // The record is never empty; an empty answer is a broken read, and 0 would look real.
      if (proposals.length === 0) throw new Error('ornode returned no proposals');
      const s = summarise(proposals);
      if (s.members === 0 || s.sessionsHeld === 0) throw new Error('no executed award decoded; refusing a zero');
      return { members: { value: s.members, readOn }, sessionsHeld: { value: s.sessionsHeld, readOn }, error: null };
    } catch (e) {
      return { members: null, sessionsHeld: null, error: e instanceof Error ? e.message : String(e) };
    }
  })();
  if (fetchPage === ornodePage) cached = run;
  return run;
}
