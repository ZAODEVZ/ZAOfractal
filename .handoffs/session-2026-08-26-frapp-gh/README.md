# Handoff - frapp-gh lane, 2026-08-26

Async Respect Game, built and moved into this repo. **Stopping here.** Nothing
pushed, nothing deployed, no transaction of any kind.

## Two things needing a decision before anything else happens

### 1. `gate_4c836a146dcd` is open and is Zaal's to close

The branch is unpushed by decision. `REVIEW.md` at the worktree root is the
entry point and explains what is behind the gate. The short version, and it is
not about frapp-gh: commits `38884b1` and `d74aa43` bind **144 real community
names to real wallet addresses**, and `KNOWN_MEMBERS` in
`dao/src/lib/constants.ts` is compiled into the JavaScript served to every
visitor of the deployed dashboard. Pushing is the act that makes that public,
and it is irreversible in practice - clones, forks, caches, archives.

One precision, because it changes the options: `data/members.json` is **not**
bundled - `dao/src/lib/data.ts` imports only the six chain-data files, none of
which carry names. The exposure runs entirely through `constants.ts`. So
shipping the snapshot **without** the name map is a separable change, and the
dashboard degrades to short addresses rather than breaking.

frapp-gh itself never touches that map - verified, zero references to
`members.json`, `KNOWN_MEMBERS`, or `names_to_wallets` anywhere in the tree.

### 2. Whether async Respect should ever settle on-chain

Open, and not a tooling question. Today frapp-gh awards Respect and commits it
as JSON: peer-ranked, same curve, on neither ledger, carrying no vote. As of
`ebfdda0` all three member-facing surfaces say that plainly rather than saying
only that no tokens were minted.

If it ever does settle, it lands in the same ledger the Monday game settles
into. That promotes the anti-collusion review on `ROADMAP.md` L3 from a
refinement to a **prerequisite**: an async path that can be gamed mints
governance weight, not just an inflated leaderboard. The asymmetry to design
against is not group topology - 23 of 41 settled periods ran a single group -
but how the ranking was produced: a live group is four to six people who
watched each other work; an async ballot is a comment.

## State

Eleven commits under `frapp-gh/`, plus four outside it (three root workflows +
`frapp-gh-ci.yml`, the root issue template, six FRAPP claims in
`scripts/verify-claims.mjs`, and the REVIEW.md rows). All local on
`bettercallzaal/ws-fractal-lane`.

- **131 tests**, 96% lines on lib and handlers
- **285 claims** pass in `scripts/verify-claims.mjs`
- `npm run replay` plays a whole period from 19 recorded webhook deliveries
- Tree clean, nothing pushed

## Not started, all Zaal's

GitHub App registration and scopes, `GITHUB_WEBHOOK_SECRET`,
`FRAPP_GH_CRON_SECRET`, Vercel project link, and the **first live period**.
Phase 1 has never run against real GitHub - no App, no deployment, no real
ballot. `frapp-gh/README.md` says so in its opening.

Also needed before a first run, and both are repo settings rather than code:
Discussions must be enabled with a category named **Fractal Sessions** (the API
cannot create one; `open` refuses and names what is missing), and
`FRAPP_GH_TOKEN` if bot comments should be attributed to the App rather than to
Actions.

## Open decisions logged in the tree, not just here

- **Rename `week` to `period` internally** - `frapp-gh/ARCHITECTURE.md`. Cheap
  now, expensive once real period state exists on disk, because the state
  filenames change and written state needs migrating. Decide before the first
  live period, not after.
- **Unranked contributions earn** - decided, documented, and tested: zero
  placements is valid, sorts below anything placed, earns whatever the curve
  pays at that rank, and earns nothing past the end of the curve.
- **Period 0** is one stray award of 110, unexplained - `LEDGER-RECONCILIATION`
  section 5. Four claims pin the counts both including and excluding it, so if
  it is ever burned the docs notice.

## If someone resumes this

```bash
cd frapp-gh && npm install && npm test
npm run replay -- --results          # full period, no GitHub needed
npx tsx scripts/cycle.ts open --dry-run
npx tsx scripts/setup.ts             # reports what is missing before a live run
node ../scripts/verify-claims.mjs    # from the repo root
```

Read `frapp-gh/README.md` first - it opens with the status line, and the
Deviations section explains the five places the build departs from
`research/06-frapp-gh-prd.md` and why.
