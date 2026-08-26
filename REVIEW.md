# Branch review - everything this branch would publish

**For Zaal, before anything reaches origin.** This branch is unpushed by
decision, not by accident: gate `gate_4c836a146dcd` is open and is yours to
close. Nothing here has been pushed.

**Git author does not separate the lanes.** Every commit on this branch is
authored `zao-assistant`, whether it came from the whitepaper work or the
frapp-gh work. Do not read the author field as a boundary - the hash lists in
this file are the only thing that reconciles who did what.

Regenerate the commit list with:

```bash
git log --oneline origin/main..HEAD
git rev-list --count origin/main..HEAD
```

No number is printed here on purpose. This file is itself one of the commits,
so any count written into it is wrong the moment it is committed - the earlier
draft said 21, then 34, and both were stale on arrival. Run the command.

---

## Read this part first: what the branch publishes about people

Two commits are the reason the gate exists. Both put **real community names
against real wallet addresses** into a repo that deploys to a public site.

| Commit | What it publishes |
|---|---|
| `38884b1` **dao: fill KNOWN_MEMBERS from the fractal Discord bot exports** | Adds `data/members.json` - 144 community names bound to wallet addresses, sourced from the fractal bot's `names_to_wallets.json` - and writes the same name-to-address map into `dao/src/lib/constants.ts`, which ships to the browser. |
| `d74aa43` **data: read ZOR balances from chain, not the indexer** | Regenerates `data/members.json` and `constants.ts` on the reconciled snapshot. Same linkage, refreshed. |

Neither file exists on origin today. Pushing either one is the act that makes
the linkage public, and it is irreversible in practice - once it is in a public
git history it is in clones, forks, caches and archives.

**And it is worse than a file sitting in git.** `KNOWN_MEMBERS` in
`dao/src/lib/constants.ts` is not reference data that a reader has to go
looking for. It is imported by `dao/src/lib/format.ts`, whose `memberName()`
is what every tab calls to render an address, and directly by
`dao/src/pages/LeaderboardTab.tsx`. `dao/vercel.json` builds the app to a
static bundle. So the full 144-entry name-to-wallet map is compiled into the
JavaScript served to **every visitor of the deployed dashboard**, whether or
not they ever clone anything. Publishing it is not disclosure-on-request; it
is publication.

One precision, in the other direction: `data/members.json` itself is not
bundled. `dao/src/lib/data.ts` imports only the six chain-data files
(`summary`, `zor-respect`, `og-respect`, `award-events`, `periods`,
`orec-proposals`), none of which carry names. The exposure runs entirely
through `constants.ts`. That matters if the answer turns out to be a
qualified yes: shipping the snapshot without the name map is a separable
change, and the dashboard degrades to short addresses rather than breaking.

**Three partial-linkage commits sit downstream of that decision.** They publish
names against *truncated* addresses (`0x64a15b1d…b3e1`) in prose:

- `3aed68b` and `d306f75` - `respect/SIGNER-COMMITTEE.md` and
  `EXECUTION-RUNBOOK.md`, naming who votes and who executes.
- `f36f71e` and `7c9bf35` - `respect/FACILITATION-RUNBOOK.md`, naming an
  attendance table and a proposed facilitator bench.

A truncated address is not anonymous when `data/members.json` is in the same
repo, and it is weakly identifying even without it, since the full address is
one Blockscout query away from any of the figures quoted alongside it. If the
answer on the two linkage commits is no, these three need a second pass rather
than an automatic yes.

**Nobody on the facilitator bench in `FACILITATION-RUNBOOK.md` has been
contacted or has agreed to anything.** The doc says so in its own opening, but
it is worth repeating here: publishing it names three people in a role they
have not accepted.

---

## The rest, oldest to newest

