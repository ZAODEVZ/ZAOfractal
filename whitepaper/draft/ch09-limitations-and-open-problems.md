# Chapter 9: Limitations and Open Problems

> **Draft v0.2 - 2026-08-26 - accuracy pass against the committed chain snapshot**

---

*Fractal governance works in production. Two years of ZAO Fractal prove it. But the model breaks under specific conditions, fails in visible ways, and faces open problems that no fractal has solved yet. This chapter names those limits openly, not to undermine the system, but to earn its credibility. Everything measured here comes from the committed on-chain snapshot at OP Mainnet block 156,055,426, pulled 2026-08-26.*

---

## Participation Durability and Democracy Fatigue

Weekly synchronous governance is demanding. Research on real-world participation shows a sharp drop-off: after 2-4 months of weekly meetings, attendance stabilizes around a core 40-50% who carry the consensus burden. The rest attend sporadically. The psychological research is clear: webinar fatigue, decision fatigue, and the simple human cost of predictable weekly commitment cause participation collapse.

ZAO Fractal has sustained weekly meetings since August 2024 without an announced pause, across 110 numbered periods. Earlier drafts said this should not be possible by the evidence, and offered three explanations, the third being that the fatigue had not been measured and was accumulating beneath the surface.

**It has now been measured, and the third explanation is the one the data supports.** The ritual has held. The room has not.

| | |
|---|---|
| Community roll | 188 |
| Addresses that have ever held Respect | 169 |
| People settled in a recent session | 4 to 12 |
| Mean settled per period, all 41 settled periods | 8.1 |
| Recent sessions that ran a single breakout group | 11 of 15 |
| Sessions that ran three or more groups, ever | 0 |
| Sessions in which the founder was ranked, periods 95-110 | 14 of 15 |
| Highest count for anyone else | 10 |

The weekly cadence did not collapse. Attendance did, quietly, to a core of
under a dozen - and one person is in the room almost every week. That is not
a governance system that has beaten democracy fatigue. It is one where the
fatigue landed on attendance rather than on the calendar, and where a single
person's absence would end the streak.

Three readings remain open and the chain cannot distinguish them: the
community genuinely shrank; participation moved to surfaces that do not
settle on-chain; or settlement failures are erasing people who did turn up
(section 5 of `respect/EXECUTION-RUNBOOK.md` documents 24 award slots owed
to 16 people that never minted, so this is real but not large enough to
explain the gap).

Mitigations ZAO uses: We accept that not every member can attend every session. A core group of 4+ unplayed (absent) members triggers an automatic session (no rescheduling required). This lowers the barrier to skip a week. We also rotate facilitators so the burden does not fall on one person. But these are partial fixes. The risk is real: if the weekly ritual becomes a chore instead of a gathering, participation collapses into delegated voting, and the deliberation that makes fractals different evaporates.

---

## Insider Bias and Visibility Bias

Ranking contribution is subjective. Every study on open-source work, organizational bias, and implicit ranking shows the same pattern: visible work (presenting, facilitating, loud talking) is ranked higher than quiet work (infrastructure, documentation, mentorship behind closed doors). Two-thirds of open-source labor is invisible. When invisible labor is ranked, it gets lower compensation, lower status, lower Respect.

ZAO Fractal is vulnerable to this. The Discord bot facilitators, the Discord channel mods, the people who speak in breakout rooms - they accumulate visibility. A developer who fixed a critical security bug in silence may earn less Respect than a community manager who posted memes weekly. Over two years, this bias compounds. Early, visible, charismatic members accumulate Respect faster than late-arriving, quiet builders. The governance then drifts toward the preferences of high-Respect members, amplifying the original bias. ZAO Fractal becomes a soft plutocracy, ruled by visibility instead of contribution.

Evidence of this, corrected: 9 addresses have ever cast a vote on OREC and 2 have ever executed a proposal. But there is no "OREC signing power" to be trusted with - the next section explains why that framing was wrong, and why the correct diagnosis is harder rather than easier.

Mitigation: Transparent contribution rubric. Use an explicit checklist for ranking: *Did this person ship code? Did they mentor someone? Did they document? Did they curate?* Instead of "did they impress me," use structured judgment. This does not eliminate bias - it just makes it visible. The next mitigation is off-chain ranking on GitHub (Chapter 10 roadmap: Frapp-GH), which makes work verifiable and attributable without visibility bias.

---

## Sybil and Collusion Attacks

