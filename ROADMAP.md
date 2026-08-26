# Roadmap - the decentralization scale

ZAO Fractal works. One weekly synchronous Respect Game, running since August
2024, with every governance decision settled on-chain. It is also fragile in a
specific and measurable way: it depends on one person showing up.

This roadmap is the path from that to a governance system that does not. Eight
levels, each with a **gate you can measure** rather than a milestone you can
declare. We are at L0, passing into L1.

Definition of done: synchronous Respect Games through the week run by different
facilitators, an async game on ZAO's own social surface, the whole thing
autonomous, 1,000+ people participating weekly, and members running the
infrastructure that carries it.

---

## Where we actually are

Measured from the committed on-chain snapshot in [`data/`](data/), not asserted.
Regenerate with `node scripts/pull-data.mjs`; re-check every figure quoted
across this repo with `node scripts/verify-claims.mjs`.

| | |
|---|---|
| Cadence | one synchronous meeting a week, Mondays 6pm EST |
| Period counter | 110 |
| Settled on-chain | 41 periods, covering 67-110 |
| People settled per period | mean 8.1; 4 to 12 in recent sessions |
| Community roll | 188 (off-chain); 169 addresses have ever held Respect |
| Facilitation | one person was ranked in 14 of the last 15 settled sessions; nobody else above 10 |
| Execution | 130 of 134 execution attempts by a single wallet |
| Ledgers | static, no decay, and only the historical ledger confers a vote |

Two of those deserve emphasis because they set the shape of everything below.
**The room is small** - a mean of eight people settling per period against a
roll of 188. And **the chain records settlement, not attendance**, so the
weekly streak is a community record while the governance history is an on-chain
one. The whitepaper keeps those apart deliberately; see
[Chapter 8](whitepaper/draft/ch08-the-zao-fractal.md).

---

## L0 - Ritual (today)

One weekly synchronous game. Works, proven, fragile: one facilitator, one
timeslot, one meeting.

**Autonomy: none.** If one person stops, it stops.

## L1 - Facilitator bench

The game survives any one person being absent.

- A facilitation runbook written from how the game is actually run - the
  whitepaper documents the mechanism, the runbook is the operational half:
  schedule, breakouts, submission, settlement
- 3+ people besides the founder have each run a full meeting end to end
- Self-serve scheduling used without the founder present (the bot already
  supports running any time 4+ unplayed members are available; the gap is
  people using it)

**Gate: 4 consecutive weeks with 2+ meetings per week and 2+ non-founder
facilitators.**

Status: runbook written - [`respect/FACILITATION-RUNBOOK.md`](respect/FACILITATION-RUNBOOK.md).
A bench of three is named there. **Nobody on it has been contacted or has
agreed to anything**; being named is not being asked. Gate not met.

## L2 - Daily cadence

A meeting a day, rotating facilitators, timezones covered.

- 7+ facilitators on a rotation, EU and APAC slots covered
- Attendance spreads rather than splitting the same small group thinner

**Gate: 30 consecutive days with a game every day; no facilitator runs more
than 2 per week; weekly unique participants exceed 100.**

## L3 - Async game v1

Play without meeting.

- Async rankings over a rolling window settle into the same Respect ledgers
- Anti-collusion review before settlement, which is real money-shaped work
- Ship the shape where people already are rather than waiting for a social
  network - async mechanics need shaking out before they move

**Gate: 25%+ of weekly Respect awarded through the async path for 4 consecutive
weeks.**

Status: in build - [`frapp-gh/`](frapp-gh/), GitHub-native, from the PRD in
[`research/06-frapp-gh-prd.md`](research/06-frapp-gh-prd.md).

## L4 - ZAO social

The async game becomes native to ZAO's own social surface.

- Built as an application on the Farcaster network. **No node required at this
  level** - node ownership is L7's problem, and conflating the two has stalled
  this before
- ZIDs as the identity layer
- The game runs in-feed: play from the timeline, not from a tool

**Gate: 200+ weekly actives on ZAO social; the majority of async game
participation happens there.**

## L5 - Autonomous operations

No single human is load-bearing.

- The execution bottleneck resolved. It is three separate problems, not one:
  **weight** (12 addresses can clear the minimum vote weight alone, one shows
  up), **operations** (execution is permissionless and unpaid, so almost nobody
  does it), and **keys** (one admin role can still mint vote weight on the
  ledger that votes). Only the third is a key problem, and only it is fixed by
  a multi-sig
- A single unified Respect ledger, so that active contributors can vote at all
- Settlement, scheduling and facilitator rotation running without manual ops
- Treasury actions executing through governance only

**Gate: the founder takes 30 days fully off; cadence, settlement and onboarding
all hold.**

Status: measured and costed, nothing executed -
[`respect/SIGNER-COMMITTEE.md`](respect/SIGNER-COMMITTEE.md),
[`respect/LEDGER-RECONCILIATION.md`](respect/LEDGER-RECONCILIATION.md),
[`respect/EXECUTION-RUNBOOK.md`](respect/EXECUTION-RUNBOOK.md).

## L6 - 1,000 weekly

The number, honestly costed.

1,000 weekly participants in groups of ~6 is about **167 circles a week**.
All-synchronous, that is roughly 24 meetings a day. That is not a facilitator
problem, it is a physics problem.

**1,000 is only reachable if async carries the bulk** - roughly 100-150
synchronous players across daily meetings, and 850+ async. That ratio is the
whole reason L3 and L4 come first.

- The onboarding funnel measured at every step: join, identity, first game,
  fourth game. The gap from 188 to 1,000 is 5.3x, and retention beats reach

**Gate: 1,000+ unique weekly participants for 4 consecutive weeks, with week-4
retention of new joiners above 25%.**

## L7 - Node network

Members run the infrastructure.

- A node packaged so a member can run one: a single command, a documented
  hardware floor
- Node operators earn Respect for uptime - infrastructure work is contribution,
  and the game already knows how to reward contribution

**Gate: 20+ independent member-run nodes; the network survives any single node
going dark, including ZAO's own.**

---

## The dependency spine

- **L1 and L2 are people problems.** No technical gate. They can start now.
- **L3 is buildable today** and runs parallel to L1 and L2.
- **L4 is an app-level build.** It does not wait on infrastructure.
- **L5 is three fixes wearing one name.** Two of them need people; one needs a
  key relinquished.
- **L6 falls out** of L2 + L3 + L4 compounding, plus retention work.
- **L7 is last** and depends on L4's stack choice.

Two things already running feed every level: the on-chain data layer, which is
where the participation numbers for each gate come from, and the ledger
reconciliation, which is a prerequisite for L5's "every active member can vote".

---

## How to read this

Every gate above is a number, and most of them can be checked against
[`data/`](data/) today. That is deliberate. A roadmap whose milestones are
declared rather than measured is how a governance project ends up claiming
progress it has not made - which is a failure mode this repo has already
corrected once, in the whitepaper's v0.2 accuracy pass.

If a gate here is ever reported as met, the number behind it should be
reproducible with the scripts in [`scripts/`](scripts/).
