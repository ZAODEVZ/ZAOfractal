# pathways/

The ZAO's procedures written in the **Pathways** recipe format, so each one has a name, a version, and a record of every time it ran.

Pathways is DJ Thomson's specification for versioned, attributable procedures (RIS 1.2.0). We adopt its conventions here, credited, as part of the Agentic Ecosystem FrenZ collaboration. No Pathways code or spec text is copied.

## What is here

| File | What it is |
|---|---|
| `ZAO.Fractal.RunRespectGame.v1.yaml` | The weekly Respect Game as a recipe: rooms of 3 to 6, two-thirds agreement on each rank or the room earns zero, the 2x Fibonacci awards, the OREC proposal, the one-third veto, then execute. |

## Recipes and runs

- A **recipe** is a procedure with an id and a version: `Domain.Subdomain.Action@vN`. Changing the procedure means a new version, so old runs keep pointing at the procedure they actually followed.
- A **run** is one time the recipe was carried out. Runs of the Respect Game are listed in `../data/runs.json`: one row per on-chain period, with the OREC proposals that carried its results and when they executed.
- Each recipe says what an agent may never do (`non_delegable_acts`) and how much it may do on its own (`max_autonomy`; A0 means a person decides everything). For the Respect Game, people rank, propose and execute; agents never do.

## Refreshing the run ledger

```bash
node scripts/pull-data.mjs     # refresh the on-chain snapshots in data/
node scripts/build-runs.mjs    # rebuild data/runs.json from them
```

`build-runs.mjs` reads only committed files, makes no network calls, and writes counts, not recipient addresses.

- `source` in `runs.json` records the sha256 of each input snapshot, after the Pathways run-ledger convention of input hashes. To check a ledger was built from the committed snapshot: `shasum -a 256 data/orec-proposals.json data/award-events.json` and compare.
- `pending` lists proposals that had not executed when the snapshot was pulled (still voting, in the veto window, or passed and awaiting execution), by id, stage and creation time only. The pull decodes a proposal's action from its execution tx, so the period a pending proposal carries is not known until it executes.