| Commit | What it does |
|---|---|
| `cb4396a` | gitignore: excludes every `.env` variant, not just `.env*.local`. Pure hygiene. |
| `b8134b5` | README catches up to the finished whitepaper; logs the v0.2 accuracy queue. Docs only. |
| `864c9b5` | Adds `scripts/pull-data.mjs` and the first committed OP Mainnet snapshot under `data/`. Public chain data, no names. |
| `38884b1` | **Linkage - see above.** |
| `d74aa43` | **Linkage - see above.** Also fixes ZOR balances to read from chain rather than the indexer, and reconciles both ledgers to zero residual. |
| `2af2642` | dao/ reads the committed snapshot instead of the dead ornode endpoint. The dashboard works offline now. |
| `2685697` | Handoff note for the dashboard lane. |
| `9008ca0` | `respect/LEDGER-RECONCILIATION.md` - the OG-to-ZOR decision surface. Measured, no recommendation executed. |
| `7eb6514` | Counts a changed vote once instead of twice, in the puller and the dashboard. Data correctness. |
| `3aed68b` | `respect/SIGNER-COMMITTEE.md` - the OREC bottleneck, measured. **Names voters.** |
| `4c5986f` | `scripts/verify-claims.mjs` - every figure in the respect/ docs held as an expectation against the snapshot. |
| `cbb54d3` | Handoff note for the docs lane. |
| `d306f75` | `respect/EXECUTION-RUNBOOK.md` and a proposed executor bench. **Names executors.** |
| `f36f71e` | `respect/FACILITATION-RUNBOOK.md` and a proposed L1 facilitator bench. **Names an attendance table.** |
| `a192ec3` | Handoff note for the facilitator lane. |
| `2e529f8` | Handoff note stops hardcoding the ahead-of-origin count. |
| `7c9bf35` | Records the named facilitator bench and what the ledger can and cannot say about it. **Names three people.** |
| `fc55278` | Records the PII push gate; fixes a dangling cross-reference. |
| `0b0e193` | **ch01 v0.2** - separates the ritual claim from the chain claim. The streak stays a community record; the verifiability paragraph says what the chain actually proves. Period number settled at 110. |
| `9bdd062` | **ch03 v0.2** - "40+ members in 6-7 breakout rooms" and "60-80% participation" corrected to the measured room; "242+ transactions" corrected. |
| `e6bf95f` | **ch04 v0.2** - says which ledger votes (OG, not ZOR); replaces a flattering Gini of 0.23 with three measured ones, the load-bearing one 0.73 on the ledger that votes. |
| `6e2409e` | This file. |
| `b0c6ea8` | **ch05 v0.2** - the vote and veto windows are 72 hours, not 48; vote weight is read live, never frozen; the "OREC minting authority" framing replaced with the three real bottlenecks. |
| `27e21f7` | This file - the name map is served to every dashboard visitor. |
| `6b78583` | **ch06 v0.2** - two config-table rows that describe parameters the contract does not have; "242+ transactions, all successful" corrected to 316 with 11 execution reverts. |
| `4eda850` | **ch07 v0.2** - stops presenting other fractal communities' 60-80% turnout as something ZAO has proven. |
| `d59d996` | **ch08 v0.2** - the streak table, the four member counts, and the Fibonacci doubling that changes no ratio. |
| `9adf568` | **ch09 v0.2** - the bottleneck was diagnosed as the wrong mechanism; adds the single-member OG admin role, which appeared in no previous draft. |
| `5cc9ea9` | **ch10 v0.2** - status for every expired target date; the signer-committee item superseded because it cannot be built. |
| `4666cb2` | **ch11 v0.2** - keeps the manifesto voice, fixes what it claims the chain proves. |
| `51aefa1` | Sweeps the residual v0.1 phrasings the per-chapter passes missed. |
| `4555291` | **ch00 v0.2** plus `scripts/assemble-whitepaper.mjs`; the assembled document is regenerated from the drafts. |
| `c12131e` | whitepaper README: what the pass corrected, and the five things it could not close. |
| `a37008e` | repo README facts table, measured, with a source column per row. |
| `5a2b956` | Makes code MIT **by default** rather than by enumeration, after `frapp-gh/` landed and matched neither license list. |
| `fecda82` | **`ROADMAP.md`** - the L0-L7 decentralization scale, published with gates. Internals stripped: ticket numbers, an unannounced identity-allocation decision, and an assessment of a named third party's project. Current-state figures corrected to measured. |
| `ae2572f` | **`docs/README.md`** - index across the four document trees, one hook per chapter and per runbook. |
| `fdfdea4` | **`README.md` as the front door.** Also drops the "unbroken since August 2024" lede, which was the exact claim the v0.2 pass separated from what the chain proves. |
| `af7ecbd` | This file - stops printing a commit count it invalidates by existing. |
| `ece1e7a` | Reads OG's `DEFAULT_ADMIN_ROLE` membership from the contract into the snapshot, so the paper's highest-consequence claim is pinned rather than asserted. Moves the snapshot to block 156,071,456; no quoted figure changed. |
| `a4e90cb` | Handoff records the v0.2 lane. |
| `4329636`, `1d221ab`, `5ea6e4e`, `f24f902`, `49d6abe`, `b2566e8` | **Not mine - the frapp-gh lane.** Six commits adding `frapp-gh/`, a TypeScript app with its own tests and deploy config: moved in from a standalone repo, workflows to the repo root, webhook handlers and a replay harness, a contents-API path fix, period vocabulary, and a root issue template with an unranked-work rule. Confirmed with that lane. I have not reviewed them. Note `b2566e8` adds `.github/ISSUE_TEMPLATE/contribution.yml` at the **repo root**, outside `frapp-gh/` - every ZAOfractal issue now gets a template chooser where there was none. Blank issues stay enabled. |
| `35349cb` | Marks the not-contacted language in `FACILITATION-RUNBOOK.md` as load-bearing and asserts it in `verify-claims.mjs`, so a later pass cannot trim it quietly. Zaal's 2026-08-26 reconfirmation recorded in the doc. |
| `528855b` | **Licensing, per your decision.** MIT (`LICENSE`) for code, CC BY 4.0 (`LICENSE-DOCS`) for documents, Copyright (c) 2026 Zaal Panthaki / BCZ Strategies LLC / The ZAO. README gains a Licensing section; the pending flag is gone. Worth one look before push: this is the commit that sets the terms under which everything else in the branch can be reused. |

