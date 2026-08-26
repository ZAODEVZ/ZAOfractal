# Chapter 5: The Respect Game

Draft v0.2 - 2026-08-26 - accuracy pass against the committed chain snapshot

---

> *The Respect Game is the weekly ceremony where five-person breakout groups reach consensus on contribution rankings. No votes are cast. No tallies. Just honest peer judgment, encoded on-chain.*

---

## I. The Weekly Ritual: End to End

The Respect Game is a 90-minute meeting held every Monday at 6pm EST. The structure is consistent, repeatable, and designed to minimize gaming while maximizing honest deliberation.

### Pre-Conditions: Introduction and Registration

Before a member can participate in their first Respect Game:

1. They must post in the `#introductions` channel (one-time, identifies them to the community).
2. They must run the `/register` command in Discord, connecting their Optimism wallet address to the bot's registry.

After these steps, they can join any Respect Game session.

These preconditions serve two purposes: **identity certainty** (we know who you are in the community) and **wallet linkage** (we can mint Respect directly to your on-chain address).

### Phase 1: Gathering (10 minutes)

Members join the **Fractal Waiting Room** Discord voice channel. The session begins when 4+ unplayed members are present. (An "unplayed" member has not participated in the past 7 days.)

The official weekly session runs Monday 6pm EST. Ad-hoc sessions can launch anytime 4+ members are available.

### Phase 2: Randomization (5 minutes)

A facilitator runs the `/randomize` command. The bot:

1. Fetches all members currently in the Fractal Waiting Room.
2. Splits them into groups (design maximum 6 per group, minimum 2; in practice 4 of the 68 groups ever settled ran larger, the biggest at 8).
3. Auto-moves members into individual Discord voice channels (Fractal Group 1, Fractal Group 2, etc.).
4. Posts a confirmation message with group assignments.

**Who facilitates is a live problem, not a footnote.** The chain cannot name a facilitator - it records who was ranked, not who ran the room - but the proxy is stark: over the fifteen settled sessions from period 95 to period 110, Zaal was ranked in fourteen, and no other member exceeded ten. One person's Monday is load-bearing for the whole ritual. Building a facilitator bench is the first item on ZAO's decentralization scale; the run sheet, the candidates and the gate live in `respect/FACILITATION-RUNBOOK.md`. This chapter documents the mechanism, and Chapter 9 treats the dependency as the open problem it is.

Randomization is cryptographically seeded. This prevents pre-planned collusion. A player cannot predict which group they will join; they cannot pre-arrange to rank each other highly.

This is a critical sybil defense. Randomization forces a fake account to win consensus with different real humans each week. The cost grows exponentially with each new group assignment.

### Phase 3: Presentations (25 minutes, 4 minutes per speaker)

In each group's voice channel, the facilitator runs `/timer`. The bot:

1. Displays a "Meet Your Group" message listing the speaker queue.
2. Starts a 4-minute countdown for each speaker.
3. Provides interactive controls: Done, Skip, Come Back Later, +1 Min, Raise Hand.
4. Plays a brief audio signal when the timer resets between speakers.

Each member describes their contributions over the past week. Examples: "I shipped X feature, mentored Y person, wrote Z research doc." The 4-minute limit enforces concision. Members cannot ramble into undeserved visibility.

Audio is streamed via Stream.io (default) or 100ms (transcription-enabled). All speech is preserved for async participants.

### Phase 4: Sequential Elimination Voting (25 minutes, Levels 6 to 1)

The facilitator runs `/zaofractal [fractal_number] [group_number]` to start the voting flow.

The voting proceeds from **Level 6 (lowest rank) to Level 1 (highest rank)**. This reverse order (worst-to-best) prevents anchoring bias - early votes do not unduly influence later ones.

**Round Structure (6-person group example):**

