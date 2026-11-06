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
 * Zero dependencies, no network. Counts only: no recipient addresses are written.
 * The on-chain periodNumber is recorded as-is; it is not converted to a meeting number.
 *
 * Usage:  node scripts/build-runs.mjs        (refresh the snapshots first with pull-data.mjs)
 */

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data');
const RECIPE_ID = 'ZAO.Fractal.RunRespectGame@v1';

const proposals = JSON.parse(await readFile(join(DATA, 'orec-proposals.json'), 'utf8'));
const awards = JSON.parse(await readFile(join(DATA, 'award-events.json'), 'utf8'));

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

const out = {
  recipe: RECIPE_ID,
  source: {
    proposals: { file: 'data/orec-proposals.json', pulledAt: proposals.pulledAt, contract: proposals.contract },
    awards: { file: 'data/award-events.json', pulledAt: awards.pulledAt, contract: awards.contract },
  },
  note: 'Only executed proposals that minted ZOR appear here. Proposals still voting, vetoed or failed are in data/orec-proposals.json. periodNumber is the on-chain period, not a meeting number.',
  count: rows.length,
  unmatchedAwardEvents: unmatched,
  runs: rows,
};

await writeFile(join(DATA, 'runs.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`wrote ${rows.length} runs to data/runs.json (${unmatched} award events with no matching executed proposal)`);