Small groups can be gamed. A coordinated ring of 10 people in a 40-person fractal can dominate the Respect flows to the next layer if they rank each other highly in every session. The academic literature on Sybil attacks, collusion in consensus systems, and voting manipulation is clear: a minority that coordinates can capture a system designed for honest majority.

ZAO Fractal has not experienced a documented attack of this kind. But we have not tried hard to prevent it either. The current mitigations are social: *we know each other, we would notice if someone was gaming the system, we would call it out.* At a settled session of 8 people this is genuinely strong - everyone in a group of 5 knows everyone else. It breaks at 400. And it breaks instantly if someone joins with the intent to subvert.

This is not a theoretical risk. Other DAOs have experienced this. Synthetify DAO on Solana lost $230,000 when an attacker created a governance proposal and voted it through an inattentive circle. The attack succeeded because the governance group was small and the attacker had capital resources.

Mitigation: Periodic account verification (linked to Farcaster FID or Ethereum wallet to prove single-identity-per-account). Transaction cost for circle membership (a small gas fee to participate, preventing low-cost Sybil nodes). Off-chain social proof (references from existing members, reducing entry cost for good-faith newcomers but blocking automated accounts). None of these are perfect. They just make attacks more expensive and visible. ZAO's roadmap (Chapter 10) includes formal identity-binding for Frapp-GH.

---

## Cold Start: New Members at Zero Respect

A new member joins ZAO Fractal and begins at zero Respect. Existing members have weeks or months of accumulated Respect. The barrier to influence is enormous. This is by design - we do not want to hand out power to newcomers - but the consequence is that newcomers have no voice until they have proven themselves in multiple sessions.

The DAOstar research (2025) on blockchain governance shows that cold-start inequality is a primary barrier to DAO growth. When newcomers feel unheard, they do not return. The insider advantage is permanent unless the system has explicit on-boarding.

ZAO's mitigation: one-time grants of baseline Respect to new joiners (an amount the council sets). This narrows the gap. But it also dilutes the signal - if everyone starts with 30 Respect, does that Respect still mean contribution? The problem is not solved. It is traded off.

---

## Respect Decay and Governance Weight Over Time

Respect today accumulates and does not decay. The current OG and ZOR ledgers are static - once minted, a member's Respect balance does not erode. This means that long-inactive early members retain their full voting weight indefinitely, even if they have contributed nothing for months or years. Over multi-year horizons, this creates a structural bias: governance power settles toward whoever arrived first and has not been voted out, regardless of recent contribution.

A weekly decay - for example, a 2% reduction per week (giving a ~34-week half-life) - would keep governance weighted toward recent contribution rather than letting long-inactive members hold power forever. The math works: if Respect erodes over time, stepping away costs you authority. Staying active preserves it. This would incentivize continuous participation and make the system more responsive to the community's current state.

But decay has real tradeoffs. Earned standing erodes if you step away for a season (e.g., a member on sabbatical or managing personal crisis loses voting power even though they earned it). Decay also requires on-chain implementation (recurring token burns, week-by-week state updates) which adds operational complexity. And there is a philosophical question: should governance power be time-limited at all? Early contributors built the system; do they not deserve to carry that weight permanently?

This is an open design decision for the new Respect token under development. Respect today does not decay. Whether to add decay to the next generation of the token is a tradeoff the community will decide, balancing liveness (current members have voice) against durability (contribution you earned stays earned).

---

## Scaling Past Dozens is Unproven

Roy Fractal at 700+ members on EOS proves that the mathematical structure of nested fractals scales. But Roy operates on EOS, a separate ecosystem with different visibility and economics. No Ethereum-side fractal has sustained 400+ members at consistent weekly cadence.

ZAO has a community roll of 188 and settles a mean of 8.1 people per session. The scaling question this chapter used to ask - what happens at 200, 400, 1000? - is the wrong end of the problem. ZAO has never run three breakout groups in a single session. The nested-fractal machinery beyond one or two circles is untested at ZAO not because scaling is hard, but because the room has never been large enough to need it. What happens at 200 is still worth designing for. What happens at 40 is the live question.

Dunbar's number (the cognitive limit on human relationships) is ~150. Beyond that, you cannot maintain trust through direct relationships. You need hierarchy, explicit roles, and representatives you have never met. Fractal governance is designed to scale through nested circles, but nesting adds layers of representative risk. At Layer 1 (40-person circle), your voice is 1/40. At Layer 2 (6 reps per circle), you are represented by someone. At Layer 3, you are represented by someone who is represented by someone. The voice attenuates.

