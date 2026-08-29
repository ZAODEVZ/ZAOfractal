# Handoff - fractal dashboard + fractal docs (2026-08-25/26)

Repo: `ZAOfractal`, branch `main`, **ahead of origin and nothing pushed**.
Exact count: `git rev-list --count origin/main..HEAD`.

> ## DO NOT PUSH - this is a PII gate, not a preference
>
> `gate_4c836a146dcd`, Zaal's, raised by the estate PII pass which flagged this
> repo **NEEDS-REDACTION**. **Pushing this branch would be the disclosure event
> for a 144-person name-to-wallet linkage.** Verified against origin:
>
> - `data/members.json` **does not exist on origin** and binds 144 community
>   names to Optimism addresses, sourced from a Discord bot export.
> - Commit `38884b1` writes 129 of those mappings into
>   `dao/src/lib/constants.ts`. That file **is on origin today and contains no
>   names** - just the empty `KNOWN_MEMBERS` stub with a commented-out example.
>
> So the linkage exists nowhere public right now, and a push publishes it in two
> places at once. This is not fixable by editing the tip: `38884b1` is in the
> middle of the branch, so the names are in the history whatever HEAD looks
> like. Redaction here means a rewrite, not a revert.
>
> Nothing in the four `respect/` docs depends on the names being committed -
> they quote roughly twenty of them inline, which is a separate and much smaller
> question. `scripts/build-members.mjs` regenerates the full map from the bot
> export on demand, so the file being local-only costs nothing operationally.
>
> Do not push, do not open a PR, do not merge to a branch that has a remote.
> The decision is Zaal's.

Three lanes ran in this pane. The dashboard data layer (task_52ea0cb8c31c)
landed first; the two fractal docs (task_fa960c63996b, task_b5f03719b980) were
built on its output and are closed and coordinator-verified; the facilitator
bench (task_5e424cc44289) followed and produced two more runbooks.

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

**`scripts/verify-claims.mjs`** (commit `4c5986f`, extended in `d306f75` and
`f36f71e`) - the respect/ docs quote hard figures that go stale the moment
anyone reruns the puller. This holds **all 98 of them** as expectations and
exits non-zero on drift. It has caught two real errors so far: 47.8 weeks (not
47.7, a rounding step in the wrong order) and 29 people ranked in the recent
window (not 27, because two of them never had their Respect minted). All 98
currently match. Run it after every pull; a drift means the prose needs an edit,
not that the data is wrong.

---

## Part 3 - the facilitator bench lane (task_5e424cc44289)

The brief arrived truncated - only its last three sentences survived the
compaction boundary, and they set the hard constraint (a naming decision only,
nobody contacted, write it as a proposed bench, do not push). The task title
`facilitator-bench` and the L1 section of
`~/zao-vault/notes/zao-decentralization-scale.md` supplied the rest. One doc was
written before that recovery and one after, and both are worth keeping.

**`respect/EXECUTION-RUNBOOK.md`** (commit `d306f75`) - Step 1 of the
SIGNER-COMMITTEE migration path, written out. Execution on OREC is already
permissionless, so this is a naming and procedure problem. Three findings came
out of tracing the eleven reverted executions:

- **Every revert has a cause.** Seven happened because a recipient already held
  an award for that period (ZOR ids pack `mintType|period|owner`, so one badge
  per person per period). The other four have no duplicate at all, and the
  Blockscout internal-transaction traces show Respect1155 calling out to
  recipients that hold code - three EIP-7702 delegated EOAs and one EIP-1167
  proxy failing the ERC-1155 acceptance check. **A member who upgraded to a
  smart-account wallet silently stopped being able to receive Respect, and
  nothing told them.**
- **A reverted execution spends the proposal,** so nobody ever recovered these.
  **24 award slots across 8 periods were never minted to 16 people, worth 1,672
  Respect.** Seven of the sixteen have no name on file. That table is the
  bench's first real job.
- **All 153 proposals were created by `vote(bytes32,uint8,string)`, never by
  `propose(Message)`.** The chain records what was approved only as a hash; the
  award list lives off chain until execution puts it in the calldata. So the
  executor has to already hold the Message. Its known home, ornode, returns 404
  on every path tried (`/`, `/proposals`, `/api/proposals`, `/getProposals`,
  and `POST /` answers `Can not POST /`) while `zao.frapps.xyz` returns 200.
  **This is the real reason execution never spread past two wallets, and it
  blocks the terminal path for any rota.**

Proposed executor bench: Ohnahji B, CandyToyBox, Meta Mu, by stated criteria.
Tadas is called out separately - the only non-Zaal executor on record, four
times, but no Respect Game award since period 68.

**`respect/FACILITATION-RUNBOOK.md`** (commit `f36f71e`) - the actual L1 item.
Whitepaper ch05 documents the mechanism; this is the operational half.

- **The room is small.** The scale note describes ~40 active per session. The
  last 15 settled sessions ranked **4 to 12 people each**, ran a single breakout
  group **11 times out of 15**, and have never run three. A second facilitator
  is not for overflow - it is so the meeting can happen without one person.
