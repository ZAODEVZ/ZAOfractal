# Branch review - everything this branch would publish

**For Zaal, before anything reaches origin.** This branch is unpushed by
decision, not by accident: gate `gate_4c836a146dcd` is open and is yours to
close. Nothing here has been pushed.

Regenerate the commit list with:

```bash
git log --oneline origin/main..HEAD
git rev-list --count origin/main..HEAD
```

At the time of writing that count is **21**.

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
| `0b0e193` | **whitepaper ch01 v0.2** - separates the ritual claim from the chain claim. The streak stays a community record; the verifiability paragraph now says what the chain actually proves. Period number settled at 110. |
| `9bdd062` | **whitepaper ch03 v0.2** - "40+ members in 6-7 breakout rooms" and "60-80% participation" corrected to the measured room; the on-chain history figure corrected from "242+ transactions". |
| `e6bf95f` | **whitepaper ch04 v0.2** - says which ledger votes (OG, not ZOR) and replaces a flattering Gini of 0.23 with three measured ones, the load-bearing one being 0.73 on the ledger that votes. |

The whitepaper v0.2 commits publish no names. They publish corrections that are
less flattering than what they replace - the participation rate, the Gini, the
concentration of vote weight. That is deliberate, and it is the part most worth
your eye before it goes out.

---

## What is not in this branch

- No push. No tag. No deploy.
- No Hat mints, no permaweb upload - the publish gate on the whitepaper
  (board card b1281a6a) is untouched and still requires your explicit go.
- No change to any contract, and no transaction of any kind.
