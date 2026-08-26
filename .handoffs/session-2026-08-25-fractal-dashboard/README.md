# Handoff - fractal dashboard + fractal docs (2026-08-25/26)

Repo: `ZAOfractal`, branch `main`, **12 commits ahead of origin, nothing
pushed**. Push is Zaal's call.

Two lanes ran in this pane. The dashboard data layer (task_52ea0cb8c31c) landed
first; the two fractal docs (task_fa960c63996b, task_b5f03719b980) were built
directly on its output. All three tasks are closed and coordinator-verified.

---

## Part 1 - the data layer

**`scripts/pull-data.mjs`.** Read-only, keyless, zero-dependency (node >= 18).
Full pull takes about 50 seconds. Writes `data/`:

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

**`scripts/build-members.mjs`.** Reads the fractal Discord bot export
(`MEMBER_SOURCE_DIR`, default `~/Desktop/repos/fractalbotjuly2026/data`), writes
`data/members.json` and regenerates `KNOWN_MEMBERS` in
`dao/src/lib/constants.ts`. 144 named wallets, 129 holding Respect. 40 on-chain
holders are still nameless and 23 names in the export have no wallet - both
lists are in `members.json`, not silently dropped.

**`dao/` reads the local snapshot.** `@data` alias in `vite.config.ts` and
`tsconfig.json`, typed views in `dao/src/lib/data.ts`. Leaderboard, the new
Timeline tab, Proposals and StatsBar all render committed JSON - no loading
state, no fetch timeout, no demo data dressed up as real. `npm run build`
passes.

### Two data traps worth remembering

1. **Blockscout's indexed ERC-1155 balances are wrong.** Every sampled ZOR
   balance came back short (1334 vs 1570, 686 vs 738) and 11 holders never
   appeared in its holder list at all. Balances are now read via `balanceOf` and
   the address set is seeded from transfer history. Both ledgers reconcile to a
   residual of 0, and `summary.json` carries that residual so a regression is
   visible. **Do not switch these back to the indexer for speed.**
2. **OREC emits an event every time a voter changes their vote**, while
   replacing the stored one - so summing every `WeightedVoteIn` double-counts
   reversals. It showed as nine proposals reading 3,094 yes *and* 3,094 no from
   a single 3,094-weight wallet. `tally()` in `pull-data.mjs` now reduces to the
   standing vote per voter before summing; proposals carry `finalVotes`,
   `voterCount` and `voteChanges`, and the full event log stays as history.

---

## Part 2 - the two fractal docs

**`respect/LEDGER-RECONCILIATION.md`** (commit `9008ca0`) - the OG-to-ZOR
migration as a decision surface. The L5 prerequisite is that every active member
can vote; today most cannot, and this measures exactly how many and who.

- Of the 27 people awarded ZOR in the last 12 settled periods, **14 hold zero OG
  and have no vote weight at all**; 9 more sit under the 1,000 minimum. Across
  the whole ZOR era it is 47 of 70.
- Inversely, **101 addresses hold OG and no ZOR** - 44% of the electorate by
  weight - and have not appeared in a settled game since.
- OG was never minted per member: 69 mints all went to one treasury wallet which
  distributed by transfer, with zero peer-to-peer transfers and no per-award
  metadata. ZOR is minted per award by OREC with period, group and rank packed
  into the token id. This is why ZOR can produce a real timeline and OG cannot.
- Five genesis allocation options scored on the same electorate.
  **Recommendation: OG + ZOR 1:1, paired with a minimum-weight change in the
  same proposal** - unified supply otherwise takes the number of addresses that
  can pass a proposal alone from 12 to 18 with nobody voting for it.
- Identity is the soft spot: name coverage is 95% on OG and 47% on ZOR, so the
  people currently playing are the ones we cannot name. No name in the bot
  export maps to two wallets, so nothing can prove a ZOR-only wallet belongs to
  an existing OG holder - which is exactly what a naive 1:1 sum double-counts.

**`respect/SIGNER-COMMITTEE.md`** (commit `3aed68b`) - the OREC bottleneck,
measured against all 153 proposals. Reading `Orec.sol` against the deployed
contract changed the recommendation:

- **`propose`, `vote` and `execute` are all permissionless.** There is no signer
  set to join, no key to be added to. A multisig on execution fixes nothing.
- The bottleneck is three things wearing one name: **weight** (no proposal in
  153 ever needed a second voter), **operations** (130 of 134 executions are one
  person doing what anyone could do; two proposals sit passed and unexecuted,
  one for 28 days), and **keys** (OG's `DEFAULT_ADMIN_ROLE` has exactly one EOA
  member and can still mint vote weight - highest severity, independent of the
  other two). ZOR is owned by OREC and OREC by itself; those are already fine.
