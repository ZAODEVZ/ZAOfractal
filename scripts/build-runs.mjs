#!/usr/bin/env node
/**
 * build-runs.mjs - write the run ledger for the weekly Respect Game: one record per on-chain
 * period in data/runs/<periodNumber>.json, and data/runs.json as their index.
 *
 * Each record says: which recipe ran (pathways/ZAO.Fractal.RunRespectGame.v1.yaml),
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
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
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

// One record per period under data/runs/, plus data/runs.json as the index.
// Why one file per game: a writer that is not this script (later, the Monday bot when a game
// ends) can add a single new file without reading or rewriting a shared ledger, and each record
// has its own sha256. This script owns every record it can derive from chain and overwrites
// those; any other file in data/runs/ (for example a bot record for a period not yet on chain)
// is left in place and listed in the index.
const RECORD_SCHEMA = 'zao.fractal.run-record/v1';
const RUNS_DIR = join(DATA, 'runs');
await mkdir(RUNS_DIR, { recursive: true });

const recordJson = (r) => JSON.stringify({ schema: RECORD_SCHEMA, recordedBy: 'scripts/build-runs.mjs', ...r }, null, 2) + '\n';
for (const r of rows) await writeFile(join(RUNS_DIR, `${r.periodNumber}.json`), recordJson(r));

const index = [];
for (const name of (await readdir(RUNS_DIR)).filter((n) => /^\d+\.json$/.test(n))) {
  const raw = await readFile(join(RUNS_DIR, name));
  const rec = JSON.parse(raw.toString('utf8'));
  index.push({ periodNumber: rec.periodNumber, status: rec.status, recordedBy: rec.recordedBy, file: `data/runs/${name}`, sha256: sha256(raw) });
}
index.sort((a, b) => a.periodNumber - b.periodNumber);

const out = {
  recipe: RECIPE_ID,
  recordSchema: RECORD_SCHEMA,
  source: {
    proposals: { file: 'data/orec-proposals.json', pulledAt: proposals.pulledAt, contract: proposals.contract, sha256: sha256(proposalsRaw) },
    awards: { file: 'data/award-events.json', pulledAt: awards.pulledAt, contract: awards.contract, sha256: sha256(awardsRaw) },
  },
  note: 'Index of run records, one file per on-chain period in data/runs/. Records built from chain hold only executed proposals that minted ZOR; proposals still voting, vetoed or failed are in data/orec-proposals.json. periodNumber is the on-chain period, not a meeting number.',
  count: index.length,
  unmatchedAwardEvents: unmatched,
  pending,
  runs: index,
};

await writeFile(join(DATA, 'runs.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`wrote ${rows.length} run records to data/runs/ and an index of ${index.length} to data/runs.json (${unmatched} award events with no matching executed proposal, ${pending.length} proposals pending)`);
