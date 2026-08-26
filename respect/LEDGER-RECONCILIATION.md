# OG to ZOR - ledger reconciliation

**Status:** decision surface, 2026-08-26. Nothing here executes. Every number is
measured from the committed snapshot in `data/`, pulled at OP Mainnet block
156,053,890 on 2026-08-26. Reproduce with `node scripts/pull-data.mjs`.

This document exists because a single unified ledger is the prerequisite for
**L5 - Autonomous operations** on the decentralization scale, whose gate is that
governance runs without a single human being load-bearing. L5 assumes every
active member can vote. Today most of them cannot, and this is the measurement
of exactly how many, exactly who, and exactly what the options cost.

The build side of the answer already exists: `ZAORespect`, a soulbound ERC-20
implementing the `IRespect` interface the current OREC reads, is built and
tested locally in `zaofractal-contracts` (see [README.md](./README.md) and
[LAUNCH-RUNBOOK.md](./LAUNCH-RUNBOOK.md)). What was missing was the genesis
number - what balance each member starts with, and who has no resolvable
identity to start one for. That is what follows.

---

## 1. The two ledgers, measured

| | OG Respect | ZOR Respect |
|---|---|---|
| Address | `0x34cE89baA7E4a4B00E17F7E4C0cb97105C216957` | `0x9885CCeEf7E8371Bf8d6f2413723D25917E7445c` |
| Standard | ERC-20, 18 decimals | ERC-1155 |
| Deployed | 2024-07-30 | 2025-09-11 |
| Holders with a non-zero balance | 122 | 64 |
| Addresses that ever held any | 122 | 70 |
| Respect outstanding | 38,484 | 17,418 |
| Confers vote weight in OREC | **Yes** | No |
| Controlled by | one wallet (Zaal), sole `DEFAULT_ADMIN_ROLE` holder | OREC itself |
| Last issuance | 2025-12-09 mint, 2025-12-18 distribution | 2026-08-25, period 110 |

Both ledgers reconcile to zero residual against chain state: OG holder balances
sum exactly to the 38,484 total supply, and ZOR minted (18,266) minus burned
(848) equals held (17,418). `summary.json` carries those residuals so a future
regression is visible rather than assumed away.

### How each ledger was actually issued

These differ more than the whitepaper currently says, and it changes what a
migration can infer.

**OG was never minted per member.** All 69 mints went to one treasury wallet
(`0x7234c36A...E9Af`, Zaal), which then distributed Respect by transfer - 447
distributions to 123 recipients. There were **zero peer-to-peer transfers**: the
token is soulbound in practice, and every balance traces to a treasury send. Two
transfers came back to the treasury, one of them 3,094 Respect on 2025-12-12,
which is where the largest single OG holding today comes from. OG carries no
per-award metadata at all - no period, no group, no rank. A transfer of 110
Respect on a Tuesday is indistinguishable from any other transfer of 110.

**ZOR is minted per award, by governance, with metadata.** Each award is a
distinct ERC-1155 token id that packs the mint type, the period number, and the
recipient; the token metadata carries the breakout group, the rank, and the
Respect denomination. 333 awards across 41 settled periods, all minted by OREC.
This is why the Timeline tab in `dao/` can show the real game and why OG cannot.

---

## 2. The enfranchisement gap

OREC reads vote weight from OG, live at vote time. So a member's ability to vote
today depends entirely on a ledger that stopped being distributed in December
2025 and was never connected to the weekly game.

Taking the 27 people awarded ZOR in the last 12 settled periods:

| | Count |
|---|---|
| Active in the last 12 periods | 27 |
| Of those, holding zero OG - **no vote weight at all** | **14** |
| Of those, holding some OG but under the 1,000 minimum weight | 9 |
| Of those, holding enough OG to carry a proposal alone | 4 |

Widen the window and the gap widens with it: 28 of 47 people active in the last
26 periods hold zero OG. Across the whole ZOR era, **47 of the 70 people who
have ever been awarded ZOR have no vote weight whatsoever**.

The inverse is just as stark. 101 addresses hold OG and no ZOR - people who were
issued vote weight in the OG era and have not appeared in a settled Respect Game
since. They hold 17,067 Respect, 44% of the entire electorate by weight.

Concentration under the current ledger: 9 holders carry more than half the vote
weight, 16 carry a two-thirds supermajority, and 12 individually clear the 1,000
minimum weight and can therefore pass a proposal alone.

**This is the L5 blocker stated precisely.** It is not that governance is slow.
It is that the people doing the work are structurally unable to govern, and the
people who can govern are largely not doing the work.

---

## 3. Identity - who maps, who does not

A genesis allocation needs to know that wallet X and wallet Y are the same
person, or it will either double-count or strand someone. Here is what the
Discord bot export in `data/members.json` can and cannot resolve.

| | Named | Total | Coverage |
|---|---|---|---|
| OG holders | 116 | 122 | 95% |
| ZOR holders | 30 | 64 | 47% |
| Active in last 12 periods | 15 | 27 | 56% |
| All addresses ever holding | 125 | 165 | 76% |

