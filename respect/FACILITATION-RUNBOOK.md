# Facilitation runbook - running the Respect Game without Zaal

**Status:** 2026-08-26. The bench is named - Zaal resolved that gate overnight.
Nothing else here is agreed and nothing here has been scheduled.

**Nobody on the bench has been contacted, asked, approached or has agreed to
anything.** Being named is not being asked. Section 3 records Zaal's choice and
what the ledger independently says about the room; it is not a roster, a
schedule, or a commitment by anyone on it.

> **Do not trim this language.** Zaal reconfirmed on 2026-08-26 that the three
> names stay public here, under the standing policy that aggregating
> already-public information is fine. That decision rests on this document
> being explicit that the bench has not been asked - the sentence above, and
> its repeats in section 3 and section 4, are what make naming an unasked
> bench defensible rather than presumptuous.
>
> This matters more than an ordinary style note because the documents are
> licensed CC BY 4.0, and that grant is perpetual and irrevocable. Once this is
> published, copies carrying a softened version cannot be recalled. So the
> language has to be right *before* push, not after.
>
> If a later pass edits this file, check the not-contacted language survived.
> `scripts/verify-claims.mjs` asserts it, so removing it fails the check rather
> than passing quietly.

This is the **L1 - Facilitator bench** item on the decentralization scale. L0 is
where the ZAO is now: one weekly synchronous game that works, is proven, and
stops if one person stops. L1 is the game surviving any one person's absence.

The gate, unchanged from the scale: **4 consecutive weeks with 2 or more
meetings per week and 2 or more non-Zaal facilitators.**

The mechanism half of this is already written - whitepaper ch05 documents how
the game works and why. This is the operational half: the run sheet, who is on
the bench, what happens after the meeting, and the parts nobody has written down
yet. Where ch05 and the chain disagree, the chain is quoted and the discrepancy
is logged to the whitepaper v0.2 accuracy queue rather than silently corrected
here.

Every figure below is measured from the committed snapshot pulled at OP Mainnet
block 156,071,456. Reproduce with `node scripts/pull-data.mjs`.

---

## 1. What the game actually looks like now

Sixteen recent sessions, periods 95 through 110, as settled on chain:

| | |
|---|---|
| Sessions with awards on the ZOR ledger | **15** (period 103 has none) |
| Distinct people ranked across them | **29** (including 2 whose Respect never minted) |
| Sessions that ran a single breakout group | **11 of 15** |
| Sessions that ran two groups | **4** |
| Sessions that ran three or more | **0** |
| Median group size, across all 68 groups ever settled | **5** |
| Largest group ever settled | **8** |
| People ranked in the largest recent session (period 107) | **12** |
| People ranked in the smallest (periods 95, 104, 108) | **4** |

Two things follow, and a facilitator bench has to be built for the game that
exists rather than the one in the docs.

**The room is small.** The scale note describes roughly 40 active per session.
The ledger shows 4 to 12 people ranked per session over the last four months.
Some of that is settlement failing rather than people not attending - section 5
covers the 24 award slots that never minted - but not most of it. A second
facilitator is not needed to handle overflow. It is needed so the meeting can
happen when one person cannot make it.

**Two groups is the current ceiling.** Four of fifteen sessions split into two
breakouts. Nobody has run three. Whoever facilitates the first two-group session
of their own will be doing something that has happened four times in four
months.

**A caution on all of the above:** these are settlement dates, not meeting
dates. The chain records when a group's Respect was minted, typically about
seven days after the game. It cannot show that a meeting happened, only that
one settled. A week that met and never settled is invisible here.

---

## 2. The run sheet

Ninety minutes, Monday 6pm EST. Sourced from whitepaper ch05 section I, with the
contract figures replaced by what the deployed contract actually says.

**Before the day**

- Members must have posted in `#introductions` and run `/register` in Discord to
  link their Optimism wallet. An unregistered member can attend and cannot be
  ranked, because there is no address to mint to.
- Check who is unplayed. The bot's threshold for starting a session is 4 or more
  members who have not played in the past 7 days.

**Phase 1 - Gathering (10 min).** Members join the Fractal Waiting Room voice
channel. The session starts when 4+ unplayed members are present. Ad-hoc
sessions can run any time that holds - this is the mechanism L2 depends on, and
it already exists.

**Phase 2 - Randomization (5 min).** The facilitator runs `/randomize`. The bot
reads the waiting room, splits it into groups of at most 6 and at least 2, moves
people into Fractal Group N voice channels and posts the assignments. The split
is cryptographically seeded, which is the anti-collusion property - do not
hand-assign groups, it removes the defence.

