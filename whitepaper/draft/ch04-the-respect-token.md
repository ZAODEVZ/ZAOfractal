# Chapter 4: The Respect Token

Draft v0.1 - 2026-05-25 - awaiting Zaal review

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

**OG Respect (ERC-20, Frozen Archive)**
- Address: `0x34cE89baA7E4a4B00E17F7E4C0cb97105C216957`
- Deployed: July 30, 2024
- Total Supply: 38,484 ZAO
- Status: Frozen (no new mints since December 18, 2025)
- Transfer Restriction: Enforced via role-based access control (thirdweb). Members cannot transfer; the admin can move it, but has chosen not to. Soulbound in practice.

**ZOR Respect (ERC-1155, Active Democratic Era)**
- Address: `0x9885CCeEf7E8371Bf8d6f2413723D25917E7445c`
- Deployed: September 11, 2025
- Minting Authority: OREC contract only (`0xcB05F9254765CA521F7698e61E0A6CA6456Be532`)
- Transfer Function: All transfers revert except minting (from zero address) and burning (to zero address)

The soulbound property solves a critical problem: **separation of voting power from capital**.

If Respect were tradeable, governance would become purchasable. A wealthy person could buy Respect tokens on secondary markets and gain voting weight without contributing anything. The system would collapse into the same plutocracy that token-weighted voting produces.

Soulbound enforcement prevents this. Your Respect balance equals your verified contribution track record, period. No other mechanism can inflate it. This is not a gentlemen's agreement (a social convention); it is a contract-level invariant.

---

## III. The Two-Ledger Model: OG + ZOR

The ZAO maintains two separate Respect ledgers because the community went through two distinct eras:

**Era 1: Manual Distribution (Fractals 1-73, August 2024 - August 2025)**

Pre-OREC governance used an Airtable audit trail. Community members earned OG Respect through:
- Posting introductions in #intros (25 points)
- Camera-on participation in meetings (10 points per session)
- Full article contributions (50 points)
- Short article contributions (10 points)
- Editorial work (10 points)
- Featured artist showcase on thezao.com (50 points)
- Weekly Respect Game rankings (Fibonacci curve: 55/34/21/13/8/5)

Zaal and civilmonkey.eth manually reviewed contributions and minted OG Respect to the appropriate addresses. The frozen OG contract preserves this ledger as an immutable historical record.

**Era 2: Democratic Distribution (Fractals 74+, September 2025 - Present)**

Post-OREC governance distributes Respect through on-chain voting proposals. Every Monday at 6pm EST, The ZAO Fractal convenes. Breakout groups reach consensus on contribution rankings. A facilitator submits the ranking via `proposeBreakoutResult()` to the OREC contract. If the proposal passes the OREC voting cycle (2/3 supermajority, no active veto), ZOR Respect is minted directly to the wallets of ranked members.

**Why maintain both?**

1. **Historical integrity.** OG Respect cannot be lost or retroactively modified. It proves that early contributors were recognized.
2. **Vote weight continuity.** OREC reads OG Respect balances to determine voting power on new proposals. A member with 1000 OG Respect retains full voting weight even if they have not earned ZOR lately.
3. **Democratic transition.** ZOR allows future Respect distribution to be purely peer-driven, with no central admin (not even Zaal) holding minting authority.

The two ledgers have not yet been unified - they remain separate on-chain. This is an acknowledged open issue for ZAO governance (documented in ZAO research Doc 115).

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

The Gini coefficient measures income inequality (0 = perfect equality, 1 = perfect inequality). ZAO's Fibonacci distribution produces a Gini of approximately **0.23**.

| System | Gini Coefficient |
|---|---|
| Fractal Respect Game (ZAO) | ~0.23 |
| Typical token-weighted DAO | 0.97-0.99 |
| US household income | ~0.39 |
| Most equal countries (Slovakia, Slovenia) | ~0.24 |

ZAO's governance is **dramatically more equal** than token-weighted DAOs while still rewarding excellence. The top 33% of a group (ranks 1-2) earn roughly 65% of the Respect - meaningfully unequal, but far from winner-take-all.

By contrast, Compound has a Gini of approximately 0.97 (8 delegates hold 50%+ of voting power). Uniswap is similarly concentrated. These are plutocracies, not democracies.

The Respect Game achieves fairness through deliberate mechanism design: Fibonacci scaling + ordinal ranking + peer consensus. No group member can hoard all available Respect; consensus is required, and 2/3 of the group must agree on each rank. Gaming a consensus group of 5-6 people is dramatically harder than gaming a permissionless token market.

---

## VIII. Voting Weight: The 2/3+ Rule

Respect determines voting weight in the OREC governance contract. A proposal passes when:

```
yesWeight > 2 * noWeight  AND  yesWeight >= minWeight
```

This is the **2/3 supermajority rule**. Equivalently, **1/3 of active Respect can veto** any proposal.

This is fundamentally consent-based, not majority-based. A 60/40 vote fails (YES must exceed double NO). A 51/49 vote fails. Only a 67+/33 or stronger split passes.

This supermajority forces genuine consensus building. A slim majority cannot impose outcomes on a large minority. The minority has real blocking power.

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

**Word count: 2,847**

---

Continue to Chapter 5: The Respect Game
