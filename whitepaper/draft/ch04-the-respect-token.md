# Chapter 4: The Respect Token

Draft v0.2 - 2026-08-26 - accuracy pass against the committed chain snapshot

---

> *Respect is a soulbound, peer-earned reputation token. It cannot be bought, sold, or transferred. Governance power tracks contribution, not capital.*

---

## I. Definition: What Is Respect?

Respect is a non-transferable reputation token that records peer-evaluated contribution to The ZAO community. It serves two functions:

1. **A persistent reputation ledger.** Each Respect token is a soulbound record of when, how much, and by whom a member was recognized.
2. **A voting weight for governance.** Members with higher Respect have proportionally greater voice in deciding community direction through the ORDAO system.

Respect is fundamentally different from governance tokens (like COMP or UNI) in one critical way: you cannot acquire it by holding capital. You earn it through peer consensus on your weekly contributions.

This distinction is not semantic. It restructures the entire incentive surface of governance.

---

## II. Why Soulbound: The Anti-Plutocratic Design

Soulbound means: Respect cannot be transferred from one address to another. The smart contract level enforcement is unambiguous.

On Optimism Mainnet, ZAO maintains two Respect token contracts:

**OG Respect (ERC-20, dormant, and the only ledger that votes)**
- Address: `0x34cE89baA7E4a4B00E17F7E4C0cb97105C216957`
- Deployed: July 30, 2024
- Total supply: 38,484, held across 122 addresses
- Status: dormant, not frozen. Last mint December 9, 2025; last distribution December 18, 2025. The distinction matters: `DEFAULT_ADMIN_ROLE` on this contract has exactly one member, and that role can still grant itself minting rights and issue vote weight. Nothing on-chain prevents it. See Chapter 9.
- Transfer restriction: enforced via role-based access control (thirdweb). Members cannot transfer; the admin can move it, but has not. Soulbound in practice, and the ledger bears this out - across 518 transfers there have been **zero peer-to-peer transfers**. All 447 distributions went from the treasury wallet to a member, and only two ever came back.

**ZOR Respect (ERC-1155, the active ledger, and it does not vote)**
- Address: `0x9885CCeEf7E8371Bf8d6f2413723D25917E7445c`
- Deployed: September 11, 2025
- Minting authority: OREC contract only (`0xcB05F9254765CA521F7698e61E0A6CA6456Be532`)
- Transfer function: all transfers revert except minting (from the zero address) and burning (to the zero address)
- 333 awards to 70 addresses across 41 settled periods; 18,266 minted, 848 burned, 17,418 outstanding

**Read those two together before going further.** The active ledger confers no
vote, and the voting ledger is no longer being issued. Section III states that in
full, because it is the most important thing to understand about Respect at The
ZAO today and the earlier draft of this chapter left it to be inferred.

The soulbound property solves a critical problem: **separation of voting power from capital**.

If Respect were tradeable, governance would become purchasable. A wealthy person could buy Respect tokens on secondary markets and gain voting weight without contributing anything. The system would collapse into the same plutocracy that token-weighted voting produces.

Soulbound enforcement prevents this. Your Respect balance equals your verified contribution track record, period. No other mechanism can inflate it. This is not a gentlemen's agreement (a social convention); it is a contract-level invariant.

---

## III. The Two-Ledger Model: OG + ZOR

The ZAO maintains two separate Respect ledgers because the community went through two distinct eras:

**Era 1: Manual Distribution (periods 1-66, August 2024 - September 2025)**

Pre-OREC governance used an Airtable audit trail. Community members earned OG Respect through:
- Posting introductions in #intros (25 points)
- Camera-on participation in meetings (10 points per session)
- Full article contributions (50 points)
- Short article contributions (10 points)
- Editorial work (10 points)
- Featured artist showcase on thezao.com (50 points)
- Weekly Respect Game rankings (Fibonacci curve: 55/34/21/13/8/5)

Zaal and civilmonkey.eth manually reviewed contributions and minted OG Respect to the appropriate addresses. The OG contract preserves this ledger, but it preserves only balances. All 69 mints went to a single treasury wallet, which then distributed by transfer, and OG carries no per-award metadata at all - no period, no group, no rank. A transfer of 110 Respect on a Tuesday is indistinguishable from any other transfer of 110. Two thirds of ZAO's history therefore cannot be reconstructed from chain data even in principle.

**Era 2: Democratic Distribution (periods 67-110, September 2025 - present)**

