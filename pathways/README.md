# pathways/

The ZAO's procedures written in the **Pathways** recipe format, so each one has a name, a version, and a record of every time it ran.

Pathways is DJ Thomson's specification for versioned, attributable procedures (RIS 1.2.0). We adopt its conventions here, credited, as part of the Agentic Ecosystem FrenZ collaboration. No Pathways code or spec text is copied.

## What is here

| File | What it is |
|---|---|
| `ZAO.Fractal.RunRespectGame.v1.yaml` | The weekly Respect Game as a recipe: rooms of 3 to 6, two-thirds agreement on each rank or the room earns zero, the 2x Fibonacci awards, the OREC proposal, the one-third veto, then execute. |

## Recipes and runs

- A **recipe** is a procedure with an id and a version: `Domain.Subdomain.Action@vN`. Changing the procedure means a new version, so old runs keep pointing at the procedure they actually followed.
- A **run** is one time the recipe was carried out. Each run of the Respect Game is one file, `../data/runs/<periodNumber>.json`, holding the OREC proposals that carried its results and when they executed. `../data/runs.json` is the index: one row per record, with its sha256. The site shows them at `/runs`.
- Each recipe says what an agent may never do (`non_delegable_acts`) and how much it may do on its own (`max_autonomy`; A0 means a person decides everything). For the Respect Game, people rank, propose and execute; agents never do.

## Run record format

**Decision (2026-11-07): one JSON file per game, under `data/runs/`, with `data/runs.json` as a generated index.**

Why one file per game rather than one shared ledger: the next writer is the Monday bot, which will record a game when it ends. With one file per game the bot adds a single new file. It never reads or rewrites a shared file, so it cannot clobber rows or conflict with a chain rebuild, and each record has its own sha256 in the index. A shared ledger would need a read, merge and rewrite on every game.

A record (`schema: zao.fractal.run-record/v1`):

| Field | Meaning |
|---|---|
| `schema`, `recordedBy` | Format version, and who wrote the record (`scripts/build-runs.mjs` for chain-derived records) |
| `periodNumber` | The on-chain period, not a meeting number |
| `recipe` | `ZAO.Fractal.RunRespectGame@v1` |
| `status` | `executed` when built from chain |
| `firstAwardAt`, `groups`, `awards`, `respect` | Counts only |
| `proposals[]` | `propId`, `stage`, `executedAt`, `executedTx`, `mintTypes`, `awards` |

Records hold counts and proposal and transaction hashes only, never names or recipient addresses.

`build-runs.mjs` overwrites the record for every period it can derive from chain and leaves any other file in `data/runs/` alone, so a record written by another tool for a period not yet on chain stays until the chain supersedes it.

## Refreshing the run ledger

```bash
node scripts/pull-data.mjs     # refresh the on-chain snapshots in data/
node scripts/build-runs.mjs    # rebuild data/runs/*.json and the data/runs.json index
```

`build-runs.mjs` reads only committed files, makes no network calls, and writes counts, not recipient addresses.

- `source` in `runs.json` records the sha256 of each input snapshot, after the Pathways run-ledger convention of input hashes. To check a ledger was built from the committed snapshot: `shasum -a 256 data/orec-proposals.json data/award-events.json` and compare.
- `pending` lists proposals that had not executed when the snapshot was pulled (still voting, in the veto window, or passed and awaiting execution), by id, stage and creation time only. The pull decodes a proposal's action from its execution tx, so the period a pending proposal carries is not known until it executes.