**Level 6 round (finding the 6th-place contributor):**
1. Bot posts 6 colored voting buttons (one per candidate).
2. Bot joins the voice channel and plays an ascending-pitch signal.
3. Each member clicks the button for the person they rank lowest.
4. Votes are **public** - the bot announces each vote aloud: "[Member] votes for [Candidate]."
5. Members can **change their vote** at any time during the round. A button click updates the vote, not adds to it.
6. **Winner detection:** Simple majority wins. In a 6-person group, 4 votes are needed (ceil(6/2) = 4). The person with 4+ votes is locked in as rank 6.
7. The rank-6 winner is removed from all future rounds.

**Level 5 round (finding the 5th-place contributor):**
1. Same process, but now there are only 5 candidates (rank 6 is removed).
2. 3 votes needed for majority (ceil(5/2) = 3).
3. Rank 5 winner is removed.

This continues through Levels 5, 4, 3, 2, and finally 1. The last remaining candidate (no vote needed) automatically gets rank 1.

**Why sequential elimination?**

Sequential elimination operationalizes the 2/3 consensus requirement from the Fractally protocol. Over 6 sequential rounds with public, changeable votes, a strong supermajority consensus emerges. Members are expected to adjust votes when the group consensus becomes clear. A person cannot win top rank if the group consistently disagrees.

**Why public voting?**

Public voting prevents vote trading and makes collusion visible. If a member suspects their group is colluding (always voting for the same person regardless of contribution), they can voice objection during the meeting or escalate post-session. Transparency enforces honesty.

### Phase 5: On-Chain Submission (20 minutes)

Once all 6 levels are complete, the facilitator opens a pre-filled URL:

```
https://zao.frapps.xyz/submitBreakout?groupnumber=N
  &vote1=WALLET_OF_RANK_6
  &vote2=WALLET_OF_RANK_5
  &vote3=WALLET_OF_RANK_4
  &vote4=WALLET_OF_RANK_3
  &vote5=WALLET_OF_RANK_2
  &vote6=WALLET_OF_RANK_1
```

The wallets come from the bot's `/register` registry. This link opens a Vite SPA at `zao.frapps.xyz`. The SPA builds an Optimism transaction to the OREC contract (`0xcB05F9254765CA521F7698e61E0A6CA6456Be532`).

The transaction calls:
```typescript
await orclient.proposeBreakoutResult({
  meetingNum: 100,
  groupNum: 3,
  rankings: [addr_rank6, addr_rank5, addr_rank4, addr_rank3, addr_rank2, addr_rank1]
  // Respect auto-calculated via ZAO's 2x curve: [10, 16, 26, 42, 68, 110]
})
```

The OREC contract creates a new governance proposal. The proposer's wallet auto-votes YES with their OG Respect weight.

**There is no snapshot.** Earlier drafts of this chapter said vote weight is frozen at proposal creation. It is not: OREC reads `balanceOf` on the OG contract live, at the moment each vote is cast, with no checkpointing of any kind. Voting twice is prevented by recording one vote per address, not by freezing a balance.

This is not a nuance. On December 9, 2025 the largest OG holder cast three votes that carried **zero weight**, because for four days his Respect was sitting in a different wallet. The votes registered as participation and changed nothing. Twelve of the votes ever cast on OREC carried zero weight for this class of reason. If you move your tokens, you move your vote with them, and nothing warns you.

Respect is not minted yet. The proposal is recorded on-chain but awaits voting and veto windows.

---

## II. The OREC Governance Cycle: Voting and Veto

After submission, the proposal enters a two-phase governance cycle:

### Voting Period (72 hours, fixed)

- Any address can call `vote`. Holding OG Respect is what gives the vote weight; holding none is permitted and counts for nothing.
- Vote weight = your OG Respect balance at the moment you cast your vote, read live.
- Length: the deployed OREC has `voteLen` set to 259,200 seconds. Not "typical" - fixed, and changeable only by a passed proposal.
- Cost: a fraction of a cent per vote on Optimism (roughly $0.001-0.003 in gas - cheap, non-prohibitive).
- Process: On-chain transactions via Etherscan or a governance interface.

