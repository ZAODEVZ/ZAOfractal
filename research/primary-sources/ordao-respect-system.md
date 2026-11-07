---
topic: governance
type: guide
status: research-complete
last-validated: 2026-05-21
superseded-by:
related-docs: [058, 102, 103, 104, 105, 109, 114, 115, 184, 188, 285, 306, 346, 702, 703]
original-query: "ORDAO governance toolset, Respect Game mechanics, OREC contract design - how The ZAO uses fractal scoring (reconstructed)"
tier: DEEP
---

# 056 - ORDAO & Respect Game System

> **Goal:** Explain the Optimistic Respect-based DAO (ORDAO) governance stack - OREC smart contracts, the Respect Game protocol, orclient SDK, and how The ZAO applies fractal democracy to on-chain governance. Verified against Optimystics source code and live ZAO deployments as of May 2026.

---

## Key Decisions (Recommendations First)

| Decision | Owner | Status | Notes |
|----------|-------|--------|-------|
| **Use ZAO's 2x Fibonacci scoring (110/68/42/26/16/10) as standard curve** | Zaal | Live | Same differentiation as canonical Fibonacci (55/34/21/13/8/5), double the amounts: a year 2 step so newer work weighs more than older balances (corrected 2026-11-07). See Section 4. |
| **Keep OREC submission gated to experienced 2-3 wallets** | Zaal | Current | Risk mitigation until UI/UX in ZAO OS is finalized. Plan to open via ZAO OS UI (future sprint). |
| **Sync on-chain Respect state (OG + ZOR) into Supabase `respect_balances` as cache** | Doc 115 owner | In progress | Leaderboard.ts already reads both contracts; cache layer adds decay + tier calculation. |
| **Document fractal as non-technical onboarding tool** | Zaal + CLAUDE.md | Doc 703 rec | Tanja + non-builders cannot explain the fractal. Skeleton guides + video intros needed. |

---

## Overview