ZAO's roadmap (Chapter 10) includes a decision point: if ZAO grows past 100 active members, do we split into parallel fractals (two breakout-room sets, same Monday time) or do we stay single and accept representative layers? Both have tradeoffs. The problem is unresolved.

---

## Two-Ledger Reconciliation is Incomplete

ZAO maintains two Respect ledgers (OG ERC-20 for Fractals 1-73, ZOR ERC-1155 for Fractals 74+). They are reconciled in Supabase. But on-chain, they are separate contracts. A member who earned 300 Respect in the OG era holds that in one contract. Respect earned in the ZOR era lives in another.

For ORDAO voting, this creates a real gap: does on-chain voting power include the active ZOR ledger? The current answer is no - OREC reads OG balances only, at the moment you vote. New ZOR mints do not change anyone's voting weight. This means the disadvantage runs toward newer members: a member who joined after the OG freeze (18 December 2025) and holds only ZOR has no on-chain voting weight at all, however much ZOR they have since earned. Early members who hold OG vote at full weight; the active reward ledger confers standing and record, but not yet a vote.

This is not a critical bug - it is the deliberate decoupling described in Chapter 6, seen from its uncomfortable side. But left unreconciled it could poison trust: the members most active today have the least on-chain say. The Chapter 10 roadmap includes giving the ZOR ledger a path to voting weight - publishing an OG-to-ZOR weighting formula and a retroactive claim mechanism - without discarding the OG history the two-ledger model was built to preserve.

---

## Infrastructure Single-Points-of-Failure

ornode (an indexing service for Respect data) is currently DOWN as of May 2026. The on-chain leaderboard at zao-fractal.vercel.app was deleted - there is currently no public leaderboard outside the Discord bot and ZAO OS.

This means that the "immutable on-chain history" of ZAO Fractal is theoretically immutable but practically unreachable for most members. If a member wants to verify their Respect balance without trusting the Discord bot, they would need to call the OREC contract directly on Etherscan or write custom queries. This is not accessible to non-technical members.

Mitigation: Restore the web dashboard at zaoos.com (Chapter 10, June 15 2026 target). This is not complex. It is just infrastructure work. But it is critical - the web dashboard is the proof that governance is real and transparent. Without it, ZAO Fractal feels like a Discord bot that claims to be on-chain, not a blockchain-native system.

---

## Documentation Gap

Tanja's call on May 18, 2026 identified the #1 onboarding blocker: non-technical members cannot explain ZAO Fractal to peers. There is no single canonical document explaining how it works, why it is different, what the weekly ritual is, how to participate, what Respect means. Members have to ask in Discord. New joiners get lost.

This whitepaper is the start of the answer. But the whitepaper is not an onboarding document. It is a governance paper. ZAO also needs: video tutorials (how to submit a breakout ranking), explainer graphics (Respect earning curves, voting criteria), a FAQ, a constitution (the rules that ZAO operates under, written down).

Mitigation: Publish this whitepaper, then commission the documentation set (Chapter 10, June 30 2026 target). Make ZAO Fractal reproducible. If another music community wants to fork ZAO's governance and adapt it, they should be able to. Documentation is how that happens.

---

## Operating Core Concentration

Earlier drafts of this chapter described the bottleneck as "zaal.eth and civilmonkey.eth are the only two wallets that have ever submitted to the OREC contract", and prescribed a signer committee with multi-sig approval.

**The diagnosis named the wrong mechanism, and the wrong mechanism produced a fix that cannot be built.** Reading the deployed contract: `propose` is open to anyone. `vote` is open to anyone. `execute` is open to anyone, once a proposal has passed. **There is no signer set.** There is nothing to be a member of, no key to be granted, no multi-sig to establish. Every wallet on Optimism with gas can already execute a passed ZAO proposal today. Nobody does.

Here is what the chain actually shows across 153 proposals from September 2025 to August 2026:

| | |
|---|---|
| Addresses that have ever cast a vote | 9 |
| Addresses that have ever executed a proposal | 2 |
| Executions by the founder's wallet | 130 of 134 |
| Executions by anyone else | 4, all before 2025-10-24 |
| Proposals decided by a single voter | 137 of 153 |
| Proposals needing a second voter to clear the minimum weight | 0 |
| Proposals ever voted down by someone other than their author | 0 |

(The 10 No votes on record are all one person reversing a proposal he opened himself. OREC has never seen a contested vote. And the name "civilmonkey.eth" cannot be matched to either executing wallet from the snapshot; the second executor, with 4 executions, is Tadas Vaitiekunas.)

So the single bottleneck is really three, and they need three different fixes:

**1. A weight bottleneck.** Only 12 addresses hold enough OG Respect to clear the 1,000 minimum weight alone, and only one of them shows up reliably. Because no proposal has ever needed a second voter, the operative rule is: if one person votes yes it passes, and if he does not, nothing does. *Fix: unify the ledgers so active contributors carry weight (Chapter 10). This is a governance change, not a key change.*

**2. An operational bottleneck.** Execution is permissionless and unpaid, so nobody does it. 130 of 134 executions are one person clicking a button anyone could click. *Fix: recruit and, if necessary, compensate executors. This needs people, not contracts.*

**3. A key bottleneck - and this one is real, and it is not in any previous draft of this chapter.** The OG Respect contract's `DEFAULT_ADMIN_ROLE` has **exactly one member**. That role can grant itself minting rights and issue vote weight at will. It is not frozen and it is not time-locked. OG is the sole source of vote weight in the entire system, so this is one wallet that can mint governance power for anyone, including itself, with no proposal and no veto window. *Fix: relinquish or split the role. This is the only genuinely permissioned thing in the stack and the only one a multi-sig would actually address.*

Naming all three as "the OREC bottleneck" is what produced two years of "we should set up a multi-sig" for a system with no signer set, while the one component that is genuinely single-keyed went unmentioned. The measured case and the proposed remedies are in `respect/SIGNER-COMMITTEE.md` and `respect/EXECUTION-RUNBOOK.md`.

**The facilitation dependency is the same shape.** The chain cannot name a facilitator, but over periods 95-110 the founder was ranked in 14 of 15 settled sessions and nobody else exceeded 10. A facilitator bench is the first item on ZAO's decentralization scale, with a stated gate: four consecutive weeks with two or more meetings per week and two or more non-founder facilitators. `respect/FACILITATION-RUNBOOK.md` holds the run sheet. As of this draft the gate has not been met and the bench has not been asked.

---

## The Measurement Problem: Can Peers Judge Contribution?

Beneath all of this is a harder question: Can five strangers in a breakout room actually judge whether someone's work advanced the community's mission?

The Respect Game assumes yes. We gather in small groups, discuss the week, and reach consensus on a rank order. The consensus is honest. The ranking reflects actual contribution, not politics.

The research on deliberation vs. voting suggests this is true at human scale. Citizens' assemblies (Ireland, France, British Columbia) use citizen juries of 100-150 people to deliberate on policy. When given time to learn and discuss, ordinary people make judgments that policy experts respect. The Respect Game is a deliberative process. It should work.

But the Respect Game has not been formally studied. No peer-reviewed research exists on the accuracy of peer-consensus ranking as a measure of open-source or creative contribution. This is not because the Respect Game is new - Daniel Larimer invented it in 2020. It is because academic research on governance lags practice. The Respect Game works in Eden and ZAO empirically. But we do not have rigorous evidence of what it actually measures.

This matters because if peers are bad at judging contribution, the entire system is built on a false premise. Mitigation: Formal research. Partner with an academic team (MIT, Stanford, Berkley) to study ZAO Fractal's rankings for 1-2 seasons. Verify that high-Respect members are actually high-contribution members (by some external measure: code commits, user feedback, outcomes). If the correlation holds, we have empirical proof. If not, we have evidence we need to redesign.

---

## Sources

- **05-critiques-failure-modes.md** (democracy fatigue research, visibility bias invisibility study, Sybil attack literature, cold-start inequality DAOstar research, scaling limits Dunbar's number, dormancy risk, subjectivity in ranking)
- **02-live-communities-deep.md** (OF pause burnout hypothesis, Aquadac 4-year retention at 20-30 members, Eden Epoch 2 false start Aug 2024, Roy Fractal 700+ scale but documentation sparse)
- **03-optimism-fractal-full-history.md** (OF paused Jan 2026 after 15 months, consolidation logic, developer concentration burnout)
- **07-zao-fractal-distinctness.md** (documentation gap Tanja call May 18 2026, ornode down, zao-fractal.vercel.app deleted, two-ledger reconciliation Doc 115)
- **`respect/SIGNER-COMMITTEE.md`, `respect/EXECUTION-RUNBOOK.md`, `respect/FACILITATION-RUNBOOK.md`** (the three bottlenecks, measured, with proposed remedies)
- **`data/` snapshot, OP Mainnet block 156,055,426, pulled 2026-08-26** (9 voters, 2 executors, 137 single-voter proposals, 8.1 mean settled per period; re-check with `node scripts/verify-claims.mjs`)

---

**Word count: 3,268**