### Veto Period (72 hours, fixed)

- Voting period has closed; no new YES votes accepted.
- ONLY NO votes are accepted (challenge window).
- Length: `vetoLen`, also 259,200 seconds.
- Purpose: Allows the community to mobilize opposition if off-chain consensus-building failed.
- Prevents last-minute attacks: an attacker cannot wait until the final block of voting to dump a massive NO vote.

So a breakout result submitted on Monday night is executable **six days later**, not four. Six days is the protocol floor; the median proposal is actually executed on day seven, a day after it first becomes possible.

### Execution

After both windows elapse, anyone calls `execute(propId)` on OREC. The contract checks:

```
block.timestamp >= createTime + voteLen + vetoLen
AND
proposal.yesWeight >= minWeight          // an absolute floor, currently 1,000 Respect
AND
proposal.noWeight * 2 < proposal.yesWeight
```

Note that `minWeight` is an absolute quantity of Respect, not a fraction of total supply. It does not rise as the ledger grows.

If all conditions are met:
- OREC calls the ZOR Respect contract's `mintRespect()` function.
- Respect tokens are minted to each ranked member's wallet.
- Each award is a unique ERC-1155 token with metadata (week number, group number, rank).

If any condition fails (insufficient YES, active veto, or time not elapsed), the proposal does not execute. The group must submit again or dissolve.

### The 2/3 Rule: Mathematical Formulation

A proposal passes if:

```
yesWeight > 2 * noWeight  AND  yesWeight >= minThreshold
```

**Consequences:**
- 1/3 of active Respect holders can block any proposal (veto power).
- 2/3 can guarantee passage (supermajority).
- 50-50 splits always fail (YES is not > 2x NO).
- Abstentions are invisible (zero voting power).

This 2/3 rule creates a **consent-based system**, not a majority rule system. A slim majority cannot impose outcomes on the minority. Real disagreement is respected.

---

## III. The Fibonacci Curve: Mathematical Details

ZAO's 2x Fibonacci curve (see Chapter 4 for justification) distributes Respect per 6-person group:

| Rank | ZAO Respect | Phi Ratio | Cumulative |
|---|---|---|---|
| 1st (Level 1) | 110 | 1.618x | 40.4% |
| 2nd (Level 2) | 68 | 1.618x | 65.0% |
| 3rd (Level 3) | 42 | 1.618x | 80.4% |
| 4th (Level 4) | 26 | 1.618x | 89.9% |
| 5th (Level 5) | 16 | 1.615x | 95.6% |
| 6th (Level 6) | 10 | 1.600x | 100.0% |
| **Total per group** | **272** | -- | -- |

Each rank earns approximately 60% more than the rank below (phi = 1.618). This ratio absorbs human judgment error while remaining acceptable under Ultimatum Game fairness norms (see Chapter 4, Section V).

**Respect accumulation over time:**

Respect today accumulates without decay; the OG and ZOR ledgers are static. A member ranking 1st every week for 52 weeks reaches approximately:
```
R(52 weeks, 1x per week) ≈ 5,720 Respect (without decay)
```

A weekly decay mechanism - to keep governance weighted toward recent contribution - is a design option under consideration for the new Respect token. If adopted, a 2% weekly decay would give a ~34-week half-life and reduce long-inactive members' voting power over time.

The same member reaches Elder tier (2000+ Respect) in approximately 50 weeks. Tier thresholds in ZAO are:

| Tier | Threshold | Interpretation |
|---|---|---|
| Newcomer | 0-99 | Recently joined |
| Member | 100-499 | Regular contributor |
| Curator | 500-1,999 | Respected voice |
| Elder | 2,000-9,999 | Senior community member |
| Legend | 10,000+ | Founder-level contributor |

---

## IV. Game Theory: Why Honest Ranking Is the Equilibrium

