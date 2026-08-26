# Handoff - fractal dashboard, data first (2026-08-25)

Repo: `ZAOfractal`, branch `main` (4 commits, nothing pushed).

## State: all three stages landed

**Stage 1 - `scripts/pull-data.mjs`.** Read-only, keyless, zero-dependency
(node >= 18). Full pull takes about 50 seconds. Writes `data/`:

| File | What |
|---|---|
| `summary.json` | headline counts, pull timestamp, block, source URLs |
| `zor-respect.json` | 70 ZOR addresses, Respect balances read from the contract |
| `award-events.json` | 333 awards + 28 burns, each with period, group, rank, Respect |
| `periods.json` | awards rolled up into 42 weekly sessions |
| `og-respect.json` | 122 OG holders, all 518 ERC-20 transfers, classified |
| `orec-proposals.json` | 153 OREC proposals with votes, stage, decoded action |

Flags: `--only zor,og,orec` and `--quiet`. A partial pull merges into
`summary.json` rather than wiping the sections it did not refresh.

**Stage 2 - `scripts/build-members.mjs`.** Reads the fractal Discord bot export
(`MEMBER_SOURCE_DIR`, default `~/Desktop/repos/fractalbotjuly2026/data`), writes
`data/members.json` and regenerates `KNOWN_MEMBERS` in
`dao/src/lib/constants.ts`. 144 named wallets, 129 of them holding Respect.
40 on-chain holders are still nameless and 23 names in the export have no
wallet - both lists are in `members.json`, not silently dropped.

**Stage 3 - `dao/` reads local JSON.** `@data` alias in `vite.config.ts` and
`tsconfig.json`; typed views in `dao/src/lib/data.ts`. Leaderboard, the new
Timeline tab, Proposals and StatsBar all render the snapshot. `npm run build`
passes; `npm run dev` serves it (verified the dev server transforms
`data/summary.json` through `@fs`).

## What the pull settles, against the whitepaper's known-stale table

- **"90+ unbroken weeks" / README's "100+".** Neither is what the chain says.
  Latest on-chain period is **110**, minted 2026-08-25. But the ZOR ledger only
  covers periods **67-110** (it deployed 2025-09-11), and inside that range
  periods **71, 72 and 103 are missing**, so the current unbroken run is **7**,
  not 110. Periods 1-66 are on the OG ledger, which records transfers, not
  per-week awards - so a "weeks unbroken" claim cannot be sourced from chain
  data alone for the first two thirds of the history. **Zaal tap:** decide what
  the honest public number is before the v0.2 pass edits ch01/ch08.
- **"188 members."** On chain: **169 addresses** have ever held Respect (122 OG,
  70 ZOR, overlapping). 144 have names. 188 is a community count, not a holder
  count - say which one the whitepaper means.
- **OREC tx count "242+".** Actual: **287 transactions**, **153 proposals**,
  123 executed, 11 execution failures, 15 failed to pass, 2 live.
- **Two facts the whitepaper does not currently state.** OREC weighs votes with
  **OG Respect** (`0x34cE...6957`), not ZOR. And OG Respect was minted entirely
  to one treasury wallet (`0x7234c36A...E9Af`, Zaal) and handed out by transfer -
  447 distributions, not 69 mints.
- OREC params, read live: 3-day vote, 3-day veto, 1000 Respect minimum weight.

## The accuracy trap worth remembering

Blockscout's indexed ERC-1155 balances are **wrong** - every sampled ZOR balance
came back short (1334 vs 1570, 686 vs 738). Its holder list also drops accounts:
11 ZOR holders never appear in it. The script now reads balances via `balanceOf`
and seeds the address set from transfer history. Both ledgers reconcile to a
residual of 0, and `summary.json` carries that residual so a future regression is
visible. Do not switch these back to the indexer for speed.

## Next steps

1. Name the 40 unnamed holders - top ones by Respect are in
   `data/members.json` under `unnamedHolders`. Sources not yet mined:
   `zao-fractal-bot`'s Supabase migrations, Farcaster handles.
2. Decide the streak/member numbers above, then do the whitepaper v0.2 pass in
   one commit across ch01, ch07, ch08, ch09 and the repo README.
3. Member write-up view: `awardsForMember()` in `dao/src/lib/data.ts` already
   returns a member's full history; it is only surfaced as a leaderboard
   expansion so far.
4. Period 0 has one stray award (2026-08-18) that is filtered out of `sessions`.
   Worth asking what it was.

## Resume point

`cd dao && npm run dev` shows the current snapshot. To refresh:
`node scripts/pull-data.mjs && node scripts/build-members.mjs`.

Nothing deployed, nothing pushed, as instructed.