**Phase 3 - Presentations (25 min).** In each group channel the facilitator runs
`/timer`. Four minutes per speaker, controls for Done / Skip / Come Back Later /
+1 Min / Raise Hand. Each member describes what they contributed this week.

**Phase 4 - Sequential elimination voting (25 min).** The facilitator runs
`/zaofractal [fractal_number] [group_number]`. Voting runs from level 6 (lowest)
up to level 1 (highest). Votes are public, announced aloud by the bot, and can
be changed during a round. A simple majority locks a rank, and that person drops
out of the following rounds. The last one standing takes rank 1 with no vote.

Reverse order is not a style choice - it is what stops the first vote anchoring
every vote after it.

**Phase 5 - On-chain submission (20 min).** The facilitator opens a pre-filled
URL, one per group:

```
https://zao.frapps.xyz/submitBreakout?groupnumber=N
  &vote1=WALLET_OF_RANK_6
  &vote2=WALLET_OF_RANK_5
  &vote3=WALLET_OF_RANK_4
  &vote4=WALLET_OF_RANK_3
  &vote5=WALLET_OF_RANK_2
  &vote6=WALLET_OF_RANK_1
```

Wallets come from the `/register` registry. The page builds an Optimism
transaction to OREC at `0xcB05F9254765CA521F7698e61E0A6CA6456Be532`, which
creates the proposal and casts the submitter's Yes vote in the same
transaction.

Respect is not minted at this point. The proposal has to clear its windows
first, and then somebody has to execute it. That is section 5, and it is where
the ritual has actually been losing weeks.

**Two corrections to ch05, measured against the deployed contract:**

| ch05 says | The contract says |
|---|---|
| Voting period 48 hours, veto period 48 hours | `voteLen` and `vetoLen` are both **259,200 seconds - 72 hours each**. A proposal is executable 6 days after submission, not 4. |
| "vote weight is frozen at proposal creation time, preventing double-voting" | OREC reads vote weight **live from the OG balance at the moment each vote is cast**. There is no snapshot. A wallet that moves its OG between submitting and voting votes with whatever it holds at that instant - this has already silently zeroed the largest holder mid-vote. |

Both are logged to the whitepaper v0.2 accuracy queue. Neither changes what a
facilitator does on the night; both change what they should tell people to
expect.

---

## 3. The bench

**Zaal's call, and it has been made: Ohnahji B, Iman and Jose.**

**Nobody on it has been contacted, asked, or has agreed to anything.** Naming a
bench and having a bench are different things, and only the first one has
happened.

Facilitating is not a governance role. It needs no Respect, no vote weight and
no key. What it needs is somebody who is reliably in the room and knows how the
night runs - and only the second half of that is something a person can tell you
about themselves.

### What the ledger measures, and what it does not

The attendance table below is the measurement of who is actually in the room on
a Monday. It counts being ranked in a Respect Game group across the last 15
settled sessions, periods 95 to 110, counting both settled groups **and** groups
whose mint reverted, because the second kind is not absence - it is the
settlement bug in section 5 erasing people who did turn up.

| Member | Wallet | Sessions ranked (of 15) | Latest session |
|---|---|---|---|
| Zaal | `0x7234c36a…E9Af` | 14 | 110 |
| Hurric4n3ike | `0x29f5dee6…Aa34` | 10 | 105 |
| Jose (Joseph Goats) | `0x29185eb8…0ad2` | 9 | 110 |
| Meta Mu | `0x2d9cbc4e…AA8B` | 8 | 110 |
| Ohnahji B | `0x64a15b1d…b3e1` | 8 | 109 |
| CandyToyBox | `0x8d43a3fc…eE66` | 7 | 110 |
| Zach L. | `0xb7f4b9ca…bdbb` | 7 | 107 |
| (unnamed) | `0xf73485a6…a8ea` | 7 | 110 |

Zaal at 14 of 15 is the whole problem stated as a number.

**Jose and Ohnahji B are both in that table**, at 9 and 8 sessions, first and
third among non-Zaal names that are still current. The measurement agrees with
the choice.

**Iman does not appear in it at all**, and does not appear anywhere in
`data/members.json` - not among the 144 named members, not among the 169
addresses that have ever held Respect. Said plainly, because it would be easy to
read this table as an argument and it is not one:

**This is a gap in the data, or a role that sits outside the Monday game. It is
not evidence against Iman.** The ledger records who was ranked in a breakout
group. It cannot record someone who runs ZAO Devz, who facilitates in a context
that does not settle to ZOR, who attends without being ranked, or who simply has
no wallet registered. Zaal named him, and Zaal knows things the chain does not.
The chain is the wrong instrument for this question and saying otherwise would
be dressing up an absence of data as a finding.

What it does mean, operationally and only operationally: Iman has no wallet in
the `/register` registry as far as this snapshot can see, and Phase 5 submission
sends a transaction. That is a first-night blocker with a five-minute fix, and
it is open call 2, not a reason to revisit the bench.

### Meta Mu

**Meta Mu is at 8 of 15, ranked in period 110 - tied with Ohnahji B on sessions
and more recent, and the highest-attendance current name Zaal did not choose.**
That is worth recording for the same reason Hurric4n3ike is: the measurement
should say what it says regardless of the decision, and a bench of three that
loses someone will want to know who the evidence pointed at. It is not an
argument against the named three, and Zaal has reasons the table cannot hold.

### The rest of the table

- **Hurric4n3ike** - 10 of 15, the highest non-Zaal count in the window, but last
  ranked in period 105, five sessions ago. Whether that is a step back or a gap
  in settlement is not something the chain can answer, and it is worth asking
  directly before writing it off.
- **CandyToyBox** `0x8d43a3fc…eE66` - 7 of 15, ranked in period 110. Also voted
  on OREC three times, so if the bench needs a fourth, this is the obvious one.
- **Zach L.** - 7 of 15, last ranked in period 107.
- **`0xf73485a6…a8ea`** - 7 of 15 including period 110, and no name on file.
  See open call 4 - this is a tap, not a judgement.

**What the ledger cannot tell you about any of them:** whether they can hold a
room, keep a timer, or handle a disputed round. Attendance is a proxy for
availability and nothing more. That is exactly the part of the decision that was
never the data's to make.

---

## 4. The rota, and the gate

The L1 gate is 4 consecutive weeks with 2+ meetings per week and 2+ non-Zaal
facilitators. That is two things at once - more meetings and more facilitators -
and trying to hit both from a standing start is how this stalls. Sequence it:

**Weeks 1 to 2 - shadow.** The Monday game runs as it does now, with one bench
member co-facilitating: they run `/randomize` and `/timer` while Zaal watches.
Nothing else changes. Two weeks, two different bench members. This assumes all
three have said yes; none has been asked yet.

**Weeks 3 to 4 - solo Monday.** A bench member runs the whole Monday session
end to end, including Phase 5 submission. Zaal is in the room and does not
touch the bot. If it goes wrong, it goes wrong with the person who can fix it
present.

**Weeks 5 onward - the second meeting.** The bench member who ran solo picks a
second slot in the week and runs an ad-hoc session with the 4+ unplayed rule.
This is the half of the gate that needs no permission from anyone - the bot
already supports it. The gap has never been the tooling.

**The gate clock starts here, not at week 1.** Four consecutive weeks with two
meetings and two non-Zaal facilitators is the measurement, and it is measurable
from the ledger: two settled periods per week with distinct submitters.

Standing rules once the rota is live:

- **One facilitator on duty per session,** named before the session, not chosen
  in the waiting room.
- **The duty facilitator owns settlement for their session** through Phase 5.
  They submit, or they hand it over explicitly with a reason.
- **Miss two in a row and you come off the rota.** No penalty. The point of a
  bench is that it survives someone getting busy.
- **Zaal is not on the rota** once week 5 starts. If he is facilitating a normal
  week, the bench is not working yet.

---

## 5. After the meeting - the part that has been losing weeks

Submitting a breakout does not award anybody anything. The proposal sits for 72
hours of voting, then 72 hours of veto, and then somebody has to send a
transaction to execute it. Measured over 153 proposals:

| | |
|---|---|
| Median days from submission to Respect actually minted | **7** |
| Executions that took more than 14 days | **18** |
| Slowest | **81 days** |
| Addresses that have ever executed a proposal | **2** |
| Award slots that never minted at all because an execution reverted | **24**, worth 1,672 Respect, across 16 people |

So a facilitator can run a flawless meeting and the people in it still get
nothing, and that has happened to sixteen members across eight periods. The
recovery procedure, the two revert causes and the current backlog are in
**[EXECUTION-RUNBOOK.md](./EXECUTION-RUNBOOK.md)**. A new facilitator does not
need to own execution, but they do need to know that submitting is not the end
of their session, and who to hand it to.