The shape of the gap matters: **name coverage is excellent on the old ledger and
poor on the new one.** The bot's `names_to_wallets.json` was built during the OG
era. Everyone who joined since is largely an anonymous address, and they are
disproportionately the people currently playing.

Two harder problems sit underneath:

1. **No cross-wallet links exist.** Not one name in the export maps to more than
   one address. So the export cannot currently prove that any of the 43
   ZOR-only wallets belongs to someone who already holds OG under a different
   wallet. If any do, a naive OG+ZOR sum credits one person twice. Resolving
   this needs the Discord user ids (`wallets.json` keys) checked against a
   member roster, which is a `zao-fractal-bot` / ZAOOS question, not an
   on-chain one.
2. **23 names in the export have no wallet at all.** They cannot receive a
   genesis balance until they register one. `LAUNCH-RUNBOOK.md` Phase 1 already
   flags this; the count is 23: BrookXKoda, Carlos (Gen-Ops), Christian
   (Doglins), Cristal Maze, DUCK, Dan Shinder, Digital Samurai, Erin Hyvin,
   Formerly LEN, GX, Goldilox, Hexidized, I am Thanos, Issac Bell, IzMpande,
   J3nn (OneLOVE), Jack Miller, Makk Jay, Miss Ev, Phantom Mode, RJ, Rensley,
   The hill.

The 12 unnamed wallets active in the last 12 periods are the priority: they are
playing every week, they hold between 16 and 738 ZOR, and nothing on file says
who they are.

---

## 4. Genesis allocation options

Each option below is the same electorate scored a different way, with the
current 1,000 minimum weight held constant. "Enfranchised" counts how many of
the 27 recently active members would hold any vote weight at all.

| Option | Voters | Total supply | Largest holder | Holders for >50% | Holders for 2/3 | Can pass alone | Active enfranchised |
|---|---|---|---|---|---|---|---|
| **A. OG only** (today) | 122 | 38,484 | 8.0% | 9 | 16 | 12 | 13 of 27 |
| **B. ZOR only** | 64 | 17,418 | 9.0% | 11 | 17 | 2 | 27 of 27 |
| **C. OG + ZOR, 1:1** | 165 | 55,902 | 7.0% | 12 | 21 | 18 | 27 of 27 |
| **D. OG + ZOR, ZOR doubled** | 165 | 73,320 | 6.9% | 13 | 23 | 22 | 27 of 27 |
| **E. C plus burned ZOR** | 165 | 56,551 | 7.0% | 12 | 21 | 18 | 27 of 27 |

Top of the electorate under option C:

| # | Member | Total | Share | OG | ZOR |
|---|---|---|---|---|---|
| 1 | Zaal | 3,894 | 7.0% | 3,094 | 800 |
| 2 | Hurric4n3ike | 3,688 | 6.6% | 2,512 | 1,176 |
| 3 | CandyToyBox | 3,484 | 6.2% | 1,914 | 1,570 |
| 4 | Attabotty | 3,079 | 5.5% | 3,079 | 0 |
| 5 | EZinCrypto | 2,666 | 4.8% | 2,310 | 356 |
| 6 | Prizem | 2,590 | 4.6% | 2,278 | 312 |
| 7 | Ohnahji B | 1,859 | 3.3% | 1,265 | 594 |
| 8 | Gneric | 1,609 | 2.9% | 1,499 | 110 |

### Reading the table

**Option A is the status quo and fails the L5 gate outright** - half the active
membership cannot vote.

**Option B enfranchises exactly the people who play**, and is the most
decentralised on every concentration measure that matters for the floor: only 2
addresses could carry a proposal alone, versus 12 today. Its cost is that it
disenfranchises 101 OG holders in one step, including four of the eight largest
current voters, one of whom (Attabotty, 3,079 Respect, the second-largest
holding) has no ZOR at all. That is a real political act, not a technical one.

**Option C is the migration the runbook already assumes** - lifetime Respect,
both eras, 1:1. It enfranchises everyone active while stranding nobody. Its cost
is the opposite of B's: it *increases* the number of addresses that can pass a
proposal single-handedly from 12 to 18, because the 1,000 minimum weight is an
absolute number and the supply grows underneath it.

**Options D and E are variants of C** and change little. D doubles ZOR to weight
the current era more heavily; it makes solo-pass worse (22 addresses), which is
the opposite of the intent. E adds back the 848 burned Respect, moving the total
by 1.2% - burns were corrections, and re-crediting a correction is hard to
justify.

### Recommendation

**Option C, with the minimum weight raised in the same proposal.**

C is the only option that both enfranchises every active member and strands no
existing holder, which makes it the one that can pass under the current
electorate - and it has to pass under the current electorate, because that is
who votes on it. B is arguably the better end state, but asking 101 OG holders
to vote away their own franchise is a harder proposal than it needs to be, and
the same effect can be reached later through decay or a re-basing once the
unified ledger exists.

