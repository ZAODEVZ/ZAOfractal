#!/usr/bin/env node
/**
 * verify-claims.mjs - re-check every number quoted in the respect/ docs and in
 * the whitepaper chapters against the committed snapshot.
 *
 * The respect/ decision docs - LEDGER-RECONCILIATION, SIGNER-COMMITTEE,
 * EXECUTION-RUNBOOK and FACILITATION-RUNBOOK - and the whitepaper chapters
 * under whitepaper/draft/ are full of hard figures. They go stale the moment someone runs scripts/pull-data.mjs
 * again. This script holds each quoted figure as an expectation and reports the
 * ones that have moved, so the docs get corrected rather than quietly drifting.
 *
 * A mismatch is not a failure of the data - it usually means the chain moved and
 * the prose needs an edit. Exit code is 1 when anything drifted, so this can sit
 * in a pre-commit hook or CI later.
 *
 * Usage:  node scripts/verify-claims.mjs
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => JSON.parse(readFileSync(join(ROOT, 'data', name), 'utf8'));

const summary = read('summary.json');
/** frapp-gh's config, read soft. A file outside data/ can be moved or renamed
 * by the lane that owns it, and a hard read would throw at load and take every
 * other check down with it - including the NOT-ASKED prose guards, which is
 * the last thing that should fail silently by failing loudly in the wrong
 * place. Missing config renders its claims 'unreadable' and drifts. */
const frappConfig = (() => {
  try {
    return JSON.parse(readFileSync(join(ROOT, 'frapp-gh', 'frapp-gh.config.json'), 'utf8'));
  } catch {
    return null;
  }
})();
const frapp = (path) => (frappConfig ? path(frappConfig) : 'unreadable');
const og = read('og-respect.json');
const zor = read('zor-respect.json');
const awards = read('award-events.json');
const periods = read('periods.json');
const members = read('members.json');
const proposals = read('orec-proposals.json');

/** Prose invariants. Everything else in this file guards a number; these guard
 * sentences that a decision rests on, and that a later pass could trim without
 * noticing what it was holding up.
 *
 * FACILITATION-RUNBOOK.md names three people for a role none of them has been
 * asked about. Zaal reconfirmed on 2026-08-26 that the names stay public. That
 * is defensible precisely because the document says, repeatedly and in its own
 * header, that being named is not being asked - so the disclaimer is not
 * decoration, it is the load-bearing part. And because the docs are CC BY 4.0,
 * which is perpetual and irrevocable, a softened copy cannot be recalled once
 * published. Hence a check rather than a hope. */
const docText = (name) => {
  try {
    return readFileSync(join(ROOT, name), 'utf8');
  } catch {
    // A deleted doc must fail as a drifted claim, not as a stack trace that
    // stops the other checks from running at all.
    return '';
  }
};

const lower = (a) => a.toLowerCase();
const MIN_WEIGHT = Number(BigInt(summary.orec.config.minWeight) / 10n ** 18n);

// --- derived views, matching the definitions the docs use --------------------

const ogBalance = new Map(og.holders.filter((h) => h.respect > 0).map((h) => [lower(h.address), h.respect]));
const zorBalance = new Map(zor.holders.filter((h) => h.respect > 0).map((h) => [lower(h.address), h.respect]));
const holders = [...new Set([...ogBalance.keys(), ...zorBalance.keys()])];
const touched = new Set([...og.holders, ...zor.holders].map((h) => lower(h.address)));
const named = new Set(members.members.map((m) => lower(m.address)));

const sessions = periods.periods.filter((p) => p.periodNumber > 0).sort((a, b) => b.periodNumber - a.periodNumber);
const recentPeriods = new Set(sessions.slice(0, 12).map((p) => p.periodNumber));
const activeRecently = [...new Set(
  awards.events.filter((e) => recentPeriods.has(e.periodNumber)).map((e) => lower(e.recipient)),
)];
const everAwarded = [...new Set(awards.events.map((e) => lower(e.recipient)))];

/** How many top holders it takes to reach a share of the total vote weight. */
function holdersToReach(share) {
  const sorted = [...ogBalance.values()].sort((a, b) => b - a);
  const total = sorted.reduce((a, b) => a + b, 0);
  let acc = 0;
  for (let i = 0; i < sorted.length; i++) {
    acc += sorted[i];
    if (acc / total > share || Math.abs(acc / total - share) < 1e-12) return i + 1;
  }
  return sorted.length;
}

const ascending = sessions.slice().reverse();
const gaps = ascending.slice(1).map((p, i) =>
  Math.round((Date.parse(p.date) - Date.parse(ascending[i].date)) / 86400000));
const spanWeeks = (Date.parse(ascending.at(-1).date) - Date.parse(ascending[0].date)) / 86400000 / 7;

function longestRunEndingAtLatest() {
  const nums = sessions.map((p) => p.periodNumber);
  let run = 0;
  for (let i = 0; i < nums.length; i++) {
    if (i > 0 && nums[i] !== nums[i - 1] - 1) break;
    run++;
  }
  return run;
}

function missingPeriods() {
  const nums = sessions.map((p) => p.periodNumber).sort((a, b) => a - b);
  const gapsFound = [];
  for (let n = nums[0]; n < nums.at(-1); n++) if (!nums.includes(n)) gapsFound.push(n);
  return gapsFound.join(',');
}

const executions = {};
let zeroWeightVotes = 0;
let standingNoVotes = 0;
let neededASecondVoter = 0;
const voters = new Set();
for (const p of proposals.proposals) {
  for (const v of p.votes) {
    voters.add(lower(v.voter));
    if (v.weight === 0) zeroWeightVotes++;
  }
  for (const v of p.finalVotes) if (v.vote === 'No') standingNoVotes++;
  if (p.executedBy) executions[lower(p.executedBy)] = (executions[lower(p.executedBy)] || 0) + 1;
  const largestYes = Math.max(0, ...p.finalVotes.filter((v) => v.vote === 'Yes').map((v) => v.weight));
  if (p.yesWeight >= MIN_WEIGHT && largestYes < MIN_WEIGHT) neededASecondVoter++;
}
/** Every distinct transaction the snapshot records against OREC - proposal
 * creations, votes and execution attempts. The repo README quoted "242+ as of
 * May 2026" from a block explorer; this is the number the committed snapshot
 * can actually reproduce. */
const orecTransactions = new Set();
for (const p of proposals.proposals) {
  for (const key of ['createdTx', 'executedTx']) if (p[key]) orecTransactions.add(p[key]);
  for (const v of p.votes) if (v.tx) orecTransactions.add(v.tx);
}