**The connection between the two runbooks matters more than it looks.** The
Frapps page builds the proposal Message in the browser and submits it by voting
on its hash. The Message itself never goes on chain until execution. So the
person who facilitated is the person holding the only copy of what was decided -
which is why execution has never spread beyond two wallets. Widening the
facilitator bench without solving that hands the same bottleneck to more people.
It is open call 1 in EXECUTION-RUNBOOK.md and it is the one dependency that
links these two pages.

---

## 6. What is not written down yet

Honest inventory of what a new facilitator would hit on their first night and
find no answer for. None of this is in ch05, this repo, or anywhere else the
snapshot can see:

- **Bot permissions.** Which Discord role can run `/randomize`, `/timer` and
  `/zaofractal`? If those are gated to one person or one role, the bench is
  blocked on a permissions change before it is blocked on anything else.
- **The wallet that submits.** Phase 5 sends a transaction. Does the facilitator
  submit from their own wallet, and does that need OG weight? Measured: it does
  not need weight to submit, because `vote` accepts any address - but the
  submitter's auto-Yes carries zero weight if they hold no OG, which means a
  facilitator with no OG submits a proposal that nobody has voted for yet.
  Four of the nine addresses that have ever voted hold zero OG, and twelve votes
  have been cast that carried no weight at all.
- **The fractal number.** `/zaofractal [fractal_number] [group_number]` takes a
  meeting number. Where does a facilitator get the right one? Off by one and the
  Respect mints against the wrong period.
- **What to do when a group has 7 or more.** It has happened four times - three
  groups of 7 and one of 8 - and the documented cap is 6.
- **What to do when the vote does not converge** and no candidate reaches a
  majority in a round.
- **Who to escalate to during the meeting** if the bot fails mid-session.

Each of these is a short answer from someone who has run the game. None of them
is a decision. They are the difference between a bench that exists and a bench
that can be used.

---

## 7. Open calls - Zaal only

1. **Ask Ohnahji B, Iman and Jose.** The bench is named and none of them knows
   it. Nothing on this page is real until three people have said yes, and the
   first two weeks are shadowing, so the ask is small.
2. **Does Iman have a registered wallet?** He is not in `data/members.json` at
   all. Facilitating needs no wallet until Phase 5, and then it does. Five
   minutes, and it is a first-night blocker if it is missed.

   **The cheap moment to fix this is whenever an address already exists for
   some other reason.** ZAO people acquire wallets for all sorts of work that
   has nothing to do with the Respect Game, and the registry only learns about
   them if somebody asks. Anyone collecting an address from a member for any
   purpose should ask whether it is in `/register` while they have their
   attention. This generalises past Iman: 40 of the 169 addresses that have
   ever held Respect still have no name on file, and 23 names in the registry
   have no wallet - so the gap runs in both directions and neither side closes
   itself.
3. **Ask Hurric4n3ike directly.** Highest non-Zaal attendance in the window and
   absent from the last five sessions. That is either the strongest candidate on
   the page or somebody who has stepped back, and only a conversation
   distinguishes them. Same for **Meta Mu**, who is tied for second on
   attendance and ranked in the latest session - if the bench of three ever
   needs a fourth, the measurement points there.
4. **Who is `0xf73485a6…a8ea`?** Ranked in 7 of the last 15 sessions including
   period 110, and has no name on file.
5. **Answer the six items in section 6,** or say who can. This is the cheapest
   item on the page and it is what actually unblocks a first solo session.
6. **Confirm the meeting cadence the gate is measured against.** The scale says
   2+ meetings a week for 4 weeks. The ledger shows one settled session most
   weeks. Is the second meeting a new slot, or is it the ad-hoc 4+ unplayed rule
   being used for the first time?
7. **Is `/randomize` gated?** Section 6, first item. If it is, that is a
   five-minute fix and it is the literal first blocker.

---

## 8. Reproduction

```bash
node scripts/pull-data.mjs          # full refresh, about 50 seconds
node scripts/verify-claims.mjs      # re-checks every figure quoted in respect/
```

Attendance, group sizes and session counts come from `data/award-events.json`
plus the unminted rows recovered from the reverted executions in
`data/orec-proposals.json`. The run sheet comes from
[whitepaper ch05](../whitepaper/draft/ch05-the-respect-game.md); the two
contract corrections in section 2 come from `data/summary.json`.

Read alongside [EXECUTION-RUNBOOK.md](./EXECUTION-RUNBOOK.md) (what happens to a
session after it is submitted) and [SIGNER-COMMITTEE.md](./SIGNER-COMMITTEE.md)
(the governance half of the same bottleneck).
