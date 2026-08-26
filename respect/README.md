# $ZAO Respect - the canonical hub

The single source of truth for what $ZAO Respect is, how it works, what is actually on-chain, and how the new Respect token gets built and launched. Everything else about Respect points here.

Status as of 2026-07-21: the new token is BUILT and tested locally; nothing is deployed to any public network. This hub is the off-chain documentation, kept clean and launch-ready.

---

## Read by audience

- **Community / members** - start with [What Respect is](#what-respect-is) and [How to earn it](#how-to-earn-it). The public page is thezao.com/zao-token.
- **Builders / team** - [On-chain reality](#on-chain-reality-verified) and [The new Respect token](#the-new-respect-token), then the detailed [LAUNCH-RUNBOOK.md](./LAUNCH-RUNBOOK.md).
- **Deciding / launch** - jump to [Build status](#build-status) and [LAUNCH-RUNBOOK.md](./LAUNCH-RUNBOOK.md). Nothing launches without a deliberate go.
- **Deciding the migration** - [LEDGER-RECONCILIATION.md](./LEDGER-RECONCILIATION.md) is the measured decision surface: who can vote today, who cannot, and what each genesis allocation rule costs. [SIGNER-COMMITTEE.md](./SIGNER-COMMITTEE.md) covers the governance bottleneck and what actually fixes it.
- **Running the week** - [FACILITATION-RUNBOOK.md](./FACILITATION-RUNBOOK.md) is the L1 facilitator bench: the run sheet for the Monday game, the named bench of three (Ohnahji B, Iman and Jose - none of them contacted yet), what the attendance ledger independently says about the room, the rota that reaches the L1 gate, and the six things nobody has written down yet. [EXECUTION-RUNBOOK.md](./EXECUTION-RUNBOOK.md) picks up where a session ends: how to spot a proposal that needs executing, the two ways a mint reverts, and the 24 award slots that never settled because of them.
- **Investors / partners** - the whole page reads top to bottom; the mechanics are verifiable on-chain (addresses below).

---

## What Respect is

Respect is The ZAO's earned reputation. You get it by contributing - showing up, ranking each other's work in the weekly Respect Game, writing, making art. It is **soulbound** (tied to you, cannot be bought or sold) and it is your **voting weight** in governance. Contribution decides direction, not capital.

Two things make it trustworthy: every point traces to a recognised contribution, and the ledger is on-chain and public.

## What Respect is not

Worth stating outright, because The ZAO is increasingly adjacent to work that
launches tradeable tokens - artist tokens, community tokens, token factories -
and the two are easy to conflate in a summary written by someone who was not
in the room.

**Respect is not one of those, and it must never become one.** Soulbound is not
a policy or a norm here; it is enforced in the contracts. Every transfer on the
ZOR ledger reverts except a mint from the zero address or a burn to it, and on
the OG ledger, across 518 transfers, there have been **zero peer-to-peer
transfers** - every balance traces to a treasury distribution. See whitepaper
[ch04](../whitepaper/draft/ch04-the-respect-token.md).

That invariant is the whole mechanism. If Respect could be bought, governance
weight could be bought, and the system becomes the plutocracy it was built to
replace - which is the argument of whitepaper ch02 and the reason ch04 calls
non-transferability a contract-level invariant rather than a gentlemen's
agreement.

So: a ZAO member may hold an artist token, a community token, or anything else,
and none of it is Respect, none of it confers governance weight, and no
launcher or factory touches this ledger. A proposal to make Respect tradeable
is not a parameter change. It is a proposal to end fractal governance at The
ZAO, and should be read as one.

**The harder boundary is the one inside ZAO's own tooling.** The async game in
[`frapp-gh/`](../frapp-gh/) assigns Respect and commits it to a repository as
JSON. That is Respect in the sense that matters - peer-ranked, earned, on the
same curve - but it is **not on either ledger**, so today it confers no vote
and appears in none of the figures this repo quotes. Phase 1 is deliberately
off-chain and has never run live.

Two things follow, and they are open rather than settled. Off-chain Respect
that is never settled on-chain is a record, not a governance weight, and a
member earning it should be told which one they are getting. And if it is ever
settled on-chain, it lands in the same ledger the Monday game settles into,
which makes the anti-collusion work named at L3 of the [roadmap](../ROADMAP.md)
a prerequisite rather than a refinement - an async path that can be gamed is a
path to minting governance weight.

## How to earn it

| Contribution | Respect |
|---|---|
| Introduce yourself in the ZAO Verse | 25 |
| Respect Game - camera on for the meeting | +10 / meeting |
| Respect Game - ranked by your circle (rank 1-6) | 110 / 68 / 42 / 26 / 16 / 10 |
| Newsletter - full article | 50 |
| Newsletter - short article | 10 |
| Newsletter - editing a piece | 10 |
| Be an artist on the ZAO website | 50 |

The ranked values are the current era (they include the x2 multiplier over the base 55/34/21/13/8/5). Every award has a stated reason - that is the point.

## On-chain reality (verified)

Read directly from Optimism mainnet this session. Full detail: [../research/onchain-governance-audit-2026-07-21.md](../research/onchain-governance-audit-2026-07-21.md).

| Contract | Address | What it is |
|---|---|---|
| OG Respect | `0x34cE89baA7E4a4B00E17F7E4C0cb97105C216957` | thirdweb ERC-20, the CURRENT vote-weight token. Transfers restricted (soulbound for members; admin can move). Minting frozen by choice. ALL roles held by one wallet (Zaal). |
| ZOR Respect | `0x9885CCeEf7E8371Bf8d6f2413723D25917E7445c` | Optimystics ERC-1155, the active weekly reward ledger. Hard soulbound. Minted only by OREC. Does NOT confer a vote. |
| OREC | `0xcB05F9254765CA521F7698e61E0A6CA6456Be532` | Optimystics governance executor. Self-owned, non-upgradeable. Reads OG for vote weight LIVE at vote-time (no snapshot, no checkpointing). Vote/veto windows 72h/72h, min weight 1000. |

The gap this creates: members earn ZOR but ZOR does not vote, and only pre-freeze OG holders have on-chain voting power. That is why participation is capped - and what the new token fixes.

## The new Respect token

One new soulbound token that is BOTH the reward and the vote, seeded with corrected lifetime balances so every active member can finally vote. Keep the existing OREC (no fork); point it at the new token with one governance proposal. Design detail: [../docs/superpowers/specs/2026-07-21-fractal-governance-fork-design.md](../docs/superpowers/specs/2026-07-21-fractal-governance-fork-design.md).

Built and tested (local only), in the `zaofractal-contracts` repo:
- `ZAORespect` - soulbound ERC-20, implements the `IRespect` interface the existing OREC reads, mint/burn gated to a minter role. No ERC20Votes/checkpointing needed (OREC reads live balance).
- A deploy script that seeds genesis balances and hands control to a multisig - no personal key retains control (fixing OG's single-key problem).
- A seed pipeline that turns fractal scores into the genesis allocation.
- Proven end-to-end on a local test chain: seeded balances, wired governance, deployer renounced everything.

Planned addition (not built): `award(to, amount, reason)` so each distribution records its reason on-chain and is publicly listed with its why.

## Build status

| Piece | State |
|---|---|
| New token `ZAORespect` | Built, tested, reviewed. Local only. |
| Deploy + seed + handoff script | Built, tested. Local only. |
| Seed pipeline (scores -> allocation) | Built, tested. Needs the real ZAOOS data to run for real. |
| `award(to,amount,reason)` distribution + reason | Not built - designed. |
| Frontend `$ZAO Respect` page | Designed (prototype). Not shipped to the site. |
| Whitepaper | Drafted; some open flags to resolve. |
| Deploy to any public network | NOT DONE and not planned until a deliberate go. |

Full launch sequence and what each step needs: **[LAUNCH-RUNBOOK.md](./LAUNCH-RUNBOOK.md)**.

Measured against chain data as of 2026-08-26: **[LEDGER-RECONCILIATION.md](./LEDGER-RECONCILIATION.md)** (the OG-to-ZOR migration, five genesis allocation options scored, identity gaps), **[SIGNER-COMMITTEE.md](./SIGNER-COMMITTEE.md)** (the OREC bottleneck, what breaks if a signer is lost, migration path), **[FACILITATION-RUNBOOK.md](./FACILITATION-RUNBOOK.md)** (the L1 facilitator bench and the run sheet) and **[EXECUTION-RUNBOOK.md](./EXECUTION-RUNBOOK.md)** (the execution rota, the revert causes, the unsettled-award backlog).

Every figure in those four is re-checkable with `node scripts/verify-claims.mjs`, which holds all 103 quoted numbers as expectations and exits non-zero when the chain has moved past the prose.

## Open decisions (block a real launch, not the docs)

1. Confirm the genesis allocation rule (default: lifetime Respect = sum of your fractal scores; does the export already include the ZOR era?). **Now scored against chain data - see [LEDGER-RECONCILIATION.md](./LEDGER-RECONCILIATION.md) section 4.**
2. The `FINAL_ADMIN` multisig that will own the token.
3. Whether to add a real per-voter weight cap (today there is none).
4. Audit firm + budget before mainnet.
5. Where the page ships (Webflow vs the `zaoweb` Next.js rebuild).

---

## License

The documents in this directory are licensed **CC BY 4.0** - share and adapt
with attribution. See [LICENSE-DOCS](../LICENSE-DOCS). Code in this repository (`scripts/`,
`dao/`, `site/`) is MIT; see [LICENSE](../LICENSE). Copyright (c) 2026 Zaal Panthaki /
BCZ Strategies LLC / The ZAO.

CC BY 4.0 covers ZAO's own writing, not the third-party sources these documents
cite, and not `data/`. LICENSE-DOCS states both limits and a note on the real
people these documents name.
