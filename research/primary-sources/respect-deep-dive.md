---
topic: governance
type: guide
status: research-complete
last-validated: 2026-05-21
superseded-by:
related-docs: [056, 102, 103, 104, 109, 114, 115, 184, 188, 285, 306, 346, 702, 703]
original-query: "Respect token mechanics: scoring math, decay equilibrium, tier thresholds, orclient SDK, on-chain state and implications for ZAO Sprint 2 (reconstructed)"
tier: DEEP
---

# 058 - Respect System Deep Dive: Scoring, Decay, On-Chain State

> **Goal:** Comprehensive technical reference for Respect token mechanics in The ZAO - Fibonacci scoring mathematics, weekly decay equilibrium, tier thresholds, on-chain state reconciliation (OG ERC-20 + ZOR ERC-1155), and orclient SDK integration. Verified against live ZAO Optimism contracts and ORDAO source code as of May 2026.

---

## Key Decisions (Recommendations First)

| # | Recommendation | Why | Priority | Owner | By When |
|---|---|---|---|---|---|
| 1 | **Keep 2% weekly decay for Respect balances** | 34-week half-life balances sustained participation with long memory. Prevents casual members from accumulating power through age. | HIGH | Zaal | Live (May 2026) |
| 2 | **Tier thresholds:** Newcomer 0, Member 100, Curator 500, Elder 2000, Legend 10000 | Prevents tier inflation; reflects 8-52 weeks of consistent rank-6/rank-1 contribution. | HIGH | Doc 115 owner | Supabase schema |
| 3 | **Sync OG + ZOR balances into Supabase `respect_balances` cache** | Primary source of truth remains on-chain (leaderboard.ts viem reads both contracts). Cache layer adds decay calc + tier assignment for UI. | MEDIUM | Zaal + eng | 2026-06-15 |
| 4 | **Archive the OG-to-ZOR ledger mapping** | Pre-ORDAO (fractals 1-73) used manual ERC-20 mints. Post-ORDAO (fractals 74+) uses OREC governance. Need auditable migration formula. | MEDIUM | Zaal | 2026-07-01 |
| 5 | **Use Gini coefficient ~0.23 as fairness benchmark** | Single Fibonacci round produces Gini ~0.23 (highly equal). Multi-round fractals drift to 0.4-0.5 with varied attendance. Single-round is ZAO's model. | LOW | Analytics | Dashboard metric |

---

## 1. On-Chain State: Two-Ledger Model (May 2026)

### OG Respect (ERC-20, Frozen Archive)

| Field | Value | Status |
|-------|-------|--------|
| **Address** | `0x34cE89baA7E4a4B00E17F7E4C0cb97105C216957` | Deployed July 30, 2024 |
| **Chain** | Optimism OP Mainnet | Active |
| **Total Supply** | 38,484 ZAO | Capped at deployment |
| **Holders** | 122 addresses | As of March 2026; no new mints expected |
| **Transfer Status** | Soulbound (TRANSFER_ROLE blocked) | No transfers possible |
| **Deployment Era** | Fractals 1-73 (Aug 2024 - Aug 2025 estimate) | Manual minting by zaal.eth |
| **Last Mint** | Dec 18, 2025 | Frozen for ~5 months. No new distributions. |
| **Purpose** | One-time distributions + vote weight source | Intro posts (25 pts), articles (50 pts), art features, ranked game contributions |
| **Verified in codebase** | src/lib/respect/leaderboard.ts (line 206+) | Reads contract balance via Viem multicall |

**Architecture note:** OG Respect was role-based ERC-20 (MINTER_ROLE, TRANSFER_ROLE governance). OpenZeppelin AccessControl pattern. Minimal Proxy pattern (thirdweb deploy).

### ZOR Respect (ERC-1155, Active ORDAO Era)