- **Zaal was ranked in 14 of those 15 sessions.** No one else exceeded 10.
- **Bench named by Zaal (gate resolved overnight): Ohnahji B, Iman and Jose.**
  The doc records that choice and, separately, what the attendance ledger says.
  Jose is 9/15 and Ohnahji B is 8/15, first and third among current non-Zaal
  names, so the measurement agrees on those two. **Iman is not in the ledger at
  all** - not in the 144 named members, not among the 169 addresses that ever
  held Respect. The doc states plainly that this is a gap in the data or a role
  outside the Monday game and **not evidence against him**; Zaal named him and
  knows things the chain does not. The one operational consequence is real
  though: no registered wallet visible means no Phase 5 submission, which is a
  first-night blocker with a five-minute fix.
- **Meta Mu (8/15, ranked in period 110) is recorded as the highest-attendance
  current name Zaal did not choose** - same treatment as Hurric4n3ike (10/15 but
  nothing since 105). The measurement says what it says regardless of the
  decision, and a bench of three that loses someone will want to know where the
  evidence pointed. Other alternates: CandyToyBox (7/15, ranked in 110), Zach L.
  (7/15), and `0xf73485a6…a8ea` (7/15 including 110, no name on file).
- Section 6 is an inventory of what a new facilitator hits on night one with no
  documented answer: who can run `/randomize`, which wallet submits Phase 5 and
  whether it needs OG weight, where the fractal number comes from, what to do
  with a group of 7 (three have happened against a documented cap of 6), what to
  do when a round does not converge, who to escalate to mid-meeting. None are
  decisions. They are the difference between a bench that exists and one that
  can be used.
- The rota is sequenced shadow (weeks 1-2) then solo Monday (3-4) then the
  second meeting (5+), because the L1 gate asks for more meetings *and* more
  facilitators at once and starting both cold is how it stalls.

**Both docs state three times over that nobody named has been contacted, asked,
or agreed to anything.** The facilitator bench is now Zaal's decision rather
than a proposal, and being named is still not being asked. The executor bench in
EXECUTION-RUNBOOK.md is a separate role and remains a proposal; the two overlap
by one name and the docs say not to merge them.

Three more ch05 claims went to the whitepaper v0.2 queue rather than being
edited in place: the 48-hour vote/veto windows (the contract says 72 each),
"vote weight is frozen at proposal creation time" (OREC reads it live, no
snapshot), and the facilitator naming.

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
    **Now answered** - both causes traced, see Part 3 and
    `respect/EXECUTION-RUNBOOK.md` section 6. What remains is a decision, not an
    investigation: approve re-proposing the 24 unsettled award slots.
11. **The two passed-but-unexecuted proposals** - execute, cancel, or expire?
    One has been waiting 28 days.

From the two runbooks:

12. **Where does a proposal's Message actually come from?** ornode 404s on every
    path while the Frapps UI works. This blocks the terminal path for any
    execution rota and is the single highest-leverage answer on this list.
13. **Ask the facilitator bench - Ohnahji B, Iman and Jose.** Named by Zaal,
    none of them contacted. And **accept, edit or replace the executor bench**
    (Ohnahji B, CandyToyBox, Meta Mu), which is a different role and still a
    proposal.
14. **Does Iman have a registered wallet?** Not in `data/members.json` at all.
    Facilitating needs no wallet until Phase 5, and then it does.
15. **Ask Tadas** (only non-Zaal executor, four times, no award since period 68)
    and **Hurric4n3ike** (highest non-Zaal attendance, nothing since period 105)
    directly. Both are either the strongest candidate on their page or someone
    who has stepped back, and only a conversation tells them apart.
16. **Who is `0xf73485a6…a8ea`?** 7 of the last 15 sessions including period
    110, no name on file. On attendance they belong on the facilitator bench.
17. **Name the six other unnamed backlog wallets** so people can be told what
    they are owed.
18. **Answer the six undocumented items** in `FACILITATION-RUNBOOK.md` section 6
    (bot permissions, submitting wallet, fractal number, oversized groups,
    non-converging rounds, mid-meeting escalation). Cheapest unblock on the
    list; none of them is a decision.
19. **Is `/randomize` gated to one Discord role?** If so it is a five-minute fix
    and it is the literal first blocker for a second facilitator.
20. **`gate_4c836a146dcd` - the name-to-wallet linkage.** Redact and rewrite
    history, keep `data/members.json` local-only and strip `38884b1`, or accept
    publication. See the block at the top of this file. This is the only thing
    blocking a push and it is not a formality.

---

## Next steps for whoever picks this up

1. Name the 40 unnamed holders - `data/members.json` has them under
   `unnamedHolders`, ranked. Unmined sources: `zao-fractal-bot`'s Supabase
   migrations, Farcaster handles. Seven of them are owed unminted Respect and
   one of them is 7-of-15 on the facilitator attendance table, so this is no
   longer cosmetic. **Note this cuts against `gate_4c836a146dcd`** - every name
   added here makes the linkage larger, so do it knowing the redaction question
   is still open.
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
node scripts/verify-claims.mjs    # re-check all 103 figures in the docs
cd dao && npm run dev             # browse the same numbers
```

Nothing deployed, nothing pushed. Check how far ahead with
`git rev-list --count origin/main..HEAD` - the number moves with every commit
here, so it is not written down.

**Read the push gate at the top of this file before doing anything with a
remote.** `gate_4c836a146dcd` is open and the branch carries a 144-person
name-to-wallet linkage that does not exist on origin.