The Respect Game is designed so that **honest ranking is the Nash equilibrium**. A rational player should rank others truthfully, not collude.

### The Payoff Structure

**Payoff for honest ranking:**
- You rank people by actual contribution.
- Others rank you honestly based on your actual contribution.
- Over time, your Respect balance reflects your real impact.
- You retain voting power proportional to your contribution.

**Payoff for collusion (e.g., always ranking your friends 1st regardless of contribution):**
- Your friend ranks you 1st (you gain extra Respect).
- But: the group notices the pattern. Consensus fails (not 2/3 agreement on colluders).
- OREC proposal fails due to lack of majority.
- You earn zero Respect that week (removal cost).
- Next week, you are in a different random group (re-randomization prevents sequel collusion).
- Your reputation for dishonesty spreads in a small community (social cost).
- You accumulate lower Respect over time (strategic cost).

The **removal cost** is decisive. If your group fails to reach consensus because collusion breaks the 2/3 rule, the entire group earns zero Respect. You cannot collude with one person to gain; you must align the entire group. And the group is randomized each week, so alignment is costly.

### Ultimatum Game Framing

The Fibonacci curve is designed with game theory in mind. A rank-6 member (10 Respect) receives 9.3% of the group's total Respect (10/272). A rank-1 member receives 40.4% (110/272). The split is 40/60, which exceeds the Ultimatum Game fairness threshold (30% minimum for acceptance).

In behavioral economics, people accept splits that feel "fair enough" even if unequal. The Fibonacci ratio hits this sweet spot: it is unequal (respects talent), but acceptable (respects equality). The group reaches consensus because the mechanism is perceived as fair.

### Sybil Attack Analysis

**Attack scenario:** An attacker creates 10 fake accounts and tries to systematically rank themselves highly.

**Defense layer 1: Randomization.** The attacker cannot control group membership. A fake account must join a different random group each week.

**Defense layer 2: Peer evaluation.** In each new group, the fake account must reach 2/3 consensus with real humans. Real humans will not consistently rank a fake account high if they do not know their contributions.

**Defense layer 3: Removal threat.** If the group suspects collusion, they can refuse to reach consensus. The entire group gets zero Respect. This creates peer pressure against collusion.

**Defense layer 4: Soulbound token.** OG Respect is soulbound for members (restricted transfers). This prevents a fake account from cashing out or transferring stolen Respect to another account. Soulbinding locks earned Respect in place.

**Defense layer 5: OREC voting.** Even if a breakout group successfully mines Respect for a fake account, the OREC proposal can be vetoed by the wider community. 1/3 of Respect holders can block execution.