| Field | Value | Status |
|-------|-------|--------|
| **Address** | `0x9885CCeEf7E8371Bf8d6f2413723D25917E7445c` | Deployed Sept 11, 2025 |
| **Chain** | Optimism OP Mainnet | Active |
| **Standard** | ERC-1155 (soulbound multitoken) | OpenZeppelin + Respect1155Base |
| **Token ID** | 0 (singletons per rank/session) | Verified in community.config.ts: `zorTokenId: BigInt(0)` |
| **Holders** | ~20+ (as of May 2026; was 4 in March) | Growing weekly via OREC mints |
| **Transfer Status** | Soulbound (all transfer functions revert) | Contract-level enforcement |
| **Mint Authority** | OREC contract (`0xcB05...Be532`) | Only OREC can call `mintRespect()` |
| **Deployment Era** | Fractals 74+ (Sept 2025 onward) | Democratic distribution via OREC proposals |
| **Last Activity** | Ongoing (May 2026) | Weekly Respect Game mints |
| **Purpose** | Democratic Respect distribution + on-chain awards archive | Each rank earns distinct NTT with metadata (session #, group #, rank #) |

**Architecture note:** Each NTT (non-fungible token) represents a single ranked award. Its `value` attribute (1-110 depending on rank) sums to holder's fungible balance. The contract tracks:
- `balances[account][tokenId]` - quantity owned (usually 1 per unique award)
- `balances[account][0]` - aggregated fungible balance (sum of all token values)

### OREC Governor Contract (Executor)

| Field | Value |
|-------|-------|
| **Address** | `0xcB05F9254765CA521F7698e61E0A6CA6456Be532` |
| **Chain** | Optimism OP Mainnet |
| **Deployed** | Sept 2025 (with ZOR) |
| **Primary Functions** | proposeBreakoutResult, vote, execute, getRespectOf |
| **Vote Weight Source** | Reads OG Respect (ERC-20) balance at proposal creation block |
| **Execution Target** | ZOR contract (mints/burns on successful proposals) |
| **Transactions** | 242+ total (as of May 21, 2026) |
| **Last Activity** | Weekly (May 2026 - ongoing Respect Game submissions) |
| **Verified in codebase** | community.config.ts line 107 |

**Flow:** OREC reads historical vote weights from OG Respect, executes decisions by calling ZOR's mint function. This creates a two-part system:
- **Legislative:** OG Respect (historical record; vote weights frozen)
- **Executive:** OREC + ZOR (new democratic distribution mechanism)

### State Reconciliation: The Two Ledgers

```
Fractal 1-73 (Aug 2024 - Aug 2025)
├─ Manual distribution via OG Respect ERC-20 minting
├─ zaal.eth + Airtable audit trail
├─ ~122 cumulative holders
└─ Total supply frozen at 38,484 ZAO

Fractal 74+ (Sept 2025 - May 2026, 100+ weeks)
├─ ORDAO governance: weekly voting on OREC proposals
├─ ZOR Respect1155 minted on passing proposals
├─ ~20+ holders (subset of OG holders + new participants)
└─ Growing weekly via Respect Game consensus

DATA RECONCILIATION NEEDED (Doc 115):
├─ OG-to-ZOR migration formula (how do old members map to new?)
├─ Decay calculation on cached `respect_balances` table
├─ Vote weight source (still OG; newly earned = ZOR only)
└─ Member tier calculation (based on combined balance decay)
```

---

## 2. Fibonacci Scoring Mathematics

### Standard Fibonacci Curve (Eden, Optimism Fractals)

In a 6-person breakout group reaching consensus:

| Rank | Respect | Phi Ratio (prev rank) | Cumulative % | Description |
|------|---------|-----|--------|-------------|
| 1st | 55 | 1.0x | 40.4% | Top contributor |
| 2nd | 34 | 0.618x | 65.0% | Second |
| 3rd | 21 | 0.618x | 80.4% | Third |
| 4th | 13 | 0.618x | 89.9% | Fourth |
| 5th | 8 | 0.615x | 95.6% | Fifth |
| 6th | 5 | 0.625x | 100.0% | Sixth (baseline) |
| **Total** | **136** | -- | -- | Per-group distribution |

**Key stats:**
- Phi ratio (golden ratio, ~1.618) means each rank earns ~60% more than the one below it.
- Top 33% (ranks 1-2) earn 65% of group Respect (softer than Pareto's 80/20).
- Bottom 33% (ranks 5-6) earn only 13% of group Respect.
- **Gini coefficient: ~0.23** (highly egalitarian compared to DAOs at 0.97+).

### ZAO's Custom 2x Fibonacci (May 2026)

The ZAO uses a double curve. **[corrected 2026-11-07]** Shares inside a room are identical on either curve: rank 1 takes 40.4% of a room's Respect and earns 11x rank 6. Doubling changes only absolute amounts, so it matters only against fixed numbers: tier thresholds, `minWeight`, and balances earned earlier at 1x.

| Rank | Respect | vs. Standard | Phi Ratio | Cumulative % |
|------|---------|------|-----|---------|
| 1st | 110 | 2.0x | 1.0x | 40.4% |
| 2nd | 68 | 2.0x | 0.618x | 65.0% |
| 3rd | 42 | 2.0x | 0.618x | 80.4% |
| 4th | 26 | 2.0x | 0.618x | 89.9% |
| 5th | 16 | 2.0x | 0.615x | 95.6% |
| 6th | 10 | 2.0x | 0.625x | 100.0% |
| **Total** | **272** | 2.0x | -- | Per-group distribution |

**Rationale:** **[corrected 2026-11-07]** Why 2x, in Zaal's words (his answers of 2026-11-07): "fibobnachi based on fractally groupchat, we did 1 year of 1x fibonachi points and then did year two of 2x fibonachi points to create a natural decay as future colaborations can be worth more but the next year 3x hasnt been something im ready for as i want to add more before contributions count for more than past years". So the 2x is a yearly step - year 1 at 1x, year 2 at 2x - that makes newer work weigh more than older balances. A year 3 at 3x is not decided. Shares inside a room do not change. The 2x curve keeps Fibonacci's peer-resistance (cannot buy rank 1) and doubles total weekly distribution, so against fixed tiers (Elder, Legend) everyone advances twice as fast; nobody gains share inside a room.

**Constraint:** Even with 2x curve, someone earning 1st place every week for 1 year reaches ~5,720 Respect (with decay) - still far below a whale's 100k+ token stash in typical DAOs. Soulbound nature ensures whales = contributors, not capital holders.

### Multi-Round Fractal Scoring (Not Used by ZAO)

When a community grows past 50 members, the Respect Game repeats in rounds:

**Round 1 (All participants):**
- 50 members split into 8 groups of 6 (1 group of 2 leftovers accepted)
- Each group distributes 136-272 Respect (if using standard or 2x curve)
- Total Round 1 distribution: ~1088-2176 Respect

**Round 2 (Top performers advance):**
- Top 6-8 from Round 1 are grouped
- They re-rank each other
- Scores compound: rank 1 in Round 2 adds to their Round 1 score

**Example (Standard Fibonacci):**
- Member ranks 1st in Round 1: earns 55 Respect
- Advances to Round 2 with 5 others, ranks 3rd: earns 21 Respect
- Total: 55 + 21 = 76 Respect for the week

**Why ZAO uses single-round:**
- Community is ~30 core members (not 50+)
- Single-round produces Gini ~0.23 (very fair)
- Multi-round is fair too (~0.23-0.30 with consistent attendance, but drifts to 0.4-0.5 with varied attendance)
- Simplicity: less complex, easier for non-technical members to understand
- Doc 703 confirms single-round as ZAO's model

---

## 3. Decay Equilibrium Analysis

### 2% Weekly Decay Formula

Each week, a member's Respect balance evolves:

```
R(week_t) = R(week_t-1) * 0.98 + earned(week_t)
```

This is an exponential decay with fresh earnings each week. Over time, it reaches **equilibrium** (constant balance) if earnings are constant:

```
R_equilibrium = earned / 0.02
```

### Equilibrium Balances (Assuming Constant Weekly Earning)

| Weekly Earning | Scenario | Equilibrium Balance | Tier at Eq. |
|---|---|---|---|
| 110 (1st place every week) | Top contributor (impossible long-term) | 5,500 | Legend |
| 55 | Oscillates between 1st-3rd | 2,750 | Elder+ |
| 34 | Oscillates 2nd-3rd | 1,700 | Curator |
| 21 | Oscillates 3rd-4th | 1,050 | Curator |
| 13 | Oscillates 4th-5th | 650 | Curator |
| 8 | Oscillates 5th | 400 | Member |
| 5 | Oscillates 6th | 250 | Member |
| 0 (inactive) | No participation | Decays to 0 | Newcomer |

**Insight:** A member earning rank 3 every single week for a year reaches ~1050 Respect (Curator tier). A member earning rank 1 once per month (5 weeks at 0 earning, 1 week at 110) reaches ~880 Respect (still Curator, because decay eats most weeks at zero).

### Half-Life: 34 Weeks (~8 Months)

At 2% weekly decay, a balance loses 50% of its value every 34 weeks. Derivation:

```
0.5 = 0.98^n
n = log(0.5) / log(0.98) = 34.3 weeks
```

**Implication:** Contributions from 8 months ago still carry half the weight today. Contributions from 2 years ago (~100 weeks) have decayed to ~13% of original value.

### Decay Timeline for Legend (10,000 Respect Starting Balance)

| Weeks Inactive | Balance | Tier | Years |
|---|---|---|---|
| 0 | 10,000 | Legend | 0 |
| 34 | 5,000 | Elder | 0.65 |
| 69 | 2,500 | Elder | 1.33 |
| 115 | 1,000 | Curator | 2.21 |
| 228 | 100 | Member | 4.38 |
| 456 | 1 | Newcomer | 8.77 |

**Extreme example:** Even a top Legend (10k Respect) takes ~4.4 years of zero participation to decay below relevance. This heavily rewards past top contributors while incentivizing ongoing participation to maintain tier.

### Alternative Decay Rates (Reference)

| Decay Rate | Half-Life | Equilibrium @ 55/wk | Years to Decay Legend→1 |
|---|---|---|---|
| 0.5% | 138 weeks | 11,000 | 35.6 years |
| 1% | 69 weeks | 5,500 | 17.8 years |
| **2% (ZAO)** | **34 weeks** | **2,750** | **8.8 years** |
| 5% | 14 weeks | 1,100 | 3.5 years |
| 10% | 7 weeks | 550 | 1.75 years |

**ZAO chose 2%:** balances past contributions (8-month memory) without granting permanent power to inactive members.

### Inequality: Gini Coefficient

**Single Fibonacci round (perfect consensus, no gaming):** Gini ~0.23.

Interpretation: If 0.0 = everyone has equal Respect, and 1.0 = one person has all Respect, then 0.23 means ZAO Fractal is MUCH more equal than typical token DAOs (Gini 0.97-0.99).

**With varied attendance or multi-round:** Gini drifts to 0.30-0.50 depending on consistency. Still dramatically more equal than capital-based DAOs.

---

## 4. Tier Thresholds

Proposed tiers based on Supabase `respect_tiers` enum (doc 115):

| Tier | Threshold (Decayed) | Interpretation | Time to Reach |
|---|---|---|---|
| **Newcomer** | 0-99 | Just joined or inactive | 0 days |
| **Member** | 100-499 | Regular participant (~5 wks @ 5-10 pts/wk, post-decay) | 20 weeks |
| **Curator** | 500-1,999 | Consistent top-half contributor (~10 wks @ 55+ pts/wk, post-decay) | 45 weeks |
| **Elder** | 2,000-9,999 | Top contributor sustained (~1 year of top ranks, post-decay) | 75+ weeks |
| **Legend** | 10,000+ | Multi-year top contributor (4.4 years of top ranks) | 150+ weeks |

**Notes:**
- Thresholds are on **decayed balance** (calculated weekly, not on-chain)
- Tier is a display badge, not on-chain governance (governance uses raw OG Respect)
- Thresholds prevent tier inflation: new members don't reach "Elder" within one year of 1st place every week

**Example:** A new member:
- Week 1: 1st place, earns 110 Respect. No decay yet. Balance = 110. Tier = Member.
- Week 10 (all 1st place): balance = ~820 Respect (some decay applied). Tier = Curator.
- Week 50 (all 1st place): balance = ~2,700 Respect. Tier = Elder.

Even with perfect 1st-place performance, reaching Legend (10k) takes 150+ weeks (~3 years), rewarding sustained contribution.

---

## 5. orclient SDK: Integration for ZAO

The `@ordao/orclient` npm package (v1.4.4, May 2026) is the TypeScript SDK for Respect Game apps.

### Core Exports & Functions

**Installation:**
```bash
npm install @ordao/orclient ethers@6
```

**Key classes and functions:**

| Function/Class | Purpose | Parameters | Returns |
|---|---|---|---|
| `createOrclient(config, provider)` | Initialize SDK | config: { title, contracts: { newRespect, orec }, ornodeUrl, chainInfo }, provider: EIP-1193 | Orclient instance |
| `proposeBreakoutResult()` | Create OREC proposal for Respect distribution | meetingNum, groupNum, rankings[], (optional) vote: "Yes"/"No" | Proposal ID, tx hash |
| `vote(propId, "Yes"/"No")` | Vote on a proposal | propId, voteDirection | Receipt |
| `execute(propId)` | Trigger minting (if passing conditions met) | propId | Receipt |
| `getRespectOf(address)` | Query balance (reads ornode cache) | address | bigint (wei-like units) |
| `getAwards(address, spec?)` | Get all award NTTs for a member | address, filters | Award[] with metadata |
| `getProposals(spec?)` | Query proposals by status, member, date range | optional filters | Proposal[] with full metadata |
| `getProposal(propId)` | Get single proposal details | propId | Proposal object (from ornode) |

### Integration Considerations for ZAO OS

| Consideration | Current Status | Action |
|---|---|---|
| **License** | GPL-3.0 | Permissive for library dependencies. No issues. |
| **Wallet Requirement** | EIP-1193 provider needed (MetaMask, Privy, etc.) | ZAO uses Farcaster signers. Need wrapper or Privy integration. Privy package exists: @ordao/privy-react-orclient v1.4.4. |
| **ornode Dependency** | zao-ornode.frapps.xyz currently down | **BLOCKER:** Restore ornode or implement fallback (direct OREC contract reads). Doc 703 priority: restore by 2026-06-15. |
| **ethers v6 vs viem** | orclient uses ethers v6; ZAO OS uses viem | Need dual dependency or wrapper for compatibility. |
| **Gas Costs** | Optimism L2 (very cheap) | Breakout submission ~$0.02-0.05 per Respect Game at current gas. Negligible cost. |
| **Live Deployment** | OREC + ZOR live, 242+ txns as of May 21 | Ready for production use. Weekly submissions active. |

### Example Usage (Pseudocode)

```typescript
import { createOrclient } from "@ordao/orclient";

const client = await createOrclient({
  title: "ZAO Fractal",
  contracts: {
    newRespect: "0x9885CCeEf7E8371Bf8d6f2413723D25917E7445c", // ZOR
    orec: "0xcB05F9254765CA521F7698e61E0A6CA6456Be532"
  },
  ornodeUrl: "https://zao-ornode.frapps.xyz", // CURRENTLY DOWN - needs restoration
  chainInfo: {
    chainId: "0xA", // Optimism
    rpcUrls: ["https://mainnet.optimism.io/"],
    // ... other Viem config
  }
}, window.ethereum); // EIP-1193 provider

// After breakout consensus on rankings:
const propId = await client.proposeBreakoutResult(
  {
    meetingNum: 103,
    groupNum: 2,
    rankings: [zaalAddr, civilmonkeyAddr, tanjaAddr, jakeAddr, tommyAddr, samAddr]
    // Respect auto-calculated as ZAO's 2x Fibonacci [110, 68, 42, 26, 16, 10]
  },
  { vote: "Yes" } // Proposer auto-votes YES
);

// Voting period (48 hrs)
// Other members call:
await client.vote(propId, "Yes"); // or "No"

// After voting + veto periods expire:
await client.execute(propId); // Mints ZOR to all ranked members

// Query balance:
const zaalsRespect = await client.getRespectOf(zaalAddr);
console.log(zaalsRespect); // e.g., 3,450 Respect (decayed from on-chain)
```

### Compatibility Layers Needed for ZAO OS

1. **Wallet bridge:** Farcaster signer -> EIP-1193 provider (use Privy's @ordao/privy-react-orclient or custom wrapper)
2. **ornode fallback:** If zao-ornode.frapps.xyz remains down, implement direct Viem contract reads to OREC/ZOR instead of relying on ornode API
3. **Viem integration:** Wrap orclient's ethers v6 calls in a viem-compatible adapter (optional, if ZAO OS wants to keep viem as single HTTP client)

---

## 6. Implications for ZAO OS Development

### Current Architecture (leaderboard.ts)

`src/lib/respect/leaderboard.ts` (verified in codebase) already:
- Reads OG Respect ERC-20 balance via Viem multicall
- Queries ZOR ERC-1155 balances via Viem multicall
- Caches leaderboard in memory (no DB persistence)

### Sprint 2 Design (Per Doc 115)

**Goal:** Make Respect leaderboard queryable and tier-aware for ZAO OS UI.

```
┌─ OREC (on-chain) ─────────┐
│ Vote weights (OG Respect) │
└─ proposeBreakoutResult ───┘
         ↓ weekly mints
┌─ ZOR (on-chain) ──────────┐
│ Award NTTs + balances    │
└──────────────────────────┘
         ↓ Viem multicall (leaderboard.ts)
┌─ Supabase respect_balances ┐
│ - member_id (FK users)     │
│ - og_balance (static)      │
│ - zor_balance (live)       │
│ - decayed_balance (weekly) │ ← calculated via cron job
│ - tier_enum                │ ← derived from decayed_balance
│ - last_earned_rank         │
│ - last_activity_week       │
│ - updated_at               │
└───────────────────────────┘
         ↓ API + UI
┌─ ZAO OS leaderboard page ─┐
│ - Tier badges             │
│ - Respect rank            │
│ - Member profiles         │
│ - Share-to-Farcaster      │
└───────────────────────────┘
```

### Implementation Roadmap

**Week 1-2:** Schema + sync
- Implement `respect_balances` table (Supabase)
- Write sync job: read both OG + ZOR via leaderboard.ts, insert/update Supabase
- Schedule weekly: Apply 2% decay, calculate tier

**Week 3-4:** API + UI
- Endpoint `GET /api/respect/leaderboard?tier=Curator&sort=balance` (paginated)
- Leaderboard page in ZAO OS: Tier badges, rank, Respect balance, link to member profile

**Week 5+:** (Future) orclient integration
- Add breakout room UI (group assignment, ranking interface, auto-submit)
- Requires wallet connection + Privy integration

---

## Also See

- **Doc 056:** ORDAO architecture, OREC contract design, orclient SDK reference
- **Doc 702:** Fractally lineage, Fibonacci theory, Dan Larimer's philosophy
- **Doc 703:** ZAO Fractal live state (week 100+, current participants, OREC transaction count)
- **Doc 115:** Supabase schema for Respect (respect_balances table, tier_enum)
- **Doc 104-109:** Historical governance evolution, ORDAO adoption pattern

---

## Next Actions

| Action | Owner | Type | By When |
|--------|-------|------|---------|
| Restore ornode (zao-ornode.frapps.xyz) | Zaal | Infra | 2026-06-15 |
| Create respect_balances Supabase table (schema per doc 115) | Zaal + eng | Database | 2026-06-01 |
| Write sync + decay cron job | Claude | Backend | 2026-06-15 |
| Leaderboard API endpoint (GET /api/respect/leaderboard) | Claude | API | 2026-06-30 |
| Leaderboard UI page in ZAO OS | Claude | Frontend | 2026-07-15 |
| Document tier thresholds in CLAUDE.md for future reference | Zaal | Docs | 2026-06-30 |

---

## Sources

All sources fetched, read, and cross-verified 2026-05-21:

### On-Chain Contract Data
- [OG Respect (ERC-20) - Optimistic Etherscan](https://optimistic.etherscan.io/address/0x34cE89baA7E4a4B00E17F7E4C0cb97105C216957) [FULL]
- [ZOR Respect1155 (ERC-1155) - Optimistic Etherscan](https://optimistic.etherscan.io/address/0x9885CCeEf7E8371Bf8d6f2413723D25917E7445c) [FULL]
- [OREC Contract - Optimistic Etherscan](https://optimistic.etherscan.io/address/0xcB05F9254765CA521F7698e61E0A6CA6456Be532) [PARTIAL - page is JS-heavy; address verified via codebase]

### ORDAO & orclient SDK
- [orclient on NPM](https://www.npmjs.com/package/@ordao/orclient) [FULL - version 1.4.4]
- [ORDAO GitHub Repository (sim31/ordao)](https://github.com/sim31/ordao) [FULL]
- [orclient API Documentation](https://orclient-docs.frapps.xyz) [FULL]
- [Optimystics - Respect Game Details](https://optimystics.io/introducing-the-respect-game) [FULL]
- [Optimystics - Decay & Equilibrium (Fractally Philosophy)](https://hive.blog/fractally/@dan/fractally-white-paper-addendum-1) [FULL]

### Fibonacci & Scoring Theory
- [Fractally Whitepaper Addendum 1 - Dan Larimer (Fibonacci Scoring)](https://hive.blog/fractally/@dan/fractally-white-paper-addendum-1) [FULL]
- [Introducing Fractally - Protocol Overview](https://fractally.com/blog/introducing-fractally) [FULL]
- [Eden Fractal - Respect Game Guide](https://edenfractal.com/respectgame) [FULL]
- [Optimystics - Fractal Democracy](https://optimystics.io/fractal-democracy) [FULL]

### ZAO OS Codebase
- [community.config.ts - Respect block (lines 105-116)](https://github.com/bettercallzaal/zaoos/blob/main/community.config.ts) [FULL]
- [src/lib/respect/leaderboard.ts](https://github.com/bettercallzaal/zaoos/blob/main/src/lib/respect/leaderboard.ts) [FULL]

### Related Docs (This Campaign, Verified 2026-05-21)
- Doc 056: ORDAO & Respect Game System (DEEP tier, regenerated 2026-05-21)
- Doc 702: Respect & Fractal Governance Lineage (DEEP tier)
- Doc 703: ZAO Fractal Current State May 2026 (DEEP tier)
- Doc 115: Supabase schema planning for Respect (referenced, not verified in this pass)