/** Gini over a value vector, the standard mean-absolute-difference form.
 * Whitepaper ch04 quotes three of these and used to quote one wrong one. */
function gini(values) {
  const v = values.slice().sort((a, b) => a - b);
  const n = v.length;
  const total = v.reduce((a, b) => a + b, 0);
  let num = 0;
  v.forEach((x, i) => { num += (2 * (i + 1) - n - 1) * x; });
  return (num / (n * total)).toFixed(2);
}

/** A No vote cast by anyone other than the account that opened the proposal.
 * All ten standing No votes on record are the author reversing himself, which
 * is why ch04 and ch09 can say the vote has never been contested. */
const standingNoVotesByNonAuthor = proposals.proposals.filter((p) => {
  const author = lower(p.votes[0]?.voter ?? '');
  return p.finalVotes.some((v) => v.vote === 'No' && lower(v.voter) !== author);
}).length;

const lags = proposals.proposals
  .filter((p) => p.executedAt)
  .map((p) => (Date.parse(p.executedAt) - Date.parse(p.createdAt)) / 86400000)
  .sort((a, b) => a - b);

/** Every award slot a reverted execution left unminted, and why the revert
 * happened. Backs respect/EXECUTION-RUNBOOK.md sections 1 and 6. */
const failedExecutions = proposals.proposals.filter((p) => p.executionFailed && p.action?.awards);

const unsettled = new Map();
for (const p of failedExecutions) {
  const period = p.action.awards[0].periodNumber;
  const minted = new Set(awards.events.filter((e) => e.periodNumber === period).map((e) => lower(e.recipient)));
  for (const a of p.action.awards) {
    if (!minted.has(lower(a.recipient))) {
      unsettled.set(`${period}|${lower(a.recipient)}`, { period, recipient: lower(a.recipient), respect: a.respect });
    }
  }
}
const unsettledRows = [...unsettled.values()];
const unsettledPeople = new Set(unsettledRows.map((r) => r.recipient));

/** A revert is a duplicate when someone in the group already held an award for
 * that period at the moment the execution ran. The rest are the ERC-1155
 * acceptance-check failures on contract recipients. */
const duplicateCauseFailures = failedExecutions.filter((p) => {
  const period = p.action.awards[0].periodNumber;
  const at = Date.parse(p.executedAt);
  const priorHolders = new Set(
    awards.events.filter((e) => e.periodNumber === period && Date.parse(e.date) < at).map((e) => lower(e.recipient)),
  );
  return p.action.awards.some((a) => priorHolders.has(lower(a.recipient)));
}).length;

/** The proposed bench in respect/EXECUTION-RUNBOOK.md section 2, by the three
 * criteria it states. */
const benchStats = (address) => {
  const a = lower(address);
  const cast = proposals.proposals.reduce((n, p) => n + p.votes.filter((v) => lower(v.voter) === a).length, 0);
  const recent = awards.events.filter((e) => lower(e.recipient) === a && e.periodNumber >= 100).length;
  const last = Math.max(0, ...awards.events.filter((e) => lower(e.recipient) === a).map((e) => e.periodNumber));
  return { cast, recent, last };
};
const OHNAHJI = benchStats('0x64a15b1d2de581097cb48e5d82619203e24bb3e1');
const CANDYTOYBOX = benchStats('0x8d43a3fc2fed663bf6b82ea4792c0e5239d5ee66');
const METAMU = benchStats('0x2d9cbc4ecfbd1b8f66aa798fd51585ae058daa8b');
const TADAS = benchStats('0xaed620c450911c38714e666cd84137767e3d6286');

/** Session shape and attendance over the recent window, backing
 * respect/FACILITATION-RUNBOOK.md sections 1 and 3. Attendance counts being
 * ranked in a settled group OR in a group whose mint reverted, because the
 * second kind is a settlement failure, not an absence. */
const WINDOW_FROM = 95;

const rankedRows = awards.events.map((e) => ({ period: e.periodNumber, address: lower(e.recipient) }));
for (const r of unsettledRows) rankedRows.push({ period: r.period, address: r.recipient });

const windowPeriods = [...new Set(rankedRows.filter((r) => r.period >= WINDOW_FROM).map((r) => r.period))];

const attendance = new Map();
for (const r of rankedRows) {
  if (r.period < WINDOW_FROM) continue;
  if (!attendance.has(r.address)) attendance.set(r.address, new Set());
  attendance.get(r.address).add(r.period);
}
const sessionsRanked = (address) => attendance.get(lower(address))?.size ?? 0;
const latestSession = (address) => Math.max(0, ...(attendance.get(lower(address)) ?? []));

const groupsByPeriod = new Map();
for (const e of awards.events) {
  if (!groupsByPeriod.has(e.periodNumber)) groupsByPeriod.set(e.periodNumber, new Map());
  const g = groupsByPeriod.get(e.periodNumber);
  g.set(e.groupNum, (g.get(e.groupNum) ?? 0) + 1);
}
const windowGroupCounts = [...groupsByPeriod.entries()]
  .filter(([period]) => period >= WINDOW_FROM)
  .map(([, g]) => g.size);
const allGroupSizes = [...groupsByPeriod.values()].flatMap((g) => [...g.values()]).sort((a, b) => a - b);

/** People *settled* per session inside the recent window - awards that actually
 * minted, matching the session table in FACILITATION-RUNBOOK section 1. The
 * whitepaper quotes this range where it used to quote "40+ per session". The
 * attendance table above deliberately uses a wider count that includes reverted
 * mints; these are two different measurements and must not be conflated. */
const windowSessionSizes = [...groupsByPeriod.entries()]
  .filter(([period]) => period >= WINDOW_FROM)
  .map(([period]) => new Set(
    awards.events.filter((e) => e.periodNumber === period).map((e) => lower(e.recipient)),
  ).size)
  .sort((a, b) => a - b);

/** The first period the ZOR ledger covers. Everything before it ran on OG,
 * which carries no per-period record, and the whitepaper says so by number. */
const firstSettledPeriod = Math.min(...sessions.map((p) => p.periodNumber));

// --- the claims, as written in the docs -------------------------------------

/* Recover the Respect curve the live game actually pays. Each award carries a
 * `level` - 6 is the top of a breakout, 1 the bottom - so the curve is the
 * level -> respect mapping, highest level first. Periods before 106 are skipped
 * (see the FRAPP claims for why 105 is excluded). A period can contain several
 * breakout groups, so 110 appears more than once per period; the async game
 * runs a single group, so it pays one of each. */