### On the whitepaper commits specifically

They publish no names. What they publish is a set of corrections that are
**less flattering than what they replace**: participation of 8.1 per session
against a roll of 188, a Gini of 0.73 on the ledger that votes, 9 holders
reaching a majority of vote weight against Compound's 8 delegates, a
verification section that claimed "all successful" when 11 executions
reverted, and a founder ranked in 14 of the last 15 sessions.

That is deliberate. A governance paper that overstates its own numbers has no
standing to criticise anyone else's, and every one of these was going to be
found by the first serious reader with a block explorer. But it is a change in
what the document says about ZAO, made without you in the room, so it is the
part most worth your eye before any of it goes out.

Two judgement calls inside that, both reversible:

- **The whitepaper names no facilitator.** ch05 previously said "typically Zaal
  or civilmonkey.eth". It now gives the measurement and points at
  `respect/FACILITATION-RUNBOOK.md` rather than printing the three names you
  chose, because nobody on that bench has been asked yet and a whitepaper is a
  louder surface than a runbook.
- **The streak number is 110 everywhere**, taken from the community's own
  period counter. Nothing in this repo corroborates it off-chain and the chain
  cannot. If you have a better source, it changes one number in six chapters.

---

## What is not in this branch

- No push. No tag. No deploy.
- No Hat mints, no permaweb upload - the publish gate on the whitepaper
  (board card b1281a6a) is untouched and still requires your explicit go.
- No change to any contract, and no transaction of any kind.