Post-OREC governance distributes Respect through on-chain voting proposals. Every Monday at 6pm EST, The ZAO Fractal convenes. Breakout groups reach consensus on contribution rankings. A facilitator submits the ranking via `proposeBreakoutResult()` to the OREC contract. If the proposal passes the OREC voting cycle (2/3 supermajority, no active veto), ZOR Respect is minted directly to the wallets of ranked members. Unlike OG, each award is a distinct token id carrying its period, group and rank, which is why the weekly game can be reconstructed from chain data from period 67 onward and not before.

**Why maintain both?**

1. **Historical integrity.** OG Respect cannot be lost or retroactively modified. It proves that early contributors were recognized.
2. **Vote weight.** OREC's `respectContract` is set to the OG ERC-20, and it reads a voter's balance **live from that contract at the moment the vote is cast**. A member with 1,000 OG Respect carries full voting weight even if they have not earned ZOR lately.
3. **Democratic transition.** ZOR allows Respect distribution to be purely peer-driven, with no central admin holding minting authority over it.

**The cost of running both, stated plainly.** ZOR confers no vote. Of the 70 people ever awarded ZOR, **47 hold no OG at all and therefore have no vote weight whatsoever**. Narrow it to the people actually showing up - the 27 awarded ZOR in the last 12 settled periods - and 14 have zero OG, 9 hold some but sit under the 1,000 minimum weight, and 4 can carry a proposal alone. The ledger that records who is contributing and the ledger that decides who governs have come apart, and the gap runs in the worst direction: the more recently you joined, the less likely your recognized contribution carries a vote.

The two ledgers have not been unified - they remain separate on-chain. This is the largest open issue in ZAO governance. The measurement, the migration options and their costs are worked through in `respect/LEDGER-RECONCILIATION.md`; Chapter 10 carries the roadmap item.

---

## IV. How Respect Is Earned: Two Mechanisms

### A. Weekly Respect Game (the Primary Mechanism)

Every Monday at 6pm EST, members participate in small-group consensus ranking. A group of 5-6 people reaches consensus on who advanced The ZAO vision most that week, using five voting criteria:

1. **The ZAO Vision** - advancing music, art, and technology
2. **Contribution** - impactful work that pushed the collective vision forward
3. **Collaboration** - teamwork and uplifting others
4. **Innovation** - creative and groundbreaking ideas
5. **Onboarding New Members** - helping newcomers join ZAO and Web3

The consensus process produces a rank-ordering: 1st place (top contributor), 2nd place, 3rd place, down to 6th place. The ranking is ordinal, not cardinal - it reflects relative rank, not absolute scores.

Members do not assign numerical scores; they negotiate relative standing. This ordinal approach prevents gaming through fake precision (e.g., "you are a 7.2 out of 10"). It forces honest comparison.

Respect is awarded according to the Fibonacci distribution (detailed in Section V).

### B. One-Time Grants (Community-Specific, Era 1)

OG Respect was also awarded for specific, one-time contributions:

| Contribution | OG Respect |
|---|---|
| Introduction post | 25 |
| Camera-on per meeting | 10 |
| Full article | 50 |
| Short article | 10 |
| Editorial work | 10 |
| Featured artist | 50 |

These grants recognized contributions that fell outside the weekly ranking window - substantive public presence, writing, curation, and amplification.

ZOR era (post-September 2025) has not yet implemented equivalent one-time grants. All ZOR distribution is currently via weekly Respect Game consensus.

---

## V. The Fibonacci Curve: Mathematics and Justification

### Standard Fibonacci (Eden, Optimism Fractal)

In a 6-person consensus group, Respect is distributed according to the golden ratio:

| Rank | Respect | Ratio to Next | Cumulative % of Group |
|---|---|---|---|
| 1st | 55 | 1.618x | 40.4% |
| 2nd | 34 | 1.618x | 65.0% |
| 3rd | 21 | 1.618x | 80.4% |
| 4th | 13 | 1.615x | 89.9% |
| 5th | 8 | 1.600x | 95.6% |
| 6th | 5 | 1.250x | 100.0% |
| **Total** | **136** | -- | -- |

Each rank earns approximately 60% more than the rank below (phi = 1.618, the golden ratio).

### ZAO's Custom 2x Variant (May 2026)

The ZAO uses a 2x scaling to accelerate tier progression for top contributors:

| Rank | Respect | Ratio to Next | Cumulative % |
|---|---|---|---|
| 1st | 110 | 1.618x | 40.4% |
| 2nd | 68 | 1.618x | 65.0% |
| 3rd | 42 | 1.618x | 80.4% |
| 4th | 26 | 1.618x | 89.9% |
| 5th | 16 | 1.615x | 95.6% |
| 6th | 10 | 1.600x | 100.0% |
| **Total** | **272** | -- | -- |