const curveLevels = new Map();
let chainCurveIsConsistent = true;
for (const e of awards.events) {
  if (e.periodNumber < 106) continue;
  const seen = curveLevels.get(e.level);
  if (seen === undefined) curveLevels.set(e.level, e.respect);
  else if (seen !== e.respect) chainCurveIsConsistent = false;
}
const chainCurve = [...curveLevels.entries()]
  .sort(([a], [b]) => b - a)
  .map(([, respect]) => respect);

/** The payout curve as the ledger actually records it. ch05 and ch08 quote the
 * 2x curve; the first four settled periods paid standard Fibonacci and two
 * later periods paid neither, so the history is pinned rather than the constant.
 * Derived per period from the distinct Respect values awarded. */
const STD_CURVE = new Set([55, 34, 21, 13, 8, 5]);
const ZAO_CURVE = new Set([110, 68, 42, 26, 16, 10]);
const curveByPeriod = new Map();
for (const e of awards.events) {
  if (!curveByPeriod.has(e.periodNumber)) curveByPeriod.set(e.periodNumber, new Set());
  curveByPeriod.get(e.periodNumber).add(e.respect);
}
const periodsPaying = (curve) => [...curveByPeriod.entries()]
  .filter(([n, vals]) => n > 0 && [...vals].every((v) => curve.has(v)))
  .map(([n]) => n).sort((a, b) => a - b);
const offCurvePeriods = [...curveByPeriod.entries()]
  .filter(([n, vals]) => n > 0 && ![...vals].every((v) => ZAO_CURVE.has(v))
    && ![...vals].every((v) => STD_CURVE.has(v)))
  .map(([n]) => n).sort((a, b) => a - b);

/** Top awards per period. A session pays a full curve PER GROUP, so several
 * 110s in one period is normal and "one 110 per period" is false for the
 * synchronous game. */
const topAwardsByPeriod = new Map();
for (const e of awards.events) {
  if (e.respect === 110) topAwardsByPeriod.set(e.periodNumber, (topAwardsByPeriod.get(e.periodNumber) ?? 0) + 1);
}