- Surfaced an existing Gnosis Safe at `0x7A944994cE587bD133c2E6C683FE34951cBb5575`
  - v1.4.1, 3 owners, **one unidentified**, **threshold 1**. It held the largest
  single OG position for four days in December 2025. Redundancy without a check.
- Recommendation: execution rota first (zero chain cost), then move the OG admin
  role to a real-threshold Safe, then the unified ledger which makes step 2
  obsolete. Forking OREC explicitly ruled out.
- Says plainly what none of it fixes: 137 of 153 proposals had one voter because
  the others did not turn up, not because they were blocked. The L5 gate is
  behavioural.

**`scripts/verify-claims.mjs`** (commit `4c5986f`) - both docs quote hard
figures that go stale the moment anyone reruns the puller. This holds **all 62
of them** as expectations and exits non-zero on drift. It caught one on the
first run (47.8 weeks, not 47.7 - a rounding step in the wrong order). All 62
currently match. Run it after every pull; a drift means the prose needs an edit,
not that the data is wrong.

---

## The unbroken-weeks finding, and how it was handled

**No chapter prose was touched.** `whitepaper/README.md` gained three rows on
the v0.2 accuracy queue and the existing rows were sharpened with measured
figures.

The framing, confirmed by the coordinator as correct: **the chain records
settlement, not attendance.** Provable on-chain - latest period is 110, the ZOR
ledger covers periods 67-110 with no awards at 71, 72 or 103, the longest
consecutive run ending at 110 is **7**, and those 41 settled periods span 47.8
weeks with a median 7-day gap and a largest gap of 29 days. Not provable -
whether the game met in any given week. Periods 1-66 predate ZOR and ran on OG,
which carries no per-week record at all, so two thirds of the claimed history
cannot be checked on chain even in principle.

So the on-chain run of 7 and a "100+ unbroken weeks" claim are **different
claims and neither refutes the other**. Do not restate the streak as 7. What
needs fixing is only the chapters citing on-chain verifiability as the reason to
trust a number the chain cannot speak to. Full working in
`respect/LEDGER-RECONCILIATION.md` section 6.

---

## Open Zaal-taps

From the reconciliation doc:

1. **Pick the allocation rule.** Recommendation is OG+ZOR 1:1 plus a
   minimum-weight change. The competing case for ZOR-only is real and is a
   political choice about whether the OG era keeps its franchise.
2. **Does the genesis rule read from chain or from ZAOOS?** `LAUNCH-RUNBOOK.md`
   Phase 1 blocks on a ZAOOS export. The on-chain snapshot is now a complete,
   reconciled alternative. If ZAOOS holds awards that never reached chain it is
   still needed; if not, this snapshot can be the seed and the blocker clears.
3. **Resolve the 12 unnamed active wallets**, and decide whether cross-wallet
   identity needs checking before genesis.
4. **The 23 wallet-less names** - excluded from genesis, or held in escrow?
5. **Period 0** - one stray award, 110 Respect, 2026-08-18. Explain or burn.

From the signer doc:

6. **Name 3-5 executors.** Cheapest item on either page, no proposal needed.
7. **Who is `0xb9f12b0a…829f`?** Third owner of the threshold-1 Safe.
8. **What is that Safe for** - operations or governance custody? Sets the
   threshold.
9. **Move the OG admin role to it now, or wait for the unified ledger?**
   Recommendation is now; a single EOA that can mint vote weight is the
   highest-severity item and the migration has no date.
10. **Investigate the 11 recurring `mintRespectGroup` execution failures?**
    Eleven across ten months is a pattern, and each is a week of results that
    did not settle first time.
11. **The two passed-but-unexecuted proposals** - execute, cancel, or expire?

---

## Next steps for whoever picks this up

1. Name the 40 unnamed holders - `data/members.json` has them under
   `unnamedHolders`, ranked. Unmined sources: `zao-fractal-bot`'s Supabase
   migrations, Farcaster handles.
2. Once Zaal answers tap 1, do the whitepaper v0.2 pass in one commit across
   ch01, ch04, ch06, ch07, ch08, ch09 and the repo README.
3. Member write-up view: `awardsForMember()` in `dao/src/lib/data.ts` already
   returns a member's full history; it is only surfaced as a leaderboard
   expansion so far.

---

## Resume point

```bash
node scripts/pull-data.mjs        # refresh data/*.json from OP Mainnet
node scripts/build-members.mjs    # refresh the wallet -> name map
node scripts/verify-claims.mjs    # re-check all 62 figures in the docs
cd dao && npm run dev             # browse the same numbers
```

Nothing deployed, nothing pushed. 12 commits ahead of origin.
