#!/usr/bin/env node
/**
 * build-runs.mjs - write data/runs.json, the run ledger for the weekly Respect Game.
 *
 * One row per on-chain period: which recipe ran (pathways/ZAO.Fractal.RunRespectGame.v1.yaml),
 * which OREC proposals carried its results, and whether each executed. Everything comes from
 * two committed snapshots that scripts/pull-data.mjs already writes:
 *   - data/orec-proposals.json  (every OREC proposal, its stage and execution tx)
 *   - data/award-events.json    (every ZOR mint, with periodNumber and groupNum)
 * A proposal is tied to a period when its executedTx is the tx of a ZOR mint.
 *
 * `source` records the sha256 of each input file, so a reader can check the ledger was built
 * from the committed snapshot (`shasum -a 256 data/orec-proposals.json data/award-events.json`).
 *
 * Zero dependencies, no network. Counts only: no recipient addresses are written.
 * The on-chain periodNumber is recorded as-is; it is not converted to a meeting number.
 *
 * Usage:  node scripts/build-runs.mjs        (refresh the snapshots first with pull-data.mjs)
 */

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data');
const RECIPE_ID = 'ZAO.Fractal.RunRespectGame@v1';

// Read the raw bytes once, so the sha256 recorded in `source` is of exactly the file parsed.
// This follows the Pathways run-ledger convention of `input_hashes` (adopted, not copied).
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const proposalsRaw = await readFile(join(DATA, 'orec-proposals.json'));
const awardsRaw = await readFile(join(DATA, 'award-events.json'));
const proposals = JSON.parse(proposalsRaw.toString('utf8'));
const awards = JSON.parse(awardsRaw.toString('utf8'));

const byExecTx = new Map();
for (const p of proposals.proposals) {
  if (p.executedTx) byExecTx.set(p.executedTx.toLowerCase(), p);
}

const runs = new Map(); // periodNumber -> run
let unmatched = 0;
for (const e of awards.events) {
  const prop = byExecTx.get(String(e.tx).toLowerCase());
  if (!prop) { unmatched++; continue; }
  const run = runs.get(e.periodNumber) ?? {
    periodNumber: e.periodNumber,
    recipe: RECIPE_ID,
    firstAwardAt: e.date,
    groups: new Set(),
    awards: 0,
    respect: 0,
    proposals: new Map(),
  };
  if (e.date < run.firstAwardAt) run.firstAwardAt = e.date;
  run.groups.add(e.groupNum);
  run.awards += 1;
  run.respect += Number(e.respect) || 0;
  const pr = run.proposals.get(prop.propId) ?? {
    propId: prop.propId,
    stage: prop.stage,
    executedAt: prop.executedAt ?? null,
    executedTx: prop.executedTx,
    mintTypes: new Set(),
    awards: 0,
  };
  pr.mintTypes.add(e.mintType);
  pr.awards += 1;
  run.proposals.set(prop.propId, pr);
  runs.set(e.periodNumber, run);
}

const rows = [...runs.values()]
  .sort((a, b) => a.periodNumber - b.periodNumber)
  .map((r) => ({
    periodNumber: r.periodNumber,
    recipe: r.recipe,
    status: 'executed',
    firstAwardAt: r.firstAwardAt,
    groups: r.groups.size,
    awards: r.awards,
    respect: r.respect,
    proposals: [...r.proposals.values()].map((p) => ({ ...p, mintTypes: [...p.mintTypes].sort() })),
  }));

// Proposals that have not executed yet (still voting, in the veto window, or passed but not
// executed). The pull decodes a proposal's action only from its execution tx, so which period
// a pending proposal carries is not known here and is not guessed.
const pending = proposals.proposals
  .filter((p) => !p.executed && !p.canceled && !p.executionFailed && ['Voting', 'Veto', 'Executable'].includes(p.stage))
  .map((p) => ({ propId: p.propId, stage: p.stage, createdAt: p.createdAt }))
  .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

const out = {
  recipe: RECIPE_ID,
  source: {
    proposals: { file: 'data/orec-proposals.json', pulledAt: proposals.pulledAt, contract: proposals.contract, sha256: sha256(proposalsRaw) },
    awards: { file: 'data/award-events.json', pulledAt: awards.pulledAt, contract: awards.contract, sha256: sha256(awardsRaw) },
  },
  note: 'Only executed proposals that minted ZOR appear here. Proposals still voting, vetoed or failed are in data/orec-proposals.json. periodNumber is the on-chain period, not a meeting number.',
  count: rows.length,
  unmatchedAwardEvents: unmatched,
  pending,
  runs: rows,
};

await writeFile(join(DATA, 'runs.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`wrote ${rows.length} runs to data/runs.json (${unmatched} award events with no matching executed proposal, ${pending.length} proposals pending)`);