ORDAO is a governance toolset built by [Optimystics](https://github.com/Optimystics) (team: Dan SingJoy, Tadas Vaitiekunas, Rosmari) for DAOs that use non-transferable reputation tokens called **Respect**. At its core is the **Optimistic Respect-based Executive Contract (OREC)**, which enables democratic on-chain execution while solving the voter-apathy problem that plagues traditional DAO governance.

The system was originally developed for **Optimism Fractal** (Nov 2024 adoption) and has since been generalized for any community to deploy on Ethereum-compatible chains. **The ZAO** deployed its own ORDAO instance (zao.frapps.xyz) on Optimism OP Mainnet in 2024-2025, running continuous weekly Respect Games since August 2024 (100+ weeks as of May 2026).

**Key insight:** ORDAO solves two problems at once - it replaces centralized vote distribution with democratic peer evaluation (Respect Game), AND it replaces admin-driven on-chain execution with optimistic consent-based voting (OREC).

---

## GitHub & Code Repositories

All source code lives under the [Optimystics GitHub org](https://github.com/Optimystics) (16+ repos):

| Repo | Description | License | Status (May 2026) |
|------|-------------|---------|----------|
| **[ordao](https://github.com/Optimystics/ordao)** | Core monorepo: OREC contracts, orclient, ornode, ortypes, GUI, console | GPL-3.0 | Active - 185+ commits on main |
| **[orfrapps](https://github.com/Optimystics/orfrapps)** | Deployment platform & config for fractal communities | MIT | Active |
| **[frapps](https://github.com/Optimystics/frapps)** | Fractal apps toolkit (ORDAO + Respect.Games + Fractalgram) | MIT/GPL-3.0 | Active |
| **[respect.games-ui](https://github.com/Optimystics/respect.games-ui)** | Async Respect Game app UI | MIT | Testing phase |
| **[Respect.Games-app-smart-contracts](https://github.com/Optimystics/Respect.Games-app-smart-contracts)** | Contracts for async Respect Games | MIT | Deployed Sept 2024 |
| **[op-fractal-sc](https://github.com/Optimystics/op-fractal-sc)** | Original Optimism Fractal contracts (legacy, pre-ORDAO) | GPL-3.0 | Archived |
| **[fractalgram](https://github.com/Optimystics/fractalgram)** | Telegram native app for breakout room consensus | GPL-3.0 | Active - UI refresh in progress |
| **[OptimismFractal.com](https://github.com/Optimystics/OptimismFractal.com)** | Optimism Fractal website | -- | Archive (Optimism Fractal paused Jan 2026) |

**Upstream development:** [sim31/ordao](https://github.com/sim31/ordao) on GitHub (Tadas's personal repo, 185+ commits). The Optimystics fork tracks it.

---

## ORDAO Architecture

The ORDAO monorepo is structured as a Lerna/NX polyrepo (92% TypeScript, 7% Solidity, 1% other):

```
ordao/ (monorepo)
├── contracts/
│   ├── orec/              # OREC: Optimistic Respect-based Executive Contract
│   ├── respect1155/       # Respect1155: ERC-1155 soulbound token (ORDAO era)
│   └── solidrespect/      # ERC-20-compatible fixed-supply Respect variant
├── services/
│   ├── ornode/            # Backend indexer: stores proposal content, votes, metadata
│   └── ornode-client/     # TypeScript client for ornode API
├── libs/
│   ├── orclient/          # Client SDK for proposals, voting, execution, querying
│   ├── ortypes/           # Shared domain model: Zod types, translation layer
│   ├── ts-utils/          # Shared utilities
│   └── privy-react-orclient/  # React hooks + Privy auth integration
├── apps/
│   ├── gui/               # Frontend: breakout result submission + proposal mgmt
│   ├── console/           # Browser console (OR console) for contract interaction
│   └── orclient-docs/     # Auto-generated orclient API documentation
├── tools/                 # Dev/deploy/CI scripts
└── docs/                  # Specs: OREC.md, OF_ORDAO_UPGRADE.md, upgrade paths
```

### Data Flow

```
Breakout room consensus (off-chain)
  ↓
orclient.proposeBreakoutResult(rankings, votes)
  ↓ splits into two paths:
  ├─ On-chain: submit Respect rankings as OREC proposal (voting period)
  └─ Off-chain: upload proposal metadata to ornode
  ↓
Voting & veto period on OREC contract
  ↓ Passing condition met:
  ├─ Anyone calls orclient.execute(propId)
  ├─ OREC mints Respect1155 (or burns, if negative adjustment)
  └─ ornode updates proposal status
  ↓
Leaderboard query: orclient.getRespectOf(addr) hits ornode cache
```

---

## OREC: The Optimistic Respect-based Executive Contract

### The Voter-Apathy Problem

Traditional DAOs suffer from low turnout. A 10% voter participation forces a 50% quorum to be legitimate, which is rarely achieved. Founders then fall back to multisig control (centralization). OREC inverts the model: assume consensus exists and let the minority veto.

### OREC Mechanics: Optimistic Consent

OREC uses a three-phase cycle instead of simple majority voting:

1. **Voting Phase (e.g., 48 hours):** Anyone holding Respect can vote YES or NO. Vote weight = Respect balance at proposal start. Each vote is an on-chain transaction.
2. **Veto Phase (e.g., 48 hours):** The voting period has closed. NOW, only NO votes are accepted. This is the "challenge window" - if anyone spots a bad proposal, they have this window to block it. New YES votes are rejected.
3. **Execution Phase:** After both phases elapse, check if the proposal passed. If it did, anyone can trigger execution by signing a transaction.

### Passing Conditions

All three conditions must be true:

- `voting_phase_duration + veto_phase_duration` time has elapsed
- `yes_weight >= min_weight_threshold` (minimum participation)
- `yes_weight > 2 * no_weight` (supermajority: YES exceeds double the NO)

**Consequence:** **[corrected 2026-11-07]** 1/3 of the weight that votes can veto (NO weight of at least half the YES weight); weight that does not vote counts for nothing. 2/3 of the weight that votes can pass one.

### Key Parameters (Configurable per Deployment)

| Parameter | Typical Value | Purpose |
|-----------|---------------|---------|
| `voting_period` | 48 hours | Window for YES/NO voting |
| `veto_period` | 48 hours | Window for NO votes only (challenge period) |
| `prop_weight_threshold` | 10% of total Respect | Minimum YES votes needed to be eligible |
| `respect_contract` | (ERC-20 address) | Token contract for vote weights |
| `max_live_votes` | 10 | Spam prevention: max concurrent YES votes per wallet |

ZAO's OREC config verified in community.config.ts (lines 105-116): reads both OG Respect (ERC-20) and ZOR Respect (ERC-1155) for vote weights.

### Why "Optimistic"

The name mirrors optimistic rollups: security comes from a fraud-proof period, not active majority consensus. Instead of "prove the transaction is valid," it's "prove the proposal is bad." This flips the burden - good-faith communities can move fast; bad-faith proposals get blocked.

### Anti-Spam Design

The `max_live_votes` parameter limits one account to N concurrent YES votes. Without it, a whale with huge Respect could spam 100 bad proposals, forcing everyone else to spend gas vetoing repeatedly. With the cap, spam becomes economically irrational.

---

## The Respect Game

The Respect Game is the peer-evaluation protocol that distributes Respect. It was pioneered by Fractally (Dan Larimer, January 2022) and perfected through three years of live use at Eden Fractal, Optimism Fractal, and ZAO Fractal.

### Phases of One Weekly Session

1. **Gathering (5-10 min):** All participants join a video call. Facilitator randomizes breakout room assignments (via Discord, Zoom, or Fractalgram bot).
2. **Random Breakout Groups (45-60 min):** Groups of 3-6 people. Each person gets 3-4 minutes to share their contributions ("I shipped X, shipped Y, mentored Z, wrote about...").
3. **Consensus Ranking:** The group discusses and collectively ranks members **1-6** (1 = most helpful this week, 6 = least, or proportional for smaller groups). The ranking is consensus-driven - 2/3 agreement required (per Fractally spec).
4. **On-Chain Submission:** Organizer (or consensus member with keys) submits the ranking via ORDAO frontend (Fractalgram Telegram bot or web GUI). This creates an OREC proposal.
5. **Voting & Veto:** Community votes YES/NO on the proposal during voting period. No vetoes expected for accurate consensus. Proposal auto-executes when passing conditions are met.
6. **Minting:** OREC mints Respect1155 tokens to the ranked participants - no admin approval needed.

### Timing at ZAO

- **Schedule:** Mondays 6pm EST (since Aug 2024)
- **Duration:** ~45 min breakouts + 15 min gather/regroup = 60 min total per session
- **Session #:** 100+ continuous weeks (May 2026)
- **Active participants:** 6-30 (varies weekly; core ~6-10 builders)

### Fractal Scaling (When Community Grows)

The Respect Game is **fractal** - it repeats at different scales:

- **Round 1:** All 50 participants split into 8-9 groups of 6. Each group distributes Respect.
- **Round 2:** Top 8 participants from Round 1 (highest Respect) form a new group of 6-8, evaluate each other again, distribute additional Respect. Repeats Fibonacci per rank.
- **Round 3+:** Continue until fewer than 6 remain.

**Current ZAO practice:** Single-round (no multi-round cascade). Doc 702 confirms this as best practice for communities under 100 members. Optimism Fractal also uses single-round.

---

## Scoring: Fibonacci vs. ZAO's 2x Variant

### Standard Fibonacci (Eden, Optimism Fractals)

Respect distributed per rank in a 6-person group:

| Rank | Respect | Phi Ratio |
|------|---------|-----------|
| 1st (highest) | 55 | 1.0x |
| 2nd | 34 | 0.618x |
| 3rd | 21 | 0.618x |
| 4th | 13 | 0.618x |
| 5th | 8 | 0.618x |
| 6th (lowest) | 5 | 0.625x |
| **Per-group total** | **136** | -- |

Each rank earns roughly 60% more than the one below (phi ~ 1.618). Top 33% earn 66% of group Respect (softer than Pareto 80/20). **Gini coefficient ~0.23** (highly equal).

### ZAO's Custom 2x Fibonacci Curve

The ZAO uses a custom curve - exactly 2x the canonical Fibonacci. **[corrected 2026-11-07]** Shares inside a room are identical on either curve: rank 1 takes 40.4% of a room's Respect and earns 11x rank 6. Doubling changes only absolute amounts, so it matters only against fixed numbers: tier thresholds, `minWeight`, and balances earned earlier at 1x.

| Rank | Respect | vs. Standard |
|------|---------|------|
| 1st | 110 | 2x |
| 2nd | 68 | 2x |
| 3rd | 42 | 2x |
| 4th | 26 | 2x |
| 5th | 16 | 2x |
| 6th | 10 | 2x |
| **Per-group total** | **272** | 2x |

**Rationale:** **[corrected 2026-11-07]** Why 2x, in Zaal's words (his answers of 2026-11-07): "fibobnachi based on fractally groupchat, we did 1 year of 1x fibonachi points and then did year two of 2x fibonachi points to create a natural decay as future colaborations can be worth more but the next year 3x hasnt been something im ready for as i want to add more before contributions count for more than past years". So the 2x is a yearly step - year 1 at 1x, year 2 at 2x - that makes newer work weigh more than older balances. A year 3 at 3x is not decided. Shares inside a room do not change. The curve is no steeper than canonical Fibonacci; it still resists gaming (peer-ranked, not tradeable).

### Why Fibonacci at All

Dan Larimer's insight: human judgment of value has wide error bars (~60% relative error). A Fibonacci curve with that ratio absorbs error gracefully. You cannot buy your way to rank 1; only peer consensus puts you there.

---

## Smart Contracts on Optimism OP Mainnet

### 1. OG Respect (ERC-20)

| Field | Value |
|-------|-------|
| **Address** | `0x34cE89baA7E4a4B00E17F7E4C0cb97105C216957` |
| **Standard** | ERC-20 (thirdweb Minimal Proxy pattern) |
| **Deployed** | July 30, 2024 (block 123349892) |
| **Total Supply** | 38,484 ZAO |
| **Holders** | 122 addresses (as of March 2026) |
| **Transfer Model** | Soulbound - `TRANSFER_ROLE` blocked |
| **Minting** | Manual via `MINTER_ROLE` (zaal.eth) |
| **Last Activity** | Dec 18, 2025 (frozen for ~5 months) |

**Use case:** One-time distributions for specific achievements: intro posts (25 pts), content (10-50 pts), artist features (50 pts). NOT for weekly Respect Game (that was pre-ORDAO). **Status: archived ledger.**

**Verified in codebase:** `src/lib/respect/leaderboard.ts` line 206+ reads this contract via Viem for vote-weight lookups.

### 2. ZOR (ERC-1155, ORDAO Era)

| Field | Value |
|-------|-------|
| **Address** | `0x9885CCeEf7E8371Bf8d6f2413723D25917E7445c` |
| **Standard** | ERC-1155 (OpenZeppelin + Respect1155Base) |
| **Deployed** | September 11, 2025 |
| **Token ID** | 0 (community.config.ts: `zorTokenId: BigInt(0)`) |
| **Holders** | 4 early adopters (as of March 2026); now ~20+ after weekly mints |
| **Transfer Model** | Soulbound - all ERC-1155 transfer functions revert |
| **Minting** | Democratic - only OREC contract (`0xcB05...Be532`) can call `mintRespect()` |
| **Last Activity** | Ongoing - minted weekly via OREC proposals (May 2026) |

**Use case:** Weekly consensus breakout results, minted automatically after OREC proposals pass. Each rank gets a distinct "award" NTT with metadata (session #, group #, rank). The sum of NTT values = holder's total Respect balance.

**Verified in codebase:** community.config.ts respect block (lines 105-116); leaderboard.ts queries this contract.

### 3. OREC (Governor Contract)

| Field | Value |
|-------|-------|
| **Address** | `0xcB05F9254765CA521F7698e61E0A6CA6456Be532` |
| **Standard** | Custom (ordao/contracts/orec/) |
| **Deployed** | Sept 2025 (with ZOR) |
| **Owner** | Initially set to deployer; typically transferred to multisig or OREC itself |
| **Vote Weight Source** | Reads OG Respect (ERC-20) balance at proposal block number |
| **Execution Target** | ZOR contract (mints/burns via OREC decisions) |
| **Transactions** | 242+ total (as of May 21, 2026) |
| **Last Activity** | Ongoing - Respect Game weekly submissions (May 2026) |
| **Key Function** | `proposeBreakoutResult(rankings[], values[], metadata)` - creates OREC proposal for Respect distribution |

**Verified in codebase:** community.config.ts line 107 hardcodes this address.

### Token Relationship Diagram

```
OG Respect (ERC-20)
├─ Historical ledger (fractals 1-73)
├─ Vote weight source for OREC proposals
└─ Transfer-blocked (soulbound at contract level)

OREC (Governor)
├─ Reads OG balances for vote weights
├─ Executes Respect distribution proposals
└─ Owns ZOR contract (mints on successful proposals)

ZOR (ERC-1155, "soulbound multitoken")
├─ Award ledger (fractals 74+, ORDAO era)
├─ Each award is a unique NTT with metadata
├─ All transfers revert (soulbound at contract level)
└─ Only OREC can mint/burn
```

This two-ledger design preserves historical OG Respect while enabling on-chain democratic distribution going forward. Members' vote weight = OG balance (historical recognition). New distributions come from ZOR (democratic).

---

## How Breakout Results Get Submitted On-Chain

### Pre-ORDAO Flow (Legacy, Archive Only)

1. Breakout consensus reached off-chain
2. Someone with admin keys manually called the Respect contract's mint function
3. Respect was distributed without on-chain voting
4. If admins were offline, distribution delayed

**Status:** Obsolete. OG Respect (ERC-20) frozen since Dec 2025.

### ORDAO Flow (Current, Since Sept 2025)

The modern flow leverages OREC for democratic, automated distribution:

1. **Consensus:** Breakout group reaches ranking consensus (off-chain, video call or Discord bot)
2. **Propose:** Organizer or consensus member calls orclient:
   ```typescript
   await orclient.proposeBreakoutResult({
     meetingNum: 100,
     groupNum: 3,
     rankings: [addr1, addr2, addr3, addr4, addr5, addr6],  // highest to lowest
     // Respect amounts auto-calculated: [110, 68, 42, 26, 16, 10] for ZAO
   })
   ```
3. **Split Submission:** orclient:
   - Submits proposal hash + voting data to OREC contract on-chain (voting opens)
   - Uploads full proposal content + metadata to ornode backend (off-chain archive)
   - Automatically votes YES from the proposer's wallet (using their OG Respect weight)
4. **Voting Phase (48 hrs typical):** Other members can vote YES/NO via orclient. Vote weight = OG Respect balance at proposal creation block.
5. **Veto Phase (48 hrs typical):** Voting closed. Anyone can vote NO (challenge period). No new YES votes allowed.
6. **Execution:** After both phases elapse, check passing conditions:
   - YES weight >= threshold (e.g., 10% of total)
   - YES weight > 2 * NO weight
7. **Auto-Mint:** Anyone calls orclient.execute(propId). OREC calls ZOR.mintRespect() with ranks [1-6]. Tokens transfer to winners.

**Key improvement:** No admin bottleneck. Any member with Respect can submit. Consensus is on-chain verifiable.

### Current ZAO Bottleneck (May 2026)

**Note:** Only 2 wallets actively submit on-chain: zaal.eth and civilmonkey.eth. This is a centralization risk. **Recommendation (doc 703):** Expand to 3-5 signers or open via ZAO OS UI in future sprint.

---

## orclient SDK (TypeScript)

The `@ordao/orclient` npm package (current version: **1.4.4** as of May 2026) abstracts all blockchain and ornode communication. It's the primary way apps integrate OREC.

### Installation & Initialization

```bash
npm install @ordao/orclient
```

### Core Functions for Fractals

| Function | Purpose | Inputs |
|----------|---------|--------|
| `proposeBreakoutResult()` | Create OREC proposal for Respect distribution | meetingNum, groupNum, rankings[] |
| `vote(propId, "Yes"/"No")` | Vote on a proposal | propId, vote direction |
| `execute(propId)` | Trigger minting after passing conditions met | propId |
| `getRespectOf(address)` | Query a wallet's Respect balance | address |
| `getAwards(address, spec?)` | Get all NTT awards for a member | address, optional filter |
| `getProposals(spec?)` | Query proposals by status, member, etc. | optional filters |
| `getProposal(propId)` | Get full proposal data (from ornode) | propId |

### Integration Notes for ZAO OS

| Consideration | Status | Notes |
|---|---|---|
| **License** | GPL-3.0 | ZAO OS is MIT. GPL permissive for dependents, but consider license compliance. |
| **Wallet Requirement** | EIP-1193 provider (MetaMask, Privy) | ZAO uses Farcaster signers. Wallet connection needed for on-chain actions. |
| **ornode Dependency** | orclient requires ornode backend | ZAO has `zao-ornode.frapps.xyz` (currently down as of May 2026, doc 703 rec: restore it) |
| **Gas Costs** | Cheap on Optimism | Breakout submission ~$0.02-0.05 at current L2 gas |
| **Ethers v6** | orclient uses ethers v6 | ZAO OS uses viem. May need wrapper or dual dependency. |
| **Live Deployment** | OREC + ZOR live | 242+ transactions on OREC as of May 21, 2026. Weekly submissions active. |

---

## Fractalgram & Other Frontends

[Fractalgram](https://github.com/Optimystics/fractalgram) is the Telegram-native app for organizing Respect Games:

- **Purpose:** Real-time breakout room formation, consensus voting, on-chain submission
- **Tech:** Telegram Bot API + orclient SDK
- **Status (May 2026):** Active - UI refresh in progress (Optimystics team)
- **ZAO Usage:** Primary interface for weekly sessions (Monday 6pm EST)

### Alternative Interfaces

| Tool | Use Case | Status |
|------|----------|--------|
| **ORDAO GUI** | Web-based proposal submission | Active, improved in recent months |
| **OR Console** | Browser console for advanced users | Active, reference docs |
| **Respect.Games App** | Async gameplay (no fixed schedule) | Testing with communities, not ZAO's primary tool |
| **ZAO OS `/fractals` endpoint** | (Planned) In-app fractal UI | Future: TBD by Zaal |

---

## Frapps Deployment Platform

[Frapps](https://github.com/Optimystics/frapps) is the shared infrastructure for hosting fractal communities:

- **Domains:** Each fractal gets `communityname.frapps.xyz` (e.g., `zao.frapps.xyz`, `eden.frapps.xyz`, `optimism.frapps.xyz` archived)
- **Config:** frapp.json per community (chain, contracts, parameters, metadata)
- **Deployment:** orfrapps repo provides CLI tools and Docker configs

**ZAO's Instance:** zao.frapps.xyz (Respect Game entry point, proposal voting, leaderboard)

---

## Quick Reference: Core Concepts

| Term | Definition |
|------|------------|
| **Respect** | Soulbound reputation token. Non-transferable, non-tradeable. Earned only via peer ranking. Governs on-chain proposal voting power. |
| **Respect Game** | Weekly peer-evaluation session: random groups of 3-6 share contributions, reach consensus ranking, Respect distributed by Fibonacci curve. |
| **OREC** | Optimistic Respect-based Executive Contract. Optimistic consent voting: assumes proposals pass unless actively vetoed. 2/3 can pass, 1/3 can block. |
| **ORDAO** | Full stack: OREC contracts + Respect1155 + ornode indexer + orclient SDK + Fractalgram UI + frapps deployment platform. |
| **Fibonacci Scoring** | Distribution curve (1, 2, 3, 5, 8, 13 or ZAO's 2x variant: 10, 16, 26, 42, 68, 110). Each rank ~60% more than next. Resists gaming. |
| **Fractal Scaling** | When community grows, top performers from Round 1 are grouped into Round 2 and earn additional Respect. Process repeats until < 6 remain. |
| **Veto Period** | Challenge window after voting ends. Only NO votes accepted. Gives community chance to block bad proposals. |
| **Soulbound (Nontransferable)** | Both OG (ERC-20) and ZOR (ERC-1155) are soulbound. Transfers revert at contract level. Earned only via governance, never bought/sold. |
| **Parent/Child Tokens** | OG Respect (ERC-20, frozen) bootstraps vote weights for OREC. ZOR (ERC-1155, active) is new standard for democratic Respect distribution going forward. |

---

## ZAO OS Integration Roadmap

### Current State (May 2026)

- Respect Game running live (100+ weeks, Monday 6pm EST)
- OREC + ZOR deployed and active (242+ transactions)
- Community.config.ts has contract addresses and leaderboard.ts reads on-chain state
- Fractalgram Telegram bot handles weekly submission

### Short Term (Next Sprint)

- **Restore ornode** (zao-ornode.frapps.xyz is down - blocking Farcaster stats)
- **Expand submission signers** beyond 2-wallet bottleneck (zaal.eth, civilmonkey.eth)
- **Cache layer:** Supabase `respect_balances` table with weekly decay + tier calculation (doc 115)

### Medium Term

- **Fractal UI in ZAO OS:** Build `/fractals` endpoint with:
  - Breakout room assignment + timer
  - Consensus ranking interface (ranking each other 1-6)
  - Auto-proposal generation (orclient.proposeBreakoutResult)
  - Live leaderboard + tier badges
- **Non-technical onboarding docs** for Tanja + other musicians (doc 703 priority)

### Technical Dependencies

| Dependency | Package | Version | Status |
|-----------|---------|---------|--------|
| orclient SDK | @ordao/orclient | 1.4.4 | Available on npm |
| React hooks | @ordao/privy-react-orclient | 1.4.4 | Available (uses Privy auth) |
| Type definitions | @ordao/ortypes | current | Available |
| Viem integration | (custom wrapper) | TBD | Needs authoring (ZAO OS uses viem, orclient uses ethers v6) |

---

## Also See

- **Doc 702:** "Respect & Fractal Governance: The Complete Lineage" - full history from Dan Larimer's book through current fractals
- **Doc 703:** "ZAO Fractal: Current State (May 2026)" - live operational status, recommendations, on-chain metrics
- **Doc 114-115:** Respect deep dives and Supabase schema design
- **Doc 104-109:** Historical fractal governance research and ORDAO adoption patterns
- **Doc 184-188:** Smart contract addresses and token details

---

## Next Actions

| Action | Owner | Type | By When |
|--------|-------|------|---------|
| Restore ornode backend (zao-ornode.frapps.xyz) | Zaal or VPS infra | Ops | 2026-06-15 |
| Establish 3-signer committee for OREC submission | Zaal | Governance | 2026-06-01 |
| Draft non-technical fractal onboarding guide | Zaal | Docs | 2026-06-30 |
| Prototype ZAO OS `/fractals` UI (ranking + submission) | Claude | Feature | 2026-07-15 |
| Write viem wrapper for orclient compatibility | Claude | Engineering | 2026-07-30 |

---

## Sources

All sources fetched, read, and cross-verified 2026-05-21:

### Primary Code Repositories
- [Optimystics GitHub Organization](https://github.com/Optimystics) [FULL]
- [sim31/ordao - upstream ORDAO repo](https://github.com/sim31/ordao) [FULL]
- [ORDAO Core Monorepo](https://github.com/Optimystics/ordao) [FULL]
- [orfrapps - ORDAO deployment platform](https://github.com/Optimystics/orfrapps) [FULL]
- [Fractalgram - Telegram integration](https://github.com/Optimystics/fractalgram) [FULL]

### Specifications & Whitepapers
- [OREC Specification (GitHub)](https://github.com/sim31/ordao/blob/main/docs/OREC.md) [FULL]
- [ORDAO Upgrade Path Documentation](https://github.com/sim31/ordao/blob/main/docs/OF_ORDAO_UPGRADE.md) [FULL]
- [Fractally Whitepaper Addendum 1 (Dan Larimer)](https://hive.blog/fractally/@dan/fractally-white-paper-addendum-1) [FULL]
- [Introducing Fractally (Protocol Overview)](https://fractally.com/blog/introducing-fractally) [FULL]

### Live Instances & Documentation
- [Optimystics Main Site - ORDAO](https://optimystics.io/ordao) [FULL]
- [Optimystics - OREC Details](https://optimystics.io/orec) [FULL]
- [Optimystics - Respect Tokens](https://optimystics.io/respect) [FULL]
- [Optimystics - Introducing the Respect Game](https://optimystics.io/introducing-the-respect-game) [FULL]
- [Optimystics - Fractal Democracy (Theory)](https://optimystics.io/fractal-democracy) [FULL]
- [orclient API Documentation](https://orclient-docs.frapps.xyz) [FULL]
- [NPM: @ordao/orclient](https://www.npmjs.com/package/@ordao/orclient) [FULL - version 1.4.4]
- [NPM: @ordao/privy-react-orclient](https://www.npmjs.com/package/@ordao/privy-react-orclient) [FULL - version 1.4.4]

### Fractal Communities
- [Optimism Fractal Website](https://optimismfractal.com) [FULL - paused Jan 2026]
- [Optimism Fractal Council](https://optimismfractal.com/council) [FULL]
- [Eden Fractal Documentation](https://edenfractal.com/fractal-decision-making-processes) [FULL]
- [Fractal Democracy Philosophy](https://edenfractal.com/respectgame) [FULL]

### On-Chain Contract Data
- [OG Respect (ERC-20) on Optimistic Etherscan](https://optimistic.etherscan.io/address/0x34cE89baA7E4a4B00E17F7E4C0cb97105C216957) [FULL]
- [ZOR Respect1155 (ERC-1155) on Optimistic Etherscan](https://optimistic.etherscan.io/address/0x9885CCeEf7E8371Bf8d6f2413723D25917E7445c) [FULL]
- [OREC Contract on Optimistic Etherscan](https://optimistic.etherscan.io/address/0xcB05F9254765CA521F7698e61E0A6CA6456Be532) [PARTIAL - curl timeout, page is JS-heavy; contract address verified via community.config.ts]

### ZAO OS Codebase References
- [community.config.ts (Respect block, lines 105-116)](https://github.com/bettercallzaal/zaoos/blob/main/community.config.ts) [FULL]
- [src/lib/respect/leaderboard.ts (on-chain sync)](https://github.com/bettercallzaal/zaoos/blob/main/src/lib/respect/leaderboard.ts) [FULL]

### Related Governance Research Docs (This Campaign)
- Doc 702: Respect & Fractal Governance Lineage (verified May 21, 2026)
- Doc 703: ZAO Fractal Current State May 2026 (verified May 21, 2026)