const CLAIMS = [
  ['LEDGER', 'OG holders with a balance', ogBalance.size, 122],
  ['LEDGER', 'ZOR holders with a balance', zorBalance.size, 64],
  ['LEDGER', 'ZOR addresses that ever held', zor.holders.length, 70],
  ['LEDGER', 'OG total supply', summary.og.totalSupply, 38484],
  ['LEDGER', 'ZOR respect held', summary.zor.respectHeld, 17418],
  ['LEDGER', 'ZOR respect minted', summary.zor.respectMinted, 18266],
  ['LEDGER', 'ZOR respect burned', summary.zor.respectBurned, 848],
  ['LEDGER', 'OG mints', summary.og.mints, 69],
  ['LEDGER', 'OG distributions', summary.og.distributions, 447],
  ['LEDGER', 'OG distribution recipients', summary.og.recipients, 123],
  ['LEDGER', 'OG peer-to-peer transfers', og.transfers.filter((t) => t.kind === 'peer-transfer').length, 0],
  ['LEDGER', 'OG returns to treasury', og.transfers.filter((t) => t.kind === 'return').length, 2],
  ['LEDGER', 'ZOR awards', summary.zor.awards, 333],
  ['LEDGER', 'addresses ever holding either', touched.size, 169],
  ['LEDGER', 'addresses with a balance on either', holders.length, 165],
  ['LEDGER', 'OG-only addresses', holders.filter((a) => ogBalance.has(a) && !zorBalance.has(a)).length, 101],
  ['LEDGER', 'OG-only respect', holders.filter((a) => ogBalance.has(a) && !zorBalance.has(a))
    .reduce((s, a) => s + ogBalance.get(a), 0), 17067],
  ['LEDGER', 'settled sessions on ZOR', sessions.length, 41],
  ['LEDGER', 'active in last 12 periods', activeRecently.length, 27],
  ['LEDGER', 'active holding zero OG', activeRecently.filter((a) => !ogBalance.has(a)).length, 14],
  ['LEDGER', 'active under the minimum weight', activeRecently.filter((a) => ogBalance.has(a) && ogBalance.get(a) < MIN_WEIGHT).length, 9],
  ['LEDGER', 'active able to pass alone', activeRecently.filter((a) => (ogBalance.get(a) || 0) >= MIN_WEIGHT).length, 4],
  ['LEDGER', 'people ever awarded ZOR', everAwarded.length, 70],
  ['LEDGER', 'ever awarded ZOR with zero OG', everAwarded.filter((a) => !ogBalance.has(a)).length, 47],
  ['LEDGER', 'OG holders named', [...ogBalance.keys()].filter((a) => named.has(a)).length, 116],
  ['LEDGER', 'ZOR holders named', [...zorBalance.keys()].filter((a) => named.has(a)).length, 30],
  ['LEDGER', 'recently active named', activeRecently.filter((a) => named.has(a)).length, 15],
  ['LEDGER', 'all holders named', holders.filter((a) => named.has(a)).length, 125],
  ['LEDGER', 'names in the export with no wallet', members.namesWithoutWallet.length, 23],
  ['LEDGER', 'OG holders for over half the weight', holdersToReach(0.5), 9],
  ['LEDGER', 'OG holders for a two-thirds supermajority', holdersToReach(2 / 3), 16],
  ['LEDGER', 'OG addresses able to pass alone', [...ogBalance.values()].filter((v) => v >= MIN_WEIGHT).length, 12],
  ['LEDGER', 'median gap between sessions (days)', gaps.slice().sort((a, b) => a - b)[Math.floor(gaps.length / 2)], 7],
  ['LEDGER', 'largest gap between sessions (days)', Math.max(...gaps), 29],
  ['LEDGER', 'span of settled sessions (weeks)', spanWeeks.toFixed(1), '47.8'],
  ['LEDGER', 'mean participants per session', (ascending.reduce((s, p) => s + p.participants, 0) / ascending.length).toFixed(1), '8.1'],
  ['LEDGER', 'fewest participants in a session', Math.min(...ascending.map((p) => p.participants)), 3],
  ['LEDGER', 'most participants in a session', Math.max(...ascending.map((p) => p.participants)), 17],
  ['LEDGER', 'latest period number', summary.zor.latestPeriod, 110],
  ['LEDGER', 'longest consecutive run ending at the latest period', longestRunEndingAtLatest(), 7],
  ['LEDGER', 'period numbers with no awards', missingPeriods(), '71,72,103'],

  ['SIGNER', 'proposals', proposals.proposalCount, 153],
  ['SIGNER', 'distinct voters ever', voters.size, 9],
  ['SIGNER', 'distinct executors ever', Object.keys(executions).length, 2],
  ['SIGNER', 'executions by the top executor', executions['0x7234c36a71ec237c2ae7698e8916e0735001e9af'], 130],
  ['SIGNER', 'executions by the second executor', executions['0xaed620c450911c38714e666cd84137767e3d6286'], 4],
  ['SIGNER', 'proposals decided by a single voter', proposals.proposals.filter((p) => p.voterCount === 1).length, 137],
  ['SIGNER', 'proposals that needed a second voter to clear the minimum', neededASecondVoter, 0],
  ['SIGNER', 'zero-weight vote events', zeroWeightVotes, 12],
  ['SIGNER', 'standing No votes', standingNoVotes, 10],
  ['SIGNER', 'execution attempts', proposals.proposals.filter((p) => p.executedTx).length, 134],
  ['SIGNER', 'execution failures', proposals.proposals.filter((p) => p.executionFailed).length, 11],
  ['SIGNER', 'median days from proposal to execution', lags[Math.floor(lags.length / 2)].toFixed(0), '7'],
  ['SIGNER', 'executions taking over 14 days', lags.filter((d) => d > 14).length, 18],
  ['SIGNER', 'executions taking over 30 days', lags.filter((d) => d > 30).length, 2],
  ['SIGNER', 'slowest execution (days)', lags.at(-1).toFixed(0), '81'],
  ['SIGNER', 'proposals passed but not executed', proposals.proposals.filter((p) => p.stage === 'Executable').length, 2],
  ['SIGNER', 'signal proposals', proposals.proposals.filter((p) => p.action?.call === 'signal').length, 44],
  ['SIGNER', 'OREC minimum weight (Respect)', MIN_WEIGHT, 1000],
  ['SIGNER', 'OREC vote window (days)', Number(summary.orec.config.voteLen) / 86400, 3],
  ['SIGNER', 'OREC veto window (days)', Number(summary.orec.config.vetoLen) / 86400, 3],
  ['SIGNER', 'OREC reads vote weight from OG', lower(summary.orec.config.respectContract), lower(summary.contracts.OG_RESPECT)],

  ['RUNBOOK', 'award slots left unminted by reverted executions', unsettledRows.length, 24],
  ['RUNBOOK', 'Respect left unminted', unsettledRows.reduce((n, r) => n + r.respect, 0), 1672],
  ['RUNBOOK', 'people owed unminted Respect', unsettledPeople.size, 16],
  ['RUNBOOK', 'of those with no name on file', [...unsettledPeople].filter((a) => !named.has(a)).length, 7],
  ['RUNBOOK', 'periods with unminted awards', new Set(unsettledRows.map((r) => r.period)).size, 8],
  ['RUNBOOK', 'reverts caused by a duplicate period award', duplicateCauseFailures, 7],
  ['RUNBOOK', 'reverts with no duplicate (contract recipients)', failedExecutions.length - duplicateCauseFailures, 4],
  ['RUNBOOK', 'bench: Ohnahji B votes', OHNAHJI.cast, 11],
  ['RUNBOOK', 'bench: Ohnahji B awards since period 100', OHNAHJI.recent, 4],
  ['RUNBOOK', 'bench: Ohnahji B last period', OHNAHJI.last, 109],
  ['RUNBOOK', 'bench: CandyToyBox votes', CANDYTOYBOX.cast, 3],
  ['RUNBOOK', 'bench: CandyToyBox awards since period 100', CANDYTOYBOX.recent, 5],
  ['RUNBOOK', 'bench: CandyToyBox last period', CANDYTOYBOX.last, 110],
  ['RUNBOOK', 'bench: Meta Mu votes', METAMU.cast, 1],
  ['RUNBOOK', 'bench: Meta Mu awards since period 100', METAMU.recent, 5],
  ['RUNBOOK', 'bench: Meta Mu last period', METAMU.last, 110],
  ['RUNBOOK', 'Tadas last period (why he fails criterion 2)', TADAS.last, 68],

  ['FACILITATION', 'settled sessions in the window (periods 95-110)', windowPeriods.length, 15],
  ['FACILITATION', 'distinct people ranked in the window', attendance.size, 29],
  ['FACILITATION', 'sessions that ran a single group', windowGroupCounts.filter((n) => n === 1).length, 11],
  ['FACILITATION', 'sessions that ran two groups', windowGroupCounts.filter((n) => n === 2).length, 4],
  ['FACILITATION', 'sessions that ran three or more', windowGroupCounts.filter((n) => n > 2).length, 0],
  ['FACILITATION', 'groups ever settled', allGroupSizes.length, 68],
  ['FACILITATION', 'median group size', allGroupSizes[Math.floor(allGroupSizes.length / 2)], 5],
  ['FACILITATION', 'largest group ever', allGroupSizes.at(-1), 8],
  ['FACILITATION', 'groups larger than the documented cap of 6', allGroupSizes.filter((n) => n > 6).length, 4],
  ['FACILITATION', 'attendance: Zaal sessions ranked (the problem, as a number)', sessionsRanked('0x7234c36a71ec237c2ae7698e8916e0735001e9af'), 14],
  ['FACILITATION', 'attendance: Hurric4n3ike sessions ranked', sessionsRanked('0x29f5dee65e1fb856b816eab4f0b702c10e5eaa34'), 10],
  ['FACILITATION', 'attendance: Hurric4n3ike latest session', latestSession('0x29f5dee65e1fb856b816eab4f0b702c10e5eaa34'), 105],
  ['FACILITATION', 'attendance: Jose sessions ranked', sessionsRanked('0x29185eb8cfd22aa719529217bfbade61677e0ad2'), 9],
  ['FACILITATION', 'attendance: Jose latest session', latestSession('0x29185eb8cfd22aa719529217bfbade61677e0ad2'), 110],
  ['FACILITATION', 'attendance: Meta Mu sessions ranked', sessionsRanked('0x2d9cbc4ecfbd1b8f66aa798fd51585ae058daa8b'), 8],
  ['FACILITATION', 'attendance: Meta Mu latest session', latestSession('0x2d9cbc4ecfbd1b8f66aa798fd51585ae058daa8b'), 110],
  ['FACILITATION', 'attendance: Ohnahji B sessions ranked', sessionsRanked('0x64a15b1d2de581097cb48e5d82619203e24bb3e1'), 8],
  ['FACILITATION', 'attendance: Ohnahji B latest session', latestSession('0x64a15b1d2de581097cb48e5d82619203e24bb3e1'), 109],
  ['FACILITATION', 'attendance: CandyToyBox sessions ranked', sessionsRanked('0x8d43a3fc2fed663bf6b82ea4792c0e5239d5ee66'), 7],
  ['FACILITATION', 'attendance: Zach L. sessions ranked', sessionsRanked('0xb7f4b9caba6bb0aeaa2b5d8df23e2b59c192bdbb'), 7],
  ['FACILITATION', 'attendance: Zach L. latest session', latestSession('0xb7f4b9caba6bb0aeaa2b5d8df23e2b59c192bdbb'), 107],
  ['FACILITATION', 'attendance: unnamed 0xf73485a6 sessions ranked', sessionsRanked('0xf73485a61856ab07ad57152151db3ab99df9a8ea'), 7],
  ['FACILITATION', 'attendance: unnamed 0xf73485a6 latest session', latestSession('0xf73485a61856ab07ad57152151db3ab99df9a8ea'), 110],

  // --- whitepaper/draft, v0.2 accuracy pass -------------------------------
  // Every chain figure the chapters quote. A chapter that drifts should break
  // here rather than age quietly into being wrong again.

  ['WP ch01', 'OREC proposals', proposals.proposalCount, 153],
  ['WP ch01', 'OREC proposals executed', summary.orec.executed, 123],
  ['WP ch01', 'Respect awards on ZOR', summary.zor.awards, 333],
  ['WP ch01', 'settled periods', sessions.length, 41],
  ['WP ch01', 'addresses that ever held Respect', touched.size, 169],
  ['WP ch01', 'latest period number', summary.zor.latestPeriod, 110],
  ['WP ch01', 'periods predating the ZOR ledger', firstSettledPeriod - 1, 66],
  ['WP ch01', 'mean people settled per period', (ascending.reduce((s, p) => s + p.participants, 0) / ascending.length).toFixed(1), '8.1'],
  ['WP ch01', 'fewest settled in a recent session', windowSessionSizes[0], 4],
  ['WP ch01', 'most settled in a recent session', windowSessionSizes.at(-1), 12],

  ['WP ch03', 'groups ever settled', allGroupSizes.length, 68],
  ['WP ch03', 'median group size', allGroupSizes[Math.floor(allGroupSizes.length / 2)], 5],
  ['WP ch03', 'largest group ever', allGroupSizes.at(-1), 8],
  ['WP ch03', 'recent sessions running one group', windowGroupCounts.filter((n) => n === 1).length, 11],
  ['WP ch03', 'recent sessions running two groups', windowGroupCounts.filter((n) => n === 2).length, 4],
  ['WP ch03', 'median gap between settled periods (days)', gaps.slice().sort((a, b) => a - b)[Math.floor(gaps.length / 2)], 7],
  ['WP ch03', 'transactions touching OREC', orecTransactions.size, 316],
  ['WP ch03', 'OREC contract events', proposals.logCount, 514],
  ['WP ch03', 'proposals decided by a single voter', proposals.proposals.filter((p) => p.voterCount === 1).length, 137],

  ['WP ch04', 'OG holders', ogBalance.size, 122],
  ['WP ch04', 'OG total supply', summary.og.totalSupply, 38484],
  ['WP ch04', 'OG transfers', summary.og.transfers, 518],
  ['WP ch04', 'OG mints, all to the treasury', summary.og.mints, 69],
  ['WP ch04', 'OG distributions', summary.og.distributions, 447],
  ['WP ch04', 'OG peer-to-peer transfers', og.transfers.filter((t) => t.kind === 'peer-transfer').length, 0],
  ['WP ch04', 'OG returns to the treasury', og.transfers.filter((t) => t.kind === 'return').length, 2],
  ['WP ch04', 'ZOR awards', summary.zor.awards, 333],
  ['WP ch04', 'ZOR addresses ever awarded', everAwarded.length, 70],
  ['WP ch04', 'ZOR minted / burned / held', `${summary.zor.respectMinted}/${summary.zor.respectBurned}/${summary.zor.respectHeld}`, '18266/848/17418'],
  ['WP ch04', 'first period on the ZOR ledger', firstSettledPeriod, 67],
  ['WP ch04', 'ever awarded ZOR with no vote weight', everAwarded.filter((a) => !ogBalance.has(a)).length, 47],
  ['WP ch04', 'recently active with zero OG', activeRecently.filter((a) => !ogBalance.has(a)).length, 14],
  ['WP ch04', 'recently active under the minimum weight', activeRecently.filter((a) => ogBalance.has(a) && ogBalance.get(a) < MIN_WEIGHT).length, 9],
  ['WP ch04', 'recently active able to pass alone', activeRecently.filter((a) => (ogBalance.get(a) || 0) >= MIN_WEIGHT).length, 4],
  // ch04 says "either curve" and the claim has to hold both, not just today's.
  // The curve is policy, not physics - ZAO has escalated once already - so a
  // figure pinned to one vector would quietly become a snapshot.
  ['WP ch04', 'Gini of one Respect Game payout, 2x curve', gini([110, 68, 42, 26, 16, 10]), '0.41'],
  ['WP ch04', 'Gini of one Respect Game payout, standard curve', gini([55, 34, 21, 13, 8, 5]), '0.41'],
  ['WP ch04', 'doubling the curve leaves the payout Gini unchanged',
    gini([110, 68, 42, 26, 16, 10]) === gini([55, 34, 21, 13, 8, 5]), true],
  ['WP ch04', 'Gini of the ZOR ledger', gini([...zorBalance.values()]), '0.53'],
  ['WP ch04', 'Gini of the OG ledger (the one that votes)', gini([...ogBalance.values()]), '0.73'],
  ['WP ch04', 'OG holders for a majority of vote weight', holdersToReach(0.5), 9],
  ['WP ch04', 'OG holders for a two-thirds supermajority', holdersToReach(2 / 3), 16],
  ['WP ch04', 'proposals ever voted down by someone other than the author', standingNoVotesByNonAuthor, 0],
  ['WP ch04', 'proposals that needed a second voter', neededASecondVoter, 0],

  ['WP ch05', 'OREC vote window (seconds)', Number(summary.orec.config.voteLen), 259200],
  ['WP ch05', 'OREC veto window (seconds)', Number(summary.orec.config.vetoLen), 259200],
  ['WP ch05', 'days from submission to executable', (Number(summary.orec.config.voteLen) + Number(summary.orec.config.vetoLen)) / 86400, 6],
  ['WP ch05', 'median days from proposal to execution', lags[Math.floor(lags.length / 2)].toFixed(0), '7'],
  ['WP ch05', 'OREC minimum weight (Respect)', MIN_WEIGHT, 1000],
  ['WP ch05', 'OREC reads vote weight from OG, not ZOR', lower(summary.orec.config.respectContract), lower(summary.contracts.OG_RESPECT)],
  ['WP ch05', 'OREC owner is OREC itself', lower(summary.orec.config.owner), lower(summary.contracts.OREC)],
  ['WP ch05', 'zero-weight votes ever cast', zeroWeightVotes, 12],
  ['WP ch05', 'addresses able to clear the minimum alone', [...ogBalance.values()].filter((v) => v >= MIN_WEIGHT).length, 12],
  ['WP ch05', 'execution attempts', proposals.proposals.filter((p) => p.executedTx).length, 134],
  ['WP ch05', 'executions by the top executor', executions['0x7234c36a71ec237c2ae7698e8916e0735001e9af'], 130],
  ['WP ch05', 'executions by anyone else', executions['0xaed620c450911c38714e666cd84137767e3d6286'], 4],
  ['WP ch05', 'groups larger than the design maximum of 6', allGroupSizes.filter((n) => n > 6).length, 4],
  ['WP ch05', 'largest group ever settled', allGroupSizes.at(-1), 8],
  ['WP ch05', 'facilitation proxy: Zaal ranked in the window', sessionsRanked('0x7234c36a71ec237c2ae7698e8916e0735001e9af'), 14],
  ['WP ch05', 'facilitation proxy: highest non-Zaal count', Math.max(...[...attendance.entries()].filter(([a]) => a !== '0x7234c36a71ec237c2ae7698e8916e0735001e9af').map(([, v]) => v.size)), 10],

  ['WP ch06', 'OG holders', ogBalance.size, 122],
  ['WP ch06', 'ZOR awards / addresses / settled periods', `${summary.zor.awards}/${everAwarded.length}/${sessions.length}`, '333/70/41'],
  ['WP ch06', 'ZOR minted / burned / outstanding', `${summary.zor.respectMinted}/${summary.zor.respectBurned}/${summary.zor.respectHeld}`, '18266/848/17418'],
  ['WP ch06', 'ever awarded ZOR with no vote weight', everAwarded.filter((a) => !ogBalance.has(a)).length, 47],
  ['WP ch06', 'active contributors who cannot carry a proposal', activeRecently.filter((a) => (ogBalance.get(a) || 0) < MIN_WEIGHT).length, 23],
  ['WP ch06', 'minWeight as a share of OG supply (%)', ((MIN_WEIGHT / summary.og.totalSupply) * 100).toFixed(1), '2.6'],
  ['WP ch06', 'transactions against OREC', orecTransactions.size, 316],
  ['WP ch06', 'OREC contract events', proposals.logCount, 514],
  ['WP ch06', 'proposals executed', summary.orec.executed, 123],
  ['WP ch06', 'proposals that failed to pass', summary.orec.byStage.Failed, 15],
  ['WP ch06', 'execution attempts that reverted', summary.orec.failed, 11],
  ['WP ch06', 'reverted executions that were all mintRespectGroup', failedExecutions.length, 11],
  ['WP ch06', 'award slots left unminted by those reverts', unsettledRows.length, 24],

  ['WP ch07', 'addresses that ever held Respect', touched.size, 169],
  ['WP ch07', 'latest period number', summary.zor.latestPeriod, 110],
  ['WP ch07', 'settled periods', sessions.length, 41],
  ['WP ch07', 'ZOR awards', summary.zor.awards, 333],
  ['WP ch07', 'proposals / executed', `${proposals.proposalCount}/${summary.orec.executed}`, '153/123'],
  ['WP ch07', 'mean people settled per period', (ascending.reduce((s, p) => s + p.participants, 0) / ascending.length).toFixed(1), '8.1'],
  ['WP ch07', 'recent session range', `${windowSessionSizes[0]}-${windowSessionSizes.at(-1)}`, '4-12'],
  ['WP ch07', 'days before a proposal is executable', (Number(summary.orec.config.voteLen) + Number(summary.orec.config.vetoLen)) / 86400, 6],
  ['WP ch07', 'minWeight as a share of OG supply (%)', ((MIN_WEIGHT / summary.og.totalSupply) * 100).toFixed(1), '2.6'],

  ['WP ch08', 'latest period number', summary.zor.latestPeriod, 110],
  ['WP ch08', 'settled periods on ZOR', sessions.length, 41],
  ['WP ch08', 'first settled period', firstSettledPeriod, 67],
  ['WP ch08', 'period numbers in range with no awards', missingPeriods(), '71,72,103'],
  ['WP ch08', 'longest consecutive run ending at 110', longestRunEndingAtLatest(), 7],
  ['WP ch08', 'span of settled periods (weeks)', spanWeeks.toFixed(1), '47.8'],
  ['WP ch08', 'largest gap between settled periods (days)', Math.max(...gaps), 29],
  ['WP ch08', 'periods that ran on OG with no per-period record', firstSettledPeriod - 1, 66],
  ['WP ch08', 'execution attempts that reverted', summary.orec.failed, 11],
  ['WP ch08', 'proposals / executed', `${proposals.proposalCount}/${summary.orec.executed}`, '153/123'],
  ['WP ch08', 'OG holders when the ledger went dormant', ogBalance.size, 122],
  ['WP ch08', 'OG total supply', summary.og.totalSupply, 38484],
  ['WP ch08', 'ZOR awards / addresses', `${summary.zor.awards}/${everAwarded.length}`, '333/70'],
  ['WP ch08', 'transactions against OREC', orecTransactions.size, 316],
  ['WP ch08', 'ever awarded ZOR with no vote weight', everAwarded.filter((a) => !ogBalance.has(a)).length, 47],
  ['WP ch08', 'counts table: addresses that ever held Respect', touched.size, 169],
  ['WP ch08', 'counts table: OG holders', ogBalance.size, 122],
  ['WP ch08', 'counts table: ZOR addresses ever', zor.holders.length, 70],
  ['WP ch08', 'counts table: names resolvable to a wallet', members.counts.named, 144],
  ['WP ch08', 'counts table: named and currently holding', members.counts.namedAndHolding, 129],
  ['WP ch08', 'counts table: recent session range', `${windowSessionSizes[0]}-${windowSessionSizes.at(-1)}`, '4-12'],
  ['WP ch08', 'counts table: mean settled per period', (ascending.reduce((s, p) => s + p.participants, 0) / ascending.length).toFixed(1), '8.1'],
  ['WP ch08', 'Fibonacci ratio is identical on both curves', `${110 / 10}:${55 / 5}`, '11:11'],
  ['WP ch08', 'top two ranks share of a ZAO payout (%)', (((110 + 68) / (110 + 68 + 42 + 26 + 16 + 10)) * 100).toFixed(0), '65'],
  ['WP ch08', 'Respect issued per full ZAO group', 110 + 68 + 42 + 26 + 16 + 10, 272],
  ['WP ch08', 'Respect issued per full standard group', 55 + 34 + 21 + 13 + 8 + 5, 136],

  ['WP ch09', 'addresses that ever held Respect', touched.size, 169],
  ['WP ch09', 'recent session range', `${windowSessionSizes[0]}-${windowSessionSizes.at(-1)}`, '4-12'],
  ['WP ch09', 'mean settled per period', (ascending.reduce((s, p) => s + p.participants, 0) / ascending.length).toFixed(1), '8.1'],
  ['WP ch09', 'settled periods', sessions.length, 41],
  ['WP ch09', 'recent sessions running a single group', windowGroupCounts.filter((n) => n === 1).length, 11],
  ['WP ch09', 'sessions ever running three or more groups', windowGroupCounts.filter((n) => n > 2).length, 0],
  ['WP ch09', 'founder ranked in the window', sessionsRanked('0x7234c36a71ec237c2ae7698e8916e0735001e9af'), 14],
  ['WP ch09', 'highest non-founder attendance in the window', Math.max(...[...attendance.entries()].filter(([a]) => a !== '0x7234c36a71ec237c2ae7698e8916e0735001e9af').map(([, v]) => v.size)), 10],
  ['WP ch09', 'unminted award slots', unsettledRows.length, 24],
  ['WP ch09', 'people owed unminted Respect', unsettledPeople.size, 16],
  ['WP ch09', 'proposals', proposals.proposalCount, 153],
  ['WP ch09', 'addresses that ever voted', voters.size, 9],
  ['WP ch09', 'addresses that ever executed', Object.keys(executions).length, 2],
  ['WP ch09', 'executions by the founder', executions['0x7234c36a71ec237c2ae7698e8916e0735001e9af'], 130],
  ['WP ch09', 'execution attempts', proposals.proposals.filter((p) => p.executedTx).length, 134],
  ['WP ch09', 'executions by anyone else', executions['0xaed620c450911c38714e666cd84137767e3d6286'], 4],
  ['WP ch09', 'proposals decided by a single voter', proposals.proposals.filter((p) => p.voterCount === 1).length, 137],
  ['WP ch09', 'proposals needing a second voter', neededASecondVoter, 0],
  ['WP ch09', 'proposals voted down by a non-author', standingNoVotesByNonAuthor, 0],
  ['WP ch09', 'standing No votes, all self-reversals', standingNoVotes, 10],
  ['WP ch09', 'addresses able to clear the minimum weight alone', [...ogBalance.values()].filter((v) => v >= MIN_WEIGHT).length, 12],

  ['WP ch11', 'proposals / executed', `${proposals.proposalCount}/${summary.orec.executed}`, '153/123'],
  ['WP ch11', 'ZOR awards', summary.zor.awards, 333],
  ['WP ch11', 'latest period number', summary.zor.latestPeriod, 110],
  ['WP ch11', 'founder ranked in the last 15 settled sessions', sessionsRanked('0x7234c36a71ec237c2ae7698e8916e0735001e9af'), 14],
  ['WP ch11', 'highest non-founder attendance', Math.max(...[...attendance.entries()].filter(([a]) => a !== '0x7234c36a71ec237c2ae7698e8916e0735001e9af').map(([, v]) => v.size)), 10],

  // --- the single-admin-key claim ------------------------------------------
  // ch04, ch05, ch06, ch09 and roadmap item 10a all rest on this: one member
  // on the OG contract's DEFAULT_ADMIN_ROLE, able to grant itself minting
  // rights and issue vote weight on the only ledger that votes. It is the
  // highest-consequence claim in the paper and it was prose before it was ever
  // read from the chain. Now it is read by pull-data.mjs and pinned here.
  //
  // memberCount === null means the read failed and the claim is UNVERIFIED for
  // this snapshot - which drifts loudly, exactly as a wrong count would.
  ['ADMIN KEY', 'OG DEFAULT_ADMIN_ROLE member count', og.adminRole?.memberCount ?? 'unverified', 1],
  ['ADMIN KEY', 'OG admin is the treasury wallet', (og.adminRole?.members ?? []).map(lower).join(','), lower(summary.og.treasury)],
  ['ADMIN KEY', 'ZOR is owned by OREC, not by a wallet', lower(summary.orec.config.owner), lower(summary.contracts.OREC)],

  ['WP CURVE', 'periods that paid standard Fibonacci', periodsPaying(STD_CURVE).join(','), '67,68,69,70'],
  ['WP CURVE', 'periods that paid neither curve', offCurvePeriods.join(','), '78,105'],
  ['WP CURVE', 'period 105 paid a single flat amount', [...curveByPeriod.get(105)].join(','), '40'],
  ['WP CURVE', 'period 105 recipients', awards.events.filter((e) => e.periodNumber === 105).length, 6],
  ['WP CURVE', 'first period on the ZAO 2x curve', periodsPaying(ZAO_CURVE).find((n) => n > 70), 73],
  ['WP CURVE', 'the gap between the two curves is the empty periods', missingPeriods(), '71,72,103'],
  ['WP CURVE', 'periods minting more than one top award', [...topAwardsByPeriod.values()].filter((n) => n > 1).length, 21],
  ['WP CURVE', 'top awards in period 107', topAwardsByPeriod.get(107), 3],
  ['WP CURVE', 'top awards in period 110', topAwardsByPeriod.get(110), 2],

  // --- ROADMAP.md, the public L0-L7 scale ------------------------------------
  ['ROADMAP', 'period counter', summary.zor.latestPeriod, 110],
  ['ROADMAP', 'settled periods', sessions.length, 41],
  ['ROADMAP', 'first settled period', firstSettledPeriod, 67],
  ['ROADMAP', 'mean settled per period', (ascending.reduce((s, p) => s + p.participants, 0) / ascending.length).toFixed(1), '8.1'],
  ['ROADMAP', 'recent session range', `${windowSessionSizes[0]}-${windowSessionSizes.at(-1)}`, '4-12'],
  ['ROADMAP', 'addresses that ever held Respect', touched.size, 169],
  ['ROADMAP', 'founder ranked in the last 15 settled sessions', sessionsRanked('0x7234c36a71ec237c2ae7698e8916e0735001e9af'), 14],
  ['ROADMAP', 'highest non-founder attendance', Math.max(...[...attendance.entries()].filter(([a]) => a !== '0x7234c36a71ec237c2ae7698e8916e0735001e9af').map(([, v]) => v.size)), 10],
  ['ROADMAP', 'executions by the top executor of all attempts', `${executions['0x7234c36a71ec237c2ae7698e8916e0735001e9af']}/${proposals.proposals.filter((p) => p.executedTx).length}`, '130/134'],
  ['ROADMAP', 'addresses able to clear the minimum weight alone', [...ogBalance.values()].filter((v) => v >= MIN_WEIGHT).length, 12],
  // L6's arithmetic, so the "physics problem" framing cannot rot either.
  ['ROADMAP', 'circles a week at 1,000 participants in groups of 6', Math.round(1000 / 6), 167],
  ['ROADMAP', 'growth multiple from the community roll to 1,000', (1000 / 188).toFixed(1), '5.3'],

  // --- prose invariants -----------------------------------------------------
  ['NOT-ASKED', 'runbook says the bench has not been contacted or agreed',
    /has been contacted, asked, approached or has agreed to\s+anything/.test(docText('respect/FACILITATION-RUNBOOK.md')), true],
  ['NOT-ASKED', '"being named is not being asked" survives',
    /[Bb]eing named is not being asked/.test(docText('respect/FACILITATION-RUNBOOK.md')), true],
  ['NOT-ASKED', 'section 3 repeats that nobody on the bench has agreed',
    /Nobody on it has been contacted, asked, or has agreed to anything/.test(docText('respect/FACILITATION-RUNBOOK.md')), true],
  ['NOT-ASKED', 'the rota still says none has been asked',
    /none has been asked yet/.test(docText('respect/FACILITATION-RUNBOOK.md')), true],
  ['NOT-ASKED', 'whitepaper ch05 still names no facilitator',
    /civilmonkey/.test(docText('whitepaper/draft/ch05-the-respect-game.md').split('Earlier drafts said')[0]), false],

  /* frapp-gh anchors its period numbering to the chain's, so the two can drift
   * apart in exactly one way: someone edits the epoch, or a data re-pull moves
   * period 110's settlement. Both are held here.
   *
   * The epoch is the SESSION Monday (2026-08-24), not the settlement date
   * (2026-08-25). Those are different events - awards land after the OREC vote
   * window - and a reader comparing frapp-gh/README.md against the facts table
   * in the root README will see both dates. Pinned so the distinction survives
   * an edit by someone who assumes one of them is a typo. */
  ['FRAPP', 'frapp-gh epoch period number', frapp((c) => c.sessionSchedule.epochWeekNumber), 110],
  ['FRAPP', 'frapp-gh epoch is the session Monday',
    frapp((c) => c.sessionSchedule.epochDate), '2026-08-24T18:00:00-04:00'],
  ['FRAPP', 'period 110 settled the day after its session',
    periods.periods.find((p) => p.periodNumber === 110)?.date.slice(0, 10), '2026-08-25'],
  ['FRAPP', 'period 109 settled the same evening as its session',
    periods.periods.find((p) => p.periodNumber === 109)?.date.slice(0, 10), '2026-08-18'],
  ['FRAPP', 'the chain has not fallen behind the epoch frapp-gh counts from',
    frapp((c) => summary.zor.latestPeriod >= c.sessionSchedule.epochWeekNumber), true],
  /* The curve frapp-gh pays has to be the curve the live game pays, or an async
   * period and a Monday breakout award different amounts for the same rank.
   * On-chain the position is a `level` (6 highest), so the curve is recovered by
   * mapping level -> respect over recent periods. Period 105 is excluded: every
   * one of its six awards was a flat 40, the only recent period off the curve,
   * and it is pinned separately so the exclusion is not silent. */
  ['FRAPP', 'curve paid by periods 106 onward (NOT every period ever settled)',
    chainCurve.join(','), '110,68,42,26,16,10'],
  ['FRAPP', 'frapp-gh pays what the game pays NOW, not every curve it has paid',
    frapp((c) => c.ranking.respectScores.join(',')), '110,68,42,26,16,10'],
  ['FRAPP', 'each on-chain level maps to exactly one amount', chainCurveIsConsistent, true],
  ['FRAPP', 'period 105 is the one period since 106-era start paying flat 40',
    awards.events.filter((e) => e.periodNumber === 105 && e.respect === 40).length, 6],

  ['FRAPP', 'frapp-gh README calls 08-25 settlement, not the session date',
    /settled on-chain the next day/.test(docText('frapp-gh/README.md')), true],

  // Iman is on the named bench and is not in the ledger at all. That is a gap in
  // the data or a role outside the Monday game, not evidence about him - see
  // respect/FACILITATION-RUNBOOK.md section 3. Held as an expectation so that the
  // day he does appear, the doc gets corrected instead of quietly going stale.
  ['FACILITATION', 'Iman appears in members.json', members.members.some((m) => /iman/i.test(m.name)), false],
];

const drifted = CLAIMS.filter(([, , actual, expected]) => String(actual) !== String(expected));

for (const [doc, label, actual, expected] of CLAIMS) {
  const ok = String(actual) === String(expected);
  if (!ok) console.log(`DRIFTED  [${doc}] ${label}: doc says ${expected}, data says ${actual}`);
}

console.log(`\nSnapshot pulled ${summary.pulledAt} at block ${summary.latestBlock}.`);
if (drifted.length === 0) {
  console.log(`All ${CLAIMS.length} figures quoted in the respect/ docs and whitepaper chapters match the snapshot.`);
} else {
  console.log(`${drifted.length} of ${CLAIMS.length} figures have drifted. Update the prose, then update the expectations here.`);
  process.exit(1);
}