The 2x curve preserves the golden ratio (preventing gaming) while doubling velocity. A top contributor earning 1st place every week reaches Elder tier (2000+ Respect) in approximately 50 weeks with the 2x curve, versus 100 weeks with the standard curve.

### Why Fibonacci? The Ultimatum Game Insight

Daniel Larimer's principle (Fractally Whitepaper, Section 3.3): *"Human judgment of contribution value has a standard error of about 60%. A Fibonacci distribution with phi = 1.618 absorbs this judgment error while creating fair splits that meet the Ultimatum Game threshold."*

The Ultimatum Game is a behavioral economics experiment: one person proposes a split of \$100 between themselves and a partner. The partner can accept or reject. If rejected, both get nothing. Rational theory predicts any split > \$0 should be accepted. Empirical reality: offers below 30% (i.e., less than a 1/3 split) are rejected even though \$0 < \$30. Humans reject unfair splits even at cost to themselves.

Fibonacci's 62/38 split between consecutive ranks exceeds the psychological fairness threshold. A member ranked 6th (receiving 5 Respect) does not feel aggrieved when 1st place receives 55, because 5/55 = 9% and the split structure (golden ratio) is universally understood as equitable. The group reaches consensus because the split feels "fair enough" under human fairness expectations, not because members are forced to accept unfair conditions.

This is mechanism design: Fibonacci is not arbitrary. It is the specific curve that balances human judgment error (60% standard deviation) with social acceptance of unequal outcomes.

---

## VI. Respect Accumulation, and the Decay Question

Respect does not disappear when earned. It accumulates over time, creating persistent reputation. Today, Respect ledgers are static - the current OG and ZOR balances do not decay. However, to keep governance weighted toward recent contribution rather than letting long-inactive members hold power forever, a weekly decay model is under consideration for the next-generation Respect token.

### The Proposed Decay Model

If adopted, each week a member's Respect balance would evolve according to:

```
R(t) = R(t-1) * 0.98 + earned(t)
```

At the start of each week, balances would shrink by 2%. New earnings would be added. Over time, if a member stops contributing, their balance would decay to zero.

### Equilibrium: The 50x Rule (If Decay Is Adopted)

If a member earns a constant amount every week and decay is active, their balance would reach equilibrium when:

```
R_equilibrium = earned / 0.02 = 50 * earned
```

**Example:** A member ranking 2nd every week earns 68 Respect. Their equilibrium balance would be:

```
R_eq = 68 / 0.02 = 3,400 Respect
```

At this point, weekly earnings (68) would exactly offset weekly decay (3,400 * 0.02 = 68). The balance would stabilize.

### Half-Life: 34 Weeks (If Decay Is Adopted)

With 2% weekly decay, Respect would have a half-life of approximately 34.3 weeks:

```
0.5 = 0.98^n
n = log(0.5) / log(0.98) = 34.3 weeks
```

An inactive member's Respect balance would drop to 50% of its current value every 34 weeks (approximately 8 months).

### The Case for Decay

Decay would enforce meritocratic governance. Without it, a member who earned high Respect years ago but contributed nothing recently would retain full voting power forever - creating an unearned oligarchy of past contributors.

With decay, voting power would gradually shift to active contributors. After 4.4 years of zero participation (approximately 230 weeks), a member's balance would decay to near-zero. Governance power would be tied to recent contribution, not accumulated history.

This creates an intentional tension: The system would value consistency (you must keep showing up to maintain power) but tolerate gaps (your balance does not vanish immediately if you miss a week). The 34-week half-life would be long enough to weather temporary absence, short enough to prevent stale oligarchy.

---

## VII. Equality: Respect vs. Token-Weighted DAOs

The Gini coefficient measures inequality (0 = perfect equality, 1 = perfect inequality). Earlier drafts of this chapter reported a single figure of ~0.23 for "ZAO". There is no single figure, and the honest version needs three, because a weekly payout and an accumulated ledger are not the same object.

| What is being measured | Gini |
|---|---|
| A single Respect Game payout, either curve | 0.41 |
| The ZOR ledger as accumulated to date (64 holders) | 0.53 |
| The OG ledger, which is what actually votes (122 holders) | **0.73** |
| Typical token-weighted DAO | 0.97-0.99 |
| US household income | ~0.39 |

The first is computed from the payout vector; the other two from the committed snapshot at block 156,071,456.

"Either curve" is not a hedge. ZAO has paid two payout curves - standard Fibonacci for its first four settled periods, the 2x curve since (Chapter 8 gives the history from the ledger) - and their Gini is **identical**, because doubling every entry in a vector changes no ratio in it. The escalation moved how fast the ledger accumulates, not how unequal a single week is. Which is why the 0.73 below, and not the 0.41 above, is the number this section is really about.

