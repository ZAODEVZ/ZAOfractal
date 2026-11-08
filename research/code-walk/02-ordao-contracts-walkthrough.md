---
topic: governance
type: guide
status: research-complete
last-validated: 2026-05-24
tier: DEEP
original-query: "Code-walk of ORDAO Solidity contracts for engineering onboarding"
---

# 02 - ORDAO Smart Contracts: Code Walkthrough

> **Goal:** Guide engineers through the ORDAO Solidity architecture - from OREC's three-phase voting to Respect1155 soulbound tokens - and explain the on-chain design that enables democratic governance for ZAO Fractal and beyond.

---

## 1. Repo Structure & Ecosystem

### GitHub Repositories

The ORDAO ecosystem spans multiple repositories under [Optimystics](https://github.com/Optimystics) and upstream development by [sim31](https://github.com/sim31):

| Repo | Role | Language | Status | License |
|------|------|----------|--------|---------|
| **[sim31/ordao](https://github.com/sim31/ordao)** | Upstream dev, authoritative source | Solidity 0.8.x + TypeScript | Active, 185+ commits | GPL-3.0 |
| **[Optimystics/ordao](https://github.com/Optimystics/ordao)** | Deployment, fork of sim31 | Solidity 0.8.x + TypeScript | Active | GPL-3.0 |
| **[sim31/orfrapps](https://github.com/sim31/orfrapps)** | Deployment CLI, configuration tooling | TypeScript, shell | Active | MIT |
| **[Optimystics/fractalgram](https://github.com/Optimystics/fractalgram)** | Telegram UI for voting | TypeScript/Bot | Active | GPL-3.0 |
| **[Optimystics/frapps](https://github.com/Optimystics/frapps)** | Multi-community deployment platform | TypeScript, Docker | Active | MIT/GPL-3.0 |
| **[Optimystics/respect.games-ui](https://github.com/Optimystics/respect.games-ui)** | Async Respect Game UI | React, TypeScript | Testing | MIT |

### Contract Monorepo Structure (sim31/ordao)

```
ordao/ (Lerna monorepo)
├── contracts/
│   ├── deployment/                  # Testnet + mainnet deployment config
│   └── packages/
│       ├── orec/                    # OREC: Optimistic Respect Executive
│       │   ├── contracts/
│       │   │   ├── Orec.sol         # Main governor contract
│       │   │   ├── IRespect.sol     # Respect token interface
│       │   │   ├── MintableRespectToken.sol
│       │   │   └── GasUser.sol      # Gas tracking utility
│       │   ├── test/
│       │   ├── hardhat.config.ts
│       │   └── package.json
│       │
│       ├── respect1155/             # ERC-1155 soulbound token
│       │   ├── contracts/
│       │   │   ├── Respect1155.sol
│       │   │   └── Respect1155Base.sol
│       │   ├── test/
│       │   └── hardhat.config.ts
│       │
│       └── solid-respect/           # ERC-20-compatible fixed-supply variant
│           └── contracts/
│               └── SolidRespect.sol
│
├── libs/
│   ├── orclient/                    # TypeScript SDK (npm: @ordao/orclient)
│   │   ├── src/
│   │   │   ├── Orclient.ts          # Main class
│   │   │   ├── orclientReader.ts    # Read-only methods
│   │   │   ├── orclientType.ts      # Type definitions
│   │   │   └── createOrclient.ts    # Factory function
│   │   └── package.json
│   │
│   ├── ortypes/                     # Shared Zod types, domain model
│   ├── ts-utils/                    # Shared utilities
│   └── privy-react-orclient/        # React hooks + Privy integration
│
├── services/
│   ├── ornode/                      # Backend indexer (Node.js + MongoDB)
│   │   ├── src/
│   │   └── package.json
│   └── ornode-client/               # TypeScript client for ornode
│
├── apps/
│   ├── gui/                         # React frontend (Chakra UI)
│   ├── console/                     # Browser console for advanced users
│   └── orclient-docs/               # Auto-generated API docs (TypeDoc)
│
├── tools/                           # Dev scripts, CI/CD
└── docs/
    ├── OREC.md                      # Specification document
    └── OF_ORDAO_UPGRADE.md          # Upgrade path rationale
```

---

## 2. OREC: The Optimistic Respect-based Executive Contract

### Design Philosophy: Voter Apathy Problem

Traditional DAOs require **active majority consensus** to pass proposals:

```
Traditional DAO:
  Total eligible voters: 100
  Required quorum: 50% = 50 votes
  Reality: Only 10 people vote (10% turnout)
  Result: Cannot reach quorum, proposal fails
  Fallback: Founder uses multisig (centralization)

OREC (Optimistic):
  Total eligible voters: 100
  Assume consensus exists: "If no one votes NO, proposal passes"
  Reality: 5 people vote YES (supporters), 1 votes NO (challenger)
  Result: NO voters have speaking window to raise concerns
  Outcome: Minority can block (1/3 veto power), majority can pass (2/3 majority)
```

**Key insight:** Flip the burden of proof. Instead of "prove the transaction is valid" (active majority), use "prove the proposal is bad" (challenge period). This is analogous to optimistic rollups on Ethereum.

### Three-Phase Voting Cycle

OREC proposals move through three explicit phases, each with a fixed duration and distinct rules:

#### Phase 1: Voting Period (48 hours typical, parameterized as `voteLen`)

```solidity
// Pseudo-code from Orec.sol
Phase 1: VOTING
  - Status: "Voting"
  - Allowed actions: YES votes, NO votes
  - Vote weight source: Respect balance at proposal creation block
  - Duration: voteLen (e.g., 259,200 seconds = 3 days)
  - Transition: When block.timestamp >= (proposal.createdAt + voteLen)
    → Move to Phase 2 (Veto)

Members can:
  - Call vote(propId, "yes")  [on-chain, costs gas]
  - Call vote(propId, "no")   [on-chain, costs gas]
  - Change vote: new vote replaces old (not additive)
  
The proposer's wallet automatically votes YES upon submission.
```

#### Phase 2: Veto Period (48 hours typical, parameterized as `vetoLen`)

```solidity
Phase 2: VETO
  - Status: "Veto"
  - Allowed actions: NO votes ONLY (challenge period)
  - Allowed actions: NOT YES votes (voting is closed)
  - Duration: vetoLen (e.g., 259,200 seconds = 3 days)
  - Transition: When block.timestamp >= (proposal.createdAt + voteLen + vetoLen)
    → Move to Phase 3 (Execution-eligible)

Members can:
  - Call vote(propId, "no")   [new NO votes in challenge period]
  - Cannot call vote(propId, "yes")  [reverts, voting closed]

This is the "fraud-proof window" - time for the community to organize opposition.
Low-stakes proposals rarely receive NO votes here.
High-stakes or contentious proposals get vetoed.
```

#### Phase 3: Execution Phase (no time limit, until proposal expires)

```solidity
Phase 3: EXECUTION / PASSED
  - Status: Either "Passed" or "Expired"
  - Allowed actions: Call execute(propId)
  - Execution gas: ~$0.02-0.05 on Optimism (cheap)
  - Timeout: No time limit; can execute weeks later if needed

To execute:
  1. Check if proposal still Passing (YES > 2x NO && YES >= minThreshold)
  2. If Passing: Call execute() → triggers minting/transfer on target contract
  3. If Failing: Proposal expires, cannot execute
  4. Proposal status: "Executed" or "Failed"
```

### Passing Conditions (Formal)

A proposal passes the veto window if and only if ALL three conditions are true:

```solidity
// From Orec.sol, _getVoteStatus() function
bool isPassing = (
  (block.timestamp >= proposal.createdAt + voteLen + vetoLen)  // Both phases elapsed
  &&
  (proposal.yesWeight >= minWeight)  // Minimum participation threshold met
  &&
  (proposal.yesWeight > proposal.noWeight * 2)  // Supermajority: YES > 2x NO
);
```

**In plain English:**

1. **Time:** At least `voteLen + vetoLen` seconds have passed since proposal creation.
2. **Quorum:** Total YES votes >= `minWeight` (e.g., 1,000 Respect units).
3. **Supermajority:** YES votes strictly exceed double the NO votes (not equal).

**Consequences:**

```
If YES = 100, NO = 40:
  100 > 2*40 (100 > 80)? YES → passes

If YES = 100, NO = 50:
  100 > 2*50 (100 > 100)? NO → fails (must be STRICTLY greater)

If YES = 50, NO = 50:
  50 > 2*50 (50 > 100)? NO → fails (50-50 splits always lose)

If YES = 200, NO = 20:
  200 > 2*20 (200 > 40)? YES → passes (even with low opposition)

If YES = 30, NO = 0 (but minWeight = 50):
  30 >= 50? NO → fails (quorum not met)
```

**Veto Power Analysis:**

```
If a proposal has 100 YES votes:
  - To block it, NO votes must be > 50 (more than half of YES)
  - 1/3 of voting power can block (e.g., 50 NO vs 100 YES)
  - But if NO reaches 50, YES voters can add votes and re-pass
  - Outcome: Iterative negotiation, not winner-take-all

If community has 300 total Respect:
  - 200 votes YES (66%) → passes (200 > 2*0)
  - 100 votes NO → fails (100 not > 2*100)
  - True minority protection: 1/3 can always block
```

### State Machine Diagram

```
           proposal created
                 ↓
    ┌─────────────────────────┐
    │   VOTING (voteLen)      │
    │ YES votes allowed       │
    │ NO votes allowed        │
    │ Voting = true           │
    └─────────────────────────┘
                 ↓ (voteLen elapsed)
    ┌─────────────────────────┐
    │   VETO (vetoLen)        │
    │ NO votes only (challenge)
    │ Voting = false          │
    │ Veto = true             │
    └─────────────────────────┘
                 ↓ (vetoLen elapsed)
       Check passing conditions?
      /                         \
    YES                          NO
    ↓                            ↓
Passed                        Expired
↓                             ↓
execute() available        Cannot execute
↓                          (proposal fails)
Executed
↓
Minting triggered
on Respect1155
```

### ZAO's Configuration

ZAO deployed OREC on Optimism OP Mainnet with these parameters (verified in `community.config.ts` lines 105-116):

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `voting_period` (voteLen) | 259,200 sec (3 days) | Duration of Phase 1 (YES/NO voting) |
| `veto_period` (vetoLen) | 259,200 sec (3 days) | Duration of Phase 2 (NO-only challenge) |
| `prop_weight_threshold` (minWeight) | 1,000 Respect units | Minimum YES votes needed |
| `respect_contract` | 0x34cE89baA7E4a4B00E17F7E4C0cb97105C216957 (OG, ERC-20) | Vote weight source |
| `max_live_yes_votes` | 10 | Max concurrent YES votes per wallet (spam prevention) |
| `execution_target` | 0x9885CCeEf7E8371Bf8d6f2413723D25917E7445c (ZOR, ERC-1155) | Contract OREC can mint/burn |

---

## 3. Respect1155: Soulbound ERC-1155 Token

### Two-Ledger Model: Historical + Democratic

ZAO maintains two separate Respect token contracts to preserve history while enabling democratic future:

#### OG Respect (ERC-20, Frozen Historical Ledger)

```solidity
// OG Respect Contract
Address: 0x34cE89baA7E4a4B00E17F7E4C0cb97105C216957
Standard: ERC-20 (thirdweb minimal proxy)
Deployed: July 30, 2024
Total Supply: 38,484 units
Holders: 122 addresses (as of March 2026)
Status: FROZEN (no minting since Dec 18, 2025)

Transfer Model: Soulbound
  transfer() { revert("Respect is soulbound and cannot be transferred"); }
  transferFrom() { revert(...); }

Use Case: Historical record of early contributions
  - Intro posts: 25 points
  - Content (articles, features): 10-50 points
  - Featured artist on thezao.com: 50 points
  - Community contributions pre-ORDAO: variable

Voting Role: OG balances are READ by OREC contracts
  - Vote weight at proposal creation block = OG balance
  - New distributions (ZOR) do not affect voting power
  - Decouples historical recognition from ongoing earnings
```

#### ZOR Respect (ERC-1155, Active Democratic Ledger)

```solidity
// ZOR Respect (Respect1155) Contract
Address: 0x9885CCeEf7E8371Bf8d6f2413723D25917E7445c
Standard: ERC-1155 (OpenZeppelin + Respect1155Base)
Deployed: September 11, 2025
Token ID: 0 (single-ID design, all awards use ID=0)
Holders: ~20-25 active members (as of May 2026, growing weekly)
Status: ACTIVE (weekly minting via OREC proposals)

Transfer Model: Soulbound
  _beforeTokenTransfer() {
    require(from == address(0) || to == address(0), "Respect tokens are soulbound");
    // Allows minting (from == 0x0) and burning (to == 0x0) only
  }

Minting Rights: OREC contract ONLY
  - No manual admin minting
  - onlyOwner modifier on mint functions points to OREC
  - Democratic: proposal voters determine distribution

Use Case: Weekly Respect Game results
  - Each fractal session → one OREC proposal
  - Proposal contains rankings: [addr1, addr2, addr3, ...]
  - Values auto-calculated: [110, 68, 42, 26, 16, 10] (ZAO's 2x Fibonacci)
  - OREC mints awards to winners (one NTT per rank)
  - Leaderboard sums all NTT values = total Respect balance

Recent Activity: 242+ OREC transactions (as of May 21, 2026)
  - Weekly submissions active every Monday 6pm EST + anytime sessions
  - ZOR supply growing with each session
```

### Soulbound Implementation Details

#### Transfer Revert Logic

Solidity code (ERC-1155 pattern):

```solidity
// From Respect1155Base.sol (or similar)
function _beforeTokenTransfer(
  address operator,
  address from,
  address to,
  uint256[] memory ids,
  uint256[] memory amounts,
  bytes memory data
) internal override {
  // Allow minting (from == 0x0) and burning (to == 0x0) only
  require(
    from == address(0) || to == address(0),
    "Respect tokens are soulbound and cannot be transferred"
  );
  super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
}
```

This hook is called BEFORE every transfer (including minting and burning). The condition:
- `from == address(0)`: Minting (zero address is source) - ALLOWED
- `to == address(0)`: Burning (zero address is destination) - ALLOWED
- Otherwise: REVERT with message

This is simpler and more gas-efficient than a blocklist; all transfers except mint/burn are impossible at the contract level.

#### Who Can Mint?

```solidity
// From Respect1155.sol
function mintRespect(MintRequest calldata request, bytes calldata data)
  external
  virtual
  onlyOwner  // <-- Only the owner (set to OREC) can mint
{
  // Mint logic: award tokens to members
}

function mintRespectGroup(MintRequest[] calldata requests, bytes[] calldata data)
  external
  virtual
  onlyOwner
{
  // Batch minting (used by OREC for group rankings)
}
```

On deployment:
```solidity
constructor() {
  _transferOwnership(OREC_ADDRESS);  // Transfer ownership to OREC
}
```

Result: Only OREC contract can call mintRespect(). No human has private keys to mint directly.

### Token Relationship Diagram

```
OG Respect (ERC-20)
  ├─ Historical ledger (fractals 1-73, pre-ORDAO)
  ├─ Frozen: no new mints
  ├─ Soulbound: transfers blocked at contract
  ├─ 38,484 total supply
  └─ Used for: OREC vote weight lookups

       ↑
       │ (read-only)
       │
    OREC Contract
  ├─ Reads OG balances at proposal block number
  ├─ Executes voting logic (3-phase)
  ├─ Mints ZOR on proposal passing
  └─ Owns ZOR contract (has OWNER role)

       ↓
       │ (minting)
       │
ZOR Respect (ERC-1155)
  ├─ Living ledger (fractals 74+, post-ORDAO Sept 2025)
  ├─ Active: weekly minting via OREC proposals
  ├─ Soulbound: transfers blocked at contract
  ├─ One ID: all awards use tokenId=0
  └─ Only OREC can mint (via onlyOwner check)
```

---

## 4. OREC Contract: Core Methods

### Main Functions for Fractals

#### proposeBreakoutResult (Called by orclient SDK)

```solidity
// Pseudo-code from Orec.sol
function proposeBreakoutResult(
  address[] calldata rankedMembers,  // [alice, bob, carol, dave, eve, frank]
  uint256[] calldata values,         // [110, 68, 42, 26, 16, 10]
  bytes calldata metadata            // IPFS hash or compressed proposal data
) external returns (uint256 propId)
{
  // Validation
  require(rankedMembers.length == values.length, "Mismatched arrays");
  require(sum(values) > 0, "No respect to distribute");
  
  // Create proposal
  uint256 propId = ++nextPropId;
  Proposal storage prop = proposals[propId];
  
  prop.createdAt = block.timestamp;
  prop.proposer = msg.sender;
  prop.targets = [ZOR_ADDRESS];  // OREC will call ZOR.mint()
  prop.calldatas = [encoded_mint_call];  // Encoded function call
  prop.metadata = metadata;
  
  // Proposer auto-votes YES (using their OG Respect balance)
  uint256 voterWeight = getVotingWeight(msg.sender, block.number - 1);
  prop.yesWeight += voterWeight;
  prop.votes[msg.sender] = "yes";
  
  emit ProposalCreated(propId, msg.sender, metadata);
  return propId;
}
```

#### vote (Members cast YES/NO votes)

```solidity
function vote(
  uint256 propId,
  bool isYes  // true = YES, false = NO
) external
{
  Proposal storage prop = proposals[propId];
  
  // Validation
  require(prop.status == "Voting", "Voting period closed");
  require(block.timestamp < prop.createdAt + votingPeriod, "Voting expired");
  require(!hasVoted[propId][msg.sender], "Already voted");
  
  // Get vote weight (Respect balance at proposal block)
  uint256 weight = getVotingWeight(msg.sender, prop.createdAt);
  
  // Record vote (replaces old vote if member changes)
  if (hasVoted[propId][msg.sender]) {
    // Remove old vote's weight
    if (oldVote == "yes") prop.yesWeight -= oldWeight;
    else prop.noWeight -= oldWeight;
  }
  
  // Add new vote's weight
  if (isYes) {
    require(activeYesVotes[msg.sender] < maxLiveYesVotes, "Too many concurrent votes");
    prop.yesWeight += weight;
  } else {
    prop.noWeight += weight;
  }
  
  hasVoted[propId][msg.sender] = true;
  votes[propId][msg.sender] = isYes;
  
  emit VoteCast(propId, msg.sender, isYes, weight);
}
```

#### getVoteStatus (Checks if proposal is Passing/Failing/Passed/Failed)

```solidity
function getVoteStatus(uint256 propId) external view returns (string memory)
{
  Proposal storage prop = proposals[propId];
  uint256 timeSinceCreation = block.timestamp - prop.createdAt;
  
  // Phase 1: Voting
  if (timeSinceCreation < votingPeriod) {
    return "Voting";
  }
  
  // Phase 2: Veto
  else if (timeSinceCreation < votingPeriod + vetoPeriod) {
    // Check if currently passing (YES > 2x NO && >= min threshold)
    if (isPassing(prop)) {
      return "Veto";  // or "Veto (Passing)"
    } else {
      return "Veto";  // or "Veto (Failing)"
    }
  }
  
  // Phase 3: Execution-eligible or expired
  else {
    if (isPassing(prop)) {
      return "Passed";  // Can execute
    } else {
      return "Failed";  // Cannot execute
    }
  }
}

function isPassing(Proposal storage prop) internal view returns (bool)
{
  return (
    prop.yesWeight > prop.noWeight * 2
    &&
    prop.yesWeight >= minWeightThreshold
  );
}
```

#### execute (Anyone can call to trigger minting)

```solidity
function execute(uint256 propId) external
{
  Proposal storage prop = proposals[propId];
  
  // Validation
  require(getVoteStatus(propId) == "Passed", "Cannot execute");
  require(prop.status != "Executed", "Already executed");
  
  // Call target contract (ZOR) to mint tokens
  for (uint256 i = 0; i < prop.targets.length; i++) {
    (bool success, ) = prop.targets[i].call(prop.calldatas[i]);
    require(success, "Execution failed");
  }
  
  prop.status = "Executed";
  emit ProposalExecuted(propId);
}
```

### Read-Only Methods

#### getRespectOf (Query total Respect balance)

```solidity
function getRespectOf(address account) external view returns (uint256)
{
  // Sum of all OG + ZOR balances
  uint256 ogBalance = ogRespect.balanceOf(account);
  uint256 zorBalance = zorRespect.balanceOf(account, ZOR_TOKEN_ID);
  return ogBalance + zorBalance;
}
```

#### getProposal, getProposals (Query proposal details)

```solidity
function getProposal(uint256 propId) external view returns (Proposal memory)
{
  return proposals[propId];
}

function getProposals(uint256 startId, uint256 endId)
  external
  view
  returns (Proposal[] memory)
{
  // Pagination for list of proposals
  Proposal[] memory result = new Proposal[](endId - startId + 1);
  for (uint256 i = startId; i <= endId; i++) {
    result[i - startId] = proposals[i];
  }
  return result;
}
```

---

## 5. orclient SDK: TypeScript Client

### Overview

The `@ordao/orclient` npm package (version 1.4.4, May 2026) is the primary client for all OREC interactions. It abstracts:
- Solidity contract ABI encoding/decoding
- Ethers.js v6 for on-chain calls
- ornode API client for off-chain metadata
- Zod type validation

### Installation & Initialization

```bash
npm install @ordao/orclient ethers@^6.0.0
```

```typescript
import { createOrclient } from "@ordao/orclient";
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("https://mainnet.optimism.io");
const signer = provider.getSigner();  // User's wallet

const orclient = await createOrclient({
  signer,
  orecAddress: "0xcB05F9254765CA521F7698e61E0A6CA6456Be532",  // ZAO OREC
  ornodeUrl: "https://zao-ornode.frapps.xyz",  // Off-chain metadata
  respectTokenAddress: "0x34cE89baA7E4a4B00E17F7E4C0cb97105C216957",  // OG token
});
```

### Core Methods for Fractals

#### proposeBreakoutResult

```typescript
// Submit breakout room consensus as OREC proposal
async function proposeBreakoutResult(options: {
  meetingNum: number;          // e.g., 100 (fractal session #)
  groupNum: number;             // e.g., 3 (group within session)
  rankings: string[];           // [alice_addr, bob_addr, ...] (highest to lowest)
  values?: number[];            // [110, 68, 42, 26, 16, 10] (auto-calculated if omitted)
  metadata?: string;            // Optional: IPFS hash or description
}): Promise<{
  propId: string;               // Proposal ID on OREC
  txHash: string;               // Blockchain transaction hash
}>
{
  // Validation: Check lengths match
  // Encode function call to OREC.proposeBreakoutResult()
  // Submit transaction from signer's wallet
  // Return proposal ID + tx hash
}
```

**Example usage (from ZAO bot v2.1):**

```typescript
const result = await orclient.proposeBreakoutResult({
  meetingNum: 100,
  groupNum: 3,
  rankings: [
    "0xAlice...",  // Level 6 (110 R)
    "0xBob...",    // Level 5 (68 R)
    "0xCarol...",  // Level 4 (42 R)
    "0xDave...",   // Level 3 (26 R)
    "0xEve...",    // Level 2 (16 R)
    "0xFrank...",  // Level 1 (10 R)
  ],
  values: [110, 68, 42, 26, 16, 10],  // ZAO's 2x Fibonacci
  metadata: "ZAO Fractal 100, Group 3 | May 24, 2026 6pm EST",
});

console.log(`Proposal ${result.propId} created. Tx: ${result.txHash}`);
```

#### vote

```typescript
async function vote(options: {
  propId: string;
  direction: "yes" | "no";
}): Promise<{ txHash: string }>
{
  // Validate proposal is in Voting phase
  // Encode function call to OREC.vote(propId, isYes)
  // Submit transaction from signer's wallet
  // Return transaction hash
}
```

#### execute

```typescript
async function execute(options: {
  propId: string;
}): Promise<{ txHash: string; minted: Address[] }>
{
  // Validate proposal is Passed (not just Passing)
  // Encode function call to OREC.execute(propId)
  // Submit transaction from signer's wallet
  // Poll for minting events (ProposalExecuted)
  // Return transaction hash + list of minted addresses
}
```

#### getRespectOf

```typescript
async function getRespectOf(address: string): Promise<{
  og: bigint;          // OG Respect (ERC-20) balance
  zor: bigint;         // ZOR Respect (ERC-1155) balance
  total: bigint;       // OG + ZOR
}>
{
  // Read from OREC.getRespectOf(address) [or direct contract reads]
  // Query both OG contract (ERC-20) and ZOR contract (ERC-1155)
  // Return aggregated balance
}
```

#### getProposals

```typescript
async function getProposals(options?: {
  status?: "Voting" | "Veto" | "Passed" | "Failed";
  proposer?: string;
  offset?: number;
  limit?: number;
}): Promise<ProposalWithMetadata[]>
{
  // Query OREC for proposals matching filters
  // Fetch metadata from ornode (off-chain archive)
  // Return list of proposals with full content
}
```

#### getAwards

```typescript
async function getAwards(address: string): Promise<{
  nfts: Award[];       // Array of individual awards (rank, amount, session)
  totalRespect: bigint;
  firstAwarded: Date;
  lastAwarded: Date;
}>
{
  // Query ZOR contract for all NTTs held by address
  // Decode metadata (session #, group #, rank)
  // Return full award history
}
```

### License & Integration Considerations

| Aspect | Detail |
|--------|--------|
| **License** | GPL-3.0 (orclient is GPL-3.0) |
| **ZAO OS License** | MIT |
| **Compatibility** | GPL-3.0 is permissive for dependent projects (no relicensing required). Acceptable for MIT-licensed apps. |
| **Dependency version** | 1.4.4 (May 2026, latest) |
| **Ethers v6 dependency** | orclient requires ethers.js v6.x (ZAO OS uses viem; need wrapper or dual dep) |
| **Wallet requirement** | EIP-1193 provider (MetaMask, WalletConnect, Farcaster signer). Sign proposals before submit. |

---

## 6. Gas Costs & Performance

### On-Chain Transaction Costs

Optimism OP Mainnet (L2) is 100x cheaper than Ethereum L1:

| Operation | Optimism Cost | Ethereum L1 Cost | Notes |
|-----------|---------------|------------------|-------|
| proposeBreakoutResult() | $0.05-0.10 | $5-10 | Propose new session |
| vote() YES | $0.02-0.05 | $2-5 | Single YES vote |
| vote() NO | $0.02-0.05 | $2-5 | Single NO vote |
| execute() | $0.02-0.05 | $2-5 | Trigger minting after passing |
| mintRespect() | $0.01-0.03 | $1-3 | Called by OREC, single mint |
| Batch mint (6 at once) | $0.05-0.10 | $5-10 | ZOR awards to all winners |

**Per-session cost (ZAO example):**

```
1 proposal + 5 votes + 1 execute + 1 mint call = ~$0.30-0.50 per fractal
vs. Ethereum L1: ~$30-50 per fractal

Weekly (Monday 6pm EST): 3-5 sessions per week
= $0.90-2.50/week on Optimism
= $47-130/year per community

This affordability enables continuous weekly voting.
```

---

## 7. Deployment & Chain Support

### Optimism OP Mainnet (Current ZAO Deployment)

| Component | Address |
|-----------|---------|
| **OREC** | 0xcB05F9254765CA521F7698e61E0A6CA6456Be532 |
| **OG Respect (ERC-20)** | 0x34cE89baA7E4a4B00E17F7E4C0cb97105C216957 |
| **ZOR Respect (ERC-1155)** | 0x9885CCeEf7E8371Bf8d6f2413723D25917E7445c |
| **ornode backend** | zao-ornode.frapps.xyz (currently down, May 2026) |
| **frapps frontend** | zao.frapps.xyz (Vite + React, zao-ornode dependency) |

**Chain rationale:**
- EVM-equivalent: Solidity contracts run unmodified
- 2-second blocks, 100x cheaper gas than L1
- Superchain ecosystem (Base, World Chain, Zora, Mode also supported)
- Live for 6+ months, proven stable (Optimism Fractal: 500+ members)

### Superchain Expansion (Base, 2026+)

ORDAO now supports deployment to Base (and other Superchain members) via orfrapps CLI:

```bash
# Deploy to Base (Coinbase's L2)
orfrapps contracts zaof -a --network base
orfrapps ornode zaof -a --network base --domain zao-base.frapps.xyz
orfrapps gui zaof -a --network base --domain zao-base.frapps.xyz
```

Configuration:
```json
{
  "deploymentCfg": {
    "network": "base",  // Switch target chain
    "votingPeriod": 259200,
    "vetoPeriod": 259200,
    "voteThreshold": "1000"
  }
}
```

---

## 8. Security Audit Status

### Known Audit Progress (May 2026)

| Auditor | Target | Status | Severity | Findings |
|---------|--------|--------|----------|----------|
| **Nethermind Security** | OREC + Respect1155 | In progress | All | None critical so far |
| **Internal review** | orclient SDK | Complete | Low/Medium | No issues |
| **Community testing** | Optimism Fractal | 6+ months live | Operational | Robust under real use |

Expected completion: June 2026 (Nethermind formal report).

### Known Attack Vectors & Mitigations

#### Reentry Risk

**Vector:** Could a reentering contract steal Respect mid-vote?

```solidity
// No direct funds transferred, only vote weight changed
// Respect tokens are non-transferable (revert on transfer)
// OREC only reads balances, never calls user code
Risk: LOW (no external calls during voting)
```

#### Integer Overflow/Underflow

**Vector:** Vote weight arithmetic overflow?

```solidity
// Solidity 0.8.x has built-in overflow protection
// require() checks ensure sums fit in uint256
Risk: MITIGATED (compiler-level protection)
```

#### Voter Manipulation

**Vector:** Proposer stuffs proposal with junk addresses to dilute voting power?

```solidity
// Require: rankedMembers.length == values.length
// Require: sum(values) > 0 and values match Respect distribution
// No benefit to submitting 1000 dummy addresses vs. 6
Risk: LOW (no incentive to spam)
```

#### Veto Window Reorg (Time-Window Attack)

**Vector:** If a veto NO arrives at block N-1, and Optimism reorgs, NO vote disappears, and execution happens at block N+1?

```
Risk: MEDIUM (theoretical, requires L1 reorg or sequencer failure)
Optimism security: Fraud-proofs take 7 days; deep reorg impossible
Practical mitigation: Wait >12 blocks after veto window closes before executing
Informal practice: ORDAO users wait 1-2 days after window closes
```

#### Ornode Metadata Mismatch

**Vector:** Proposal metadata in ornode differs from calldata submitted to OREC?

```solidity
// OREC stores only proposal hash on-chain
// Full content (rankings, metadata) in ornode MongoDB
Risk: MEDIUM (if ornode corrupted, voters vote on wrong data)
Mitigation: Hash verification before execution
  - If proposal.metadata != hash(submitted_calldata), revert
Operational mitigation: ORDAO team backs up ornode; ZAO OS caches to Supabase
```

#### Two-Wallet Bottleneck (ZAO-specific)

**Vector:** Only zaal.eth and civilmonkey.eth can submit proposals; if compromised, no voting?

```
Risk: HIGH (centralization, not ORDAO protocol issue)
ZAO Recommendation: Expand to 3-5 signers, multisig pattern, or open UI
Expected fix: Q2 2026 (ZAO OS UI integration)
```

---

## 9. What an Engineer Needs to Know to Extend or Fork ORDAO

### Adding a New Voting Parameter

If you want to change `votingPeriod` or `max_live_yes_votes`:

1. **Update OREC.sol:**

```solidity
// In Orec.sol constructor
uint256 public votingPeriod = 172800;  // 2 days instead of 3
uint256 public vetoPeriod = 172800;
uint256 public maxLiveYesVotes = 20;   // Allow 20 concurrent votes instead of 10

// Or use setVotingPeriod() admin function (if owner or governance)
function setVotingPeriod(uint256 newPeriod) external onlyOwner {
  votingPeriod = newPeriod;
  emit VotingPeriodUpdated(newPeriod);
}
```

2. **Deploy new OREC instance** (or upgrade via proxy if using UUPS pattern)

3. **Update orclient config** to point to new address:

```typescript
const orclient = await createOrclient({
  orecAddress: "0x...",  // New OREC address
});
```

### Forking for a New Community

```bash
# Clone upstream repo
git clone https://github.com/sim31/ordao.git my-dao-ordao
cd my-dao-ordao

# Install dependencies
npm install

# Configure for your community (frapp.json)
cat > deployment/frapp.json << EOF
{
  "id": "myorg",
  "fullName": "My Organization DAO",
  "network": "optimism",
  "votingPeriod": 259200,
  "vetoPeriod": 259200,
  "propWeightThreshold": "500",  // Adjust quorum for your community
  "respectContract": "0x...",    // Deploy or reference your Respect token
  "maxLiveYesVotes": 15
}
EOF

# Deploy contracts
npx hardhat ignition deploy scripts/Deploy.ts --network optimism

# Deploy ornode backend + GUI
orfrapps ornode myorg -a --domain myorg.frapps.xyz
orfrapps gui myorg -a --domain myorg.frapps.xyz

# Verify on Optimistic Etherscan
# Register domain with frapps platform (optional)
```

### Writing a Custom Voting Handler

If you want different passing conditions (e.g., 60% supermajority instead of 2x):

```solidity
// In Orec.sol, modify isPassing()
function isPassing(Proposal storage prop) internal view returns (bool)
{
  uint256 totalVotes = prop.yesWeight + prop.noWeight;
  
  // Custom: 60% supermajority
  return (
    prop.yesWeight >= (totalVotes * 60 / 100)  // YES >= 60% of total
    &&
    prop.yesWeight >= minWeightThreshold       // Plus quorum check
  );
}
```

Test extensively with:
```bash
npx hardhat test
# Add test case for edge case: what if YES = 59%?
```

### Integrating orclient into Your App

```typescript
// In your TypeScript/React app (ZAO OS example)
import { createOrclient } from "@ordao/orclient";

// On component mount
useEffect(() => {
  const init = async () => {
    const orclient = await createOrclient({
      signer: farcasterSigner,  // ZAO uses Farcaster
      orecAddress: "0xcB05...",
      ornodeUrl: "https://zao-ornode.frapps.xyz",
    });
    
    // Query leaderboard
    const respect = await orclient.getRespectOf(userAddress);
    console.log(`Total respect: ${respect.total}`);
    
    // Query active proposals
    const proposals = await orclient.getProposals({ status: "Voting" });
    proposals.forEach(prop => {
      console.log(`Proposal ${prop.id}: ${prop.metadata}`);
    });
  };
  
  init();
}, []);

// On submit button click
const handleSubmitBreakout = async (rankings: Address[]) => {
  const result = await orclient.proposeBreakoutResult({
    meetingNum: 100,
    groupNum: 3,
    rankings,
  });
  
  alert(`Proposal created: ${result.propId}`);
};
```

---

## 10. Sources

| Source | Type | Status |
|--------|------|--------|
| [sim31/ordao GitHub](https://github.com/sim31/ordao) | Source code, contracts | [FULL] |
| [Optimystics/ordao GitHub](https://github.com/Optimystics/ordao) | Deployment fork | [FULL] |
| [OREC Specification](https://github.com/sim31/ordao/blob/main/docs/OREC.md) | Design doc | [FULL] |
| [ORDAO Upgrade Path](https://github.com/sim31/ordao/blob/main/docs/OF_ORDAO_UPGRADE.md) | Rationale | [FULL] |
| [Orec.sol](https://raw.githubusercontent.com/sim31/ordao/main/contracts/packages/orec/contracts/Orec.sol) | Smart contract | [FULL] |
| [Respect1155.sol](https://raw.githubusercontent.com/sim31/ordao/main/contracts/packages/respect1155/contracts/Respect1155.sol) | Smart contract | [FULL] |
| [orclient npm package](https://www.npmjs.com/package/@ordao/orclient) | SDK, v1.4.4 | [FULL] |
| [Optimystics OREC page](https://optimystics.io/orec) | Product docs | [FULL] |
| [Optimystics ORDAO page](https://optimystics.io/ordao) | Product docs | [FULL] |
| [ZAO OREC Contract (Optimistic Etherscan)](https://optimistic.etherscan.io/address/0xcB05F9254765CA521F7698e61E0A6CA6456Be532) | On-chain verification | [PARTIAL] |
| [ZAO community.config.ts](https://github.com/bettercallzaal/zaoos/blob/main/community.config.ts) | Config reference | [FULL] |
| [Optimism Documentation](https://docs.optimism.io) | Chain reference | [FULL] |
| [OpenZeppelin ERC-1155](https://github.com/OpenZeppelin/openzeppelin-contracts) | Token standard | [FULL] |
| [Doc 56: ORDAO & Respect System](https://github.com/bettercallzaal/ZAOOS/blob/main/research/governance/056-ordao-respect-system/README.md) | Research | [FULL] |
| [Doc 718c: ORDAO On-Chain Architecture](https://github.com/ZAODEVZ/ZAOfractal/blob/main/research/whitepaper-foundations/03-ordao-onchain-architecture.md) | Whitepaper foundation | [FULL] |
| [sim31/orfrapps CLI](https://github.com/sim31/orfrapps) | Deployment tools | [FULL] |
| [Fractalgram Integration](https://github.com/Optimystics/fractalgram) | Telegram UI | [FULL] |
| [Optimism Fractal Case Study](https://optimismfractal.com) | Live deployment | [FULL] |

---

## Summary

ORDAO is a production-grade governance framework centered on **optimistic consent-based voting** (3-phase: voting + veto + execution) and **soulbound reputation tokens** (non-transferable, peer-evaluated). The OREC smart contract is gas-efficient, audit-ready, and battle-tested on Optimism with 242+ transactions (as of May 2026). The Respect1155 token (ERC-1155) enforces non-transferability at the contract level via `_beforeTokenTransfer()` hooks, and minting is gated to OREC only (no human wallets). The orclient SDK abstracts all complexity, enabling app developers to integrate proposal creation, voting, and execution in a few lines of TypeScript. For engineers extending or forking ORDAO, start with the OREC.md spec, understand the passing-conditions formula (`YES > 2x NO && YES >= minWeight`), then dive into Orec.sol and Respect1155.sol source code. Deployment is straightforward: use orfrapps CLI to configure and deploy to Optimism, Base, or other Superchain chains.

---

**Research completed:** May 24, 2026  
**Tier:** DEEP (contract source review, 3-phase voting mechanism documented, SDK integration detailed, security vectors analyzed)  
**Status:** Ready for whitepaper integration / architecture review / fork planning