The solo-pass regression is the reason to move the minimum weight at the same
time. Today's 1,000 floor is 2.6% of OG supply. Under C the same 1,000 is 1.8%
of supply, which is a quiet loosening of the pass condition nobody voted for.
Holding the floor at its current *share* means setting it to roughly 1,450, which
brings solo-pass back to 12 addresses - the same as today. Whether the floor
should instead be expressed as a percentage of supply so it never drifts again
is a design question worth settling now rather than at the next migration.

---

## 5. Second-order dials

These are decisions the migration forces whether or not anyone makes them
deliberately.

- **Minimum weight.** Absolute (drifts as supply grows) or a share of supply
  (self-correcting). See above.
- **Per-voter cap.** There is none today, and none of the options introduce one.
  The largest holder sits at 7% under C, so a cap is not urgent - but it becomes
  urgent the moment the ledger stops being frozen and starts growing weekly.
- **Does the unified ledger keep growing?** If the new token is both reward and
  vote, every weekly settlement changes the electorate. That is the point, but
  it means vote weight is no longer stable between proposals, and OREC reads it
  live rather than by snapshot - see the hazard in
  [SIGNER-COMMITTEE.md](./SIGNER-COMMITTEE.md) section 3.
- **Decay.** Not live today and, per the whitepaper's own v0.1 accuracy pass,
  reframed as a design option rather than a feature. A unified growing ledger
  makes decay more attractive, not less, because it is the mechanism that keeps
  the OG era from dominating forever without an explicit disenfranchisement
  vote.
- **Period 0.** One stray ZOR award exists at period number 0, minted
  2026-08-18, 110 Respect to a single recipient. It is excluded from the session
  view in the dashboard. It should either be explained or burned before the
  ledger is treated as canonical.

---

## 6. What is provable on-chain, and what is not

The pull settles some numbers that appear in the whitepaper and the repo README.
It also draws a line that matters for how they get restated.

**Provable from chain data:**

- The latest on-chain period number is **110**, minted 2026-08-25.
- The ZOR ledger covers periods **67 to 110**, and inside that range periods
  **71, 72 and 103 have no awards**. The longest run of consecutive period
  numbers ending at 110 is **7**.
- Those 41 settled periods span **47.7 weeks**, at a median of 7 days apart, with
  ten gaps longer than 10 days and a largest gap of 29 days.
- **169 addresses** have ever held Respect on either ledger.
- Mean participants per settled period: **8.1**, range 3 to 17.

**Not provable from chain data:**

Whether the Respect Game itself ran in a given week. The chain records
*settlement*, not attendance. A meeting that happened but was never submitted, or
was submitted late and batched with another, is invisible here - and the 29-day
gaps look exactly like that. Periods 1 to 66 predate the ZOR ledger entirely and
were run against OG, which carries no per-week record at all, so two thirds of
the claimed history cannot be checked against chain data even in principle.

So the on-chain streak of 7 and a claim like "100+ unbroken weeks" are **not the
same claim** and neither refutes the other. One is about settlement, the other is
about the ritual. The whitepaper currently makes the ritual claim while citing
on-chain verifiability as the reason to trust it, and that is the part that needs
fixing - not necessarily the number. This has been added to the v0.2 accuracy
queue in `whitepaper/README.md` rather than edited into the chapters here.

---

## 7. Open calls - Zaal only

1. **Pick the allocation rule.** Recommendation above is C plus a minimum-weight
   change in the same proposal. The competing case for B is real and is a
   political choice about whether the OG era keeps its franchise.
2. **Does the genesis rule read from chain or from ZAOOS?** `LAUNCH-RUNBOOK.md`
   Phase 1 blocks on exporting `respect_members`, `fractal_sessions` and
   `fractal_scores`. The on-chain snapshot is now a complete, reconciled
   alternative for the ZOR era and for all OG balances. If ZAOOS holds awards
   that never reached chain, it is still needed; if it does not, this snapshot
   can be the seed and the blocker clears. **Which is it?**
3. **Resolve the 12 unnamed active wallets**, and decide whether cross-wallet
   identity needs checking at all before genesis. If any active member holds
   both an OG wallet and a separate ZOR wallet, option C double-credits them.
4. **The 23 wallet-less names** - excluded from genesis until they register, or
   held in escrow?
5. **Period 0** - explain or burn.
6. **Should the OG admin role be relinquished before or after migration?** It is
   a single wallet today, and it can still mint vote weight. See
   [SIGNER-COMMITTEE.md](./SIGNER-COMMITTEE.md).

---

## Reproducing this

```bash
node scripts/pull-data.mjs        # refresh data/*.json from OP Mainnet
node scripts/build-members.mjs    # refresh the wallet -> name map
cd dao && npm run dev             # browse the same numbers
```

Every figure in this document comes from `data/summary.json`,
`data/og-respect.json`, `data/zor-respect.json`, `data/award-events.json`,
`data/periods.json` and `data/members.json`. Nothing is estimated.