Read the table honestly. The **mechanism** is egalitarian: within a group the top 33% (ranks 1-2) take 65% of the Respect - meaningfully unequal, far from winner-take-all - and no member can hoard the rest, because consensus is required. The **outcome** is much less so. Two years of compounding on a ledger distributed by hand produces a vote-weight distribution at 0.73, and it takes only **9 of the 122 OG holders to reach a majority of vote weight, or 16 to reach the two-thirds supermajority OREC requires**.

Set that beside the Compound number this chapter has always quoted - 8 delegates holding 50%+ - and the comparison stops being flattering. ZAO's 9 is not meaningfully better than Compound's 8. What differs is not the concentration; it is **how it was acquired**. Compound's was bought. ZAO's was earned in a room, one week at a time, and every award traces to a named ranking. That is a real difference and it is the one worth defending. Claiming an equality the ledger does not show is not.

The remedies are concrete: unify the ledgers so current contribution carries current weight (Chapter 10), and adopt the decay model in section VI so accumulation stops being permanent. Chapter 9 treats this as an open problem rather than a solved one.

The Respect Game achieves fairness through deliberate mechanism design: Fibonacci scaling + ordinal ranking + peer consensus. No group member can hoard all available Respect; consensus is required, and 2/3 of the group must agree on each rank. Gaming a consensus group of 5-6 people is dramatically harder than gaming a permissionless token market.

---

## VIII. Voting Weight: The 2/3+ Rule

OG Respect - and only OG Respect - determines voting weight in the OREC governance contract. A proposal passes when:

```
yesWeight > 2 * noWeight  AND  yesWeight >= minWeight
```

This is the **2/3 supermajority rule**. Equivalently, **1/3 of active Respect can veto** any proposal.

This is fundamentally consent-based, not majority-based. A 60/40 vote fails (YES must exceed double NO). A 51/49 vote fails. Only a 67+/33 or stronger split passes.

This supermajority forces genuine consensus building. A slim majority cannot impose outcomes on a large minority. The minority has real blocking power.

That is the design. What the deployed contract has so far experienced is different, and Chapter 9 is where it is confronted: across 153 proposals, **no proposal has ever been voted down by anyone other than the person who opened it**, and no proposal has ever needed a second voter to clear the minimum weight. The supermajority rule has never had to bind, because the vote has never been contested.

---

## IX. Limitations: What Soulbound Design Sacrifices

Soulbound design has honest costs:

**1. No secondary market liquidity.** Respect cannot be borrowed, lent, or used as collateral. This prevents financial innovation but also prevents financialization of governance.

**2. No rapid onboarding of external capital.** A wealthy person cannot buy their way into ZAO governance in week one. This is intentional, but it makes cold-start difficult. New fractals cannot bootstrap voting power by external funding.

**3. No transfer-on-death mechanism.** If a member passes away, their Respect cannot be transferred to heirs or designated stewards. Under current static ledgers, the balance remains frozen; if decay is adopted in a future token, the balance would decay over time. This is a limitation for human life planning.

**4. Requires active participation to maintain power.** Unlike token holders (who can buy and hold passively), Respect holders must keep contributing to stay above the governance threshold. This is intentionally demanding.

**5. No bridging between fractals.** A member with high Respect in ZAO Fractal cannot directly transfer that reputation to Eden Fractal or another community. Each fractal starts from zero.

These are trade-offs, not bugs. They are intentional. The cost of soulbound design is reduced financial flexibility and liquidity. The benefit is that governance power cannot be bought.

---

## X. Contract Addresses (Optimism Mainnet)

All Respect contracts are deployed on Optimism (OP Mainnet, EVM chain):

- **OG Respect (ERC-20):** `0x34cE89baA7E4a4B00E17F7E4C0cb97105C216957`
- **ZOR Respect (ERC-1155):** `0x9885CCeEf7E8371Bf8d6f2413723D25917E7445c`
- **OREC Governor:** `0xcB05F9254765CA521F7698e61E0A6CA6456Be532`

All transactions are publicly verifiable on Etherscan (Optimism Mainnet explorer).

---

## Sources

- ZAO internal research: Respect Game mechanism (Fibonacci mathematics, game theory, sybil defense)
- ZAO internal research: ORDAO on-chain architecture (contract addresses, soulbound enforcement, two-ledger model)
- ZAO internal research: Respect token mechanics deep dive (decay equilibrium, half-life, tier thresholds, voting criteria, Gini coefficient, one-time grants)
- ZAO internal research: Foundational mechanism design (Daniel Larimer, Ultimatum Game, consensus models)

---

**Word count: 3,038**

---

Continue to Chapter 5: The Respect Game