**Sybil cost estimate:** To move one person 10 places in ranking over 15 weeks across 15 different random groups requires approximately 150 fake accounts (10 per group, 15 groups). Each account must have a wallet, Farcaster identity, and human-like Discord presence. This is expensive (time and identity costs) and provides minimal benefit (15 votes on one person's Respect).

The economic barrier is high. Honest contribution is cheaper than Sybil attack.

---

## V. The Five Voting Criteria: ZAO's Customization

When ZAO Fractal members rank each other, they are instructed to consider five criteria specific to music and art:

1. **The ZAO Vision** - advancing music, art, and technology
2. **Contribution** - impactful work that pushed the collective vision forward
3. **Collaboration** - teamwork and uplifting others
4. **Innovation** - creative thinking, groundbreaking ideas
5. **Onboarding New Members** - helping newcomers join ZAO and Web3

These criteria are ZAO's adaptation of the generic Fractally protocol. Eden Fractal and other fractals use simpler "contribution to community" language.

ZAO's specificity matters. It operationalizes what the community values. By explicitly ranking people who onboard newcomers, The ZAO Fractal incentivizes growth. By explicitly ranking innovation, it incentivizes R&D. By explicitly valuing collaboration, it penalizes solo heroism and toxic competition.

In practice, these criteria guide deliberation. During the 4-minute presentations (Phase 3), members explain their contributions relative to these criteria. During voting, members use these criteria to disagree: "I think that was innovative, but it did not advance our vision." Criteria provide a shared vocabulary.

---

## VI. Visibility Bias: The Honest Critique

The Respect Game has one critical limitation: **it ranks visible work higher than invisible work**.

Loud social contributions (events, casts, conversation, mentoring) tend to out-rank quiet infrastructure work (code, contracts, internal tools, research). Every fractal community knows this and mitigates it differently.

### Why Visibility Bias Exists

In a 4-minute presentation window, members describe their contributions. Visible work (events, social participation, mentoring) is easy to present. You can say "I hosted the Thursday jam session; 20 people came" and the group nods.

Invisible work is harder to present. "I debugged the on-chain voting contract for 20 hours" requires technical context. The group may not understand the impact.

Over time, visible work accumulates more Respect than invisible work of equal value.

### Known Mitigations

ZAOstock's sprint-fractal adaptation (documented in ZAO research Doc 498) prescribes:

- **Explicit infra-contribution framing** during pre-session briefing. The facilitator highlights the week's infrastructure work before presentations begin.
- **Facilitator pre-briefing** on invisible-but-load-bearing work. The facilitator knows what engineering, research, or operations happened behind the scenes and can raise it during discussions.
- **Periodic infra-themed rounds** where ranking criteria are intentionally tilted toward maintenance work. Every 4-6 weeks, The ZAO could run a session where the criteria emphasize "systems thinking," "code quality," or "documentation."

ZAO Fractal does not yet have a formal visibility-bias mitigation in production (as of May 2026), but it is a known design space for improvement. The limitation is documented and solvable, not hidden or fatal.

---

## VII. 2/3 Consensus in Practice: The Convergence Dynamic

The 2/3 consensus rule is operationalized through sequential elimination voting. Here is how it converges in practice:

**Scenario: 5-person group, tight ranking**

Initial Level 6 votes:
- Member A: gets 2 votes (needs 3 for majority, fails)
- Member B: gets 2 votes (fails)
- Member C: gets 1 vote (fails)

The facilitator says: "No majority yet. Let us discuss." Members deliberate: "I ranked A 6th because they were quiet this week, but actually they were dealing with a personal issue. Let me vote for C instead, who was visibly less active."

After discussion, second vote round:
- Member A: 2 votes
- Member C: 3 votes (majority)

C is locked in as rank 6. Consensus emerges through deliberation, not pure tallying.

This is fundamentally different from voting systems. In voting, you get one vote, you cast it, done. In consensus, you can change your vote based on new information. Members are expected to update as the group's reasoning becomes clear.

**Why this prevents collusion:**

If members try to collude (always vote for the same person regardless of contribution), they fail to reach majority quickly. The group notices the pattern. Discussion becomes adversarial. Eventually, real consensus breaks down, and the facilitator may need to reset or abort the round.

Collusion is audible. It shows up in conversation as obvious bloc voting. Real humans catch it.

---

## VIII. Public vs. Secret Voting: ZAO's Choice

ZAO uses **public voting**. Every vote is announced aloud by the bot. Members can see who voted for whom.

This is a deliberate trade-off:

**Pros of public voting:**
- Prevents vote trading (no secret deals).
- Makes collusion visible (can be challenged in real-time).
- Encourages truthfulness (you must defend your vote aloud if questioned).
- Builds trust through transparency.

**Cons of public voting:**
- Social pressure to conform (members might vote for the loud personality, not the best contributor).
- Intimidation risk (a dominant voice can sway votes).
- Requirement for psychological safety (members must feel safe disagreeing).

Eden Fractal uses **secret voting** (votes recorded but not announced immediately). The argument: secret voting prevents social pressure and ensures independent judgment.

ZAO's choice of public voting reflects its values: transparency and conversation over privacy and independence. The small group size (5-6 people) makes privacy less critical; social dynamics are already visible.

Both approaches are valid. The important thing is that the mechanism is consistent, intentional, and tested.

---

## IX. Sybil and Collusion Defense: A Layered Architecture

The Respect Game defends against attacks through four stacked barriers:

| Layer | Mechanism | Attack Cost |
|---|---|---|
| 1 | Randomized 3-6 person groups | Attacker cannot control groupmates |
| 2 | Peer evaluation + 2/3 consensus | Fake account must convince real humans |
| 3 | 2/3 OREC veto gate | Community can block proposals |
| 4 | Soulbound token + peer ranking | Earned Respect cannot be transferred; small group reputations are visible |

**No single layer is perfect.** Randomization can be broken with enough fake accounts. Consensus can be faked with enough collusion. But the combination is strong.

To move one real person 10 places in ranking over 15 weeks (a modest attack) requires:

- 150+ fake accounts (to ensure group presence across all randomizations)
- Consensus building with 10+ real humans per group per week
- Coordinated voting (public, audible, visible to all)
- Persistent peer ranking (small-circle reputation is hard to fake across groups)

**Cost: High (time, identity, coordination).**
**Benefit: Modest (15 ranking movements, likely vetoed, soulbound).**

The economics are unfavorable. Honest contribution is cheaper.

---

## X. The Open Bottleneck: OREC Authority

Earlier drafts said OREC minting authority "is held by Zaal and civilmonkey.eth". Reading the deployed contract, that is the wrong mechanism, and the wrong mechanism leads to the wrong fix.

**Nothing about OREC is permissioned in the way that sentence implies.** `propose` is open to anyone. `vote` is open to anyone, at whatever weight their OG balance gives them, including none. `execute` is open to anyone, once a proposal has passed. There is no signer set to join, no key to be granted, no multisig to be added to. Every parameter that *is* privileged - `setMinWeight`, `setPeriodLengths`, `setRespectContract` - is `onlyOwner`, and the owner is OREC itself, which means only a passed proposal can change it.

What exists instead is three distinct bottlenecks wearing one name:

1. **Weight.** Only 12 addresses hold enough OG to clear the 1,000 minimum alone, and one of them shows up reliably. No proposal in 153 has ever needed a second voter to reach the threshold. The practical rule today is that if one person votes yes it passes, and if he does not, nothing does.
2. **Operations.** Execution is permissionless and unpaid, so almost nobody does it. Of 134 execution attempts, 130 were one person clicking a button anyone could click; the other 4 were a single other member, all in the first six weeks, none since October 2025.
3. **Keys, and this one is real.** `DEFAULT_ADMIN_ROLE` on the OG Respect contract has exactly one member. That role can grant itself minting rights and issue vote weight at will. This is the only genuinely permissioned thing in the stack, and it sits under the ledger that decides every vote.

The first two are solved by recruiting people, not by changing contracts. The third is solved by relinquishing or splitting a role. Conflating them is what produced three years of "we should set up a multisig" for a system that has no signer set. The measurement and the proposed fixes are in `respect/SIGNER-COMMITTEE.md` and `respect/EXECUTION-RUNBOOK.md`; Chapter 9 carries the honest version of the limitation.

---

## Sources

- ZAO internal research: Respect Game mechanism design (step-by-step mechanics, Fibonacci mathematics, game theory)
- ZAO internal reference: weekly ritual process, Discord bot implementation, visibility bias mitigation
- ZAO internal research: ORDAO on-chain architecture (OREC voting cycle, 2/3 rule, soulbound enforcement)
- ZAO internal research: Fibonacci justification, Ultimatum Game fairness, Nash equilibrium analysis
- ZAO internal reference: voting criteria specifications, Gini equality, tier thresholds
- ZAO internal research: foundational game theory, mechanism design, equilibrium analysis

---

**Word count: 3,835**

---

Continue to Chapter 6: On-Chain Architecture - ORDAO, OREC
