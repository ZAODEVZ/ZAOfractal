# Chapter 6: On-Chain Architecture

Draft v0.1 - 2026-05-25 - awaiting Zaal review

---

> *ORDAO is the optimistic Respect-based executive contract that turns peer-evaluated contribution into on-chain governance. It solves the voter apathy problem by inverting the burden of proof: instead of proving consensus exists, the system assumes it and allows the minority to veto.*

---

## I. ORDAO and OREC: The Design Problem

Larimer's fractal governance theory is elegant in principle. In practice, it faces an immediate constraint: how do you enforce the weekly consensus rankings on-chain without requiring active participation from every member every time?

Traditional DAOs solve this with voting quorum. Compound requires 50% participation to execute a proposal. Uniswap requires active voting to pass governance changes. This works until you meet reality: average DAO voter participation is 3-10%. If your governance is frozen by low participation, the system collapses to multisig (founders vote, community is nominal).

The ZAO solution: ORDAO - Optimistic Respect-based DAO architecture.

ORDAO inverts the voting model. Instead of "prove consensus exists," it says "assume consensus exists. Let the minority veto if they disagree." This is the same security model used by optimistic rollups on Ethereum (Optimism, Arbitrum): assume transactions are valid, allow a fraud-proof window for challenges, execute if no successful challenges arrive.

The result: Respect-weighted proposals pass with 5-10% quorum (instead of 50%+), veto periods allow community override if needed, and execution is open to anyone (not a centralized executor). This solves voter apathy while maintaining minority protection.

---

## II. OREC: The Three-Phase Voting Cycle

OREC proposals move through three explicit phases: voting, veto, and execution. Each phase has a fixed duration and distinct rules.

### Phase 1: Voting Window (72 hours typical)

When a member proposes a change - a Respect game outcome, a treasury allocation, a governance parameter adjustment - the proposal enters voting. Any holder of Respect can vote YES or NO. Their vote weight is their Respect balance at the block the proposal was submitted (a historical snapshot, not a live balance).

On Optimism, voting costs approximately 0.02-0.05 USD per vote in gas. This is affordable enough for serious votes but expensive enough to discourage spam.

The proposer's wallet automatically votes YES upon submission. This is not a conflict of interest. It is an assumption of good faith: if you propose something, you believe it is good.

Vote weight is non-delegatable. Your Respect is soulbound; your vote comes directly from your wallet. This prevents vote-buying intermediaries.

### Phase 2: Veto Window (72 hours, follows voting)

When voting closes, the veto window opens. NO votes are still accepted. YES votes are not.

This is the crucial minority protection mechanism. If consensus-building failed off-chain, the community has a challenge window to mobilize opposition. Blocking power comes from the passing threshold, not from any per-vote multiplier: under the OREC default a proposal fails unless YES exceeds twice the NO weight (see Phase 3), so a coalition holding roughly one-third of the YES weight can block it. These thresholds are OREC defaults - ZAO sets and has historically adjusted its own parameters - and the current ZAO values should be read from the live contract, not assumed. The veto window shifts the burden of proof onto the proposer, who must accommodate dissent or watch the proposal fail.

The veto window also prevents last-minute attacks. An attacker cannot wait until the final block of voting to dump a massive NO vote (by purchasing Respect from a reluctant holder). Respect is soulbound; no one sells it. The attacker would have had to earn it over weeks. This creates a natural audit trail: high-impact veto voters are visible, and their Respect history is public.

### Phase 3: Execution

When both windows close, the proposal is eligible for execution. The passing conditions are:

```
(current_block >= proposal_created + voting_window + veto_window)
AND
(yes_weight >= total_respect * min_threshold)
AND
(yes_weight > no_weight * 2)
```

In mathematical form: 1/3 of active Respect holders can block any proposal (veto power). 2/3 can guarantee passage. A 50-50 split always fails (not > 2x). Abstentions are invisible (zero voting weight contributes nothing).

ZAO's `minWeight` is a fixed 1,000 Respect, read live from the OREC contract - not a percentage of supply. Against ZAO's 38,484 OG Respect that is roughly 2.6%, deliberately low so a small active minority can pass routine proposals while the veto window protects everyone else. (The value is a governance parameter ZAO sets, not a constant; read it from the contract for the current figure.)

When conditions are met, **anyone** can call the execute function. This is important. Execution is not centralized to the proposer or a multisig. Any community member can trigger it. This removes a critical single-point-of-failure: if the proposer's wallet is compromised, the execution still happens.

---

## III. The Two-Ledger Model: OG + ZOR

ZAO maintains two separate Respect token contracts to decouple voting power from ongoing earnings.

**OG Respect (ERC-20, Frozen Historical Ledger)**

Address: `0x34cE89baA7E4a4B00E17F7E4C0cb97105C216957` (Optimism Mainnet)

Total supply: 38,484 Respect tokens (read on-chain), frozen since late 2025 - the ORDAO contract walkthrough dates the last mint to 18 December 2025.

OG Respect is the historical ledger. It covers fractals 1-73 (August 2024 - September 2025), before OREC was deployed. These tokens are soulbound: both `transfer()` and `transferFrom()` functions revert with "Respect is soulbound and cannot be transferred."

OG Respect holders retain full voting power in ORDAO. If you earned 500 Respect in the early weeks, your 500 Respect still counts as voting weight in every proposal. This decouples voting rights from recency of contribution. An early adopter who has been absent for months can still vote at full weight, if they choose to.

**ZOR Respect (ERC-1155, Living Democratic Ledger)**

Address: `0x9885CCeEf7E8371Bf8d6f2413723D25917E7445c` (Optimism Mainnet)

ZOR is the active ledger for fractals 74+ (deployed September 2025, post-OREC). Every weekly Respect game result since September 2025 is minted as ZOR.

ZOR uses ERC-1155 (non-fungible token standard), not ERC-20. Each Respect award is a separate token ID, with metadata tracking the round, circle members, and rank. This creates an immutable record: "on 2026-05-20, member Alice earned 68 Respect for Rank 2 in Circle 3, with peers Bob, Carol, and Dan."

ZOR is also soulbound. The `_beforeTokenTransfer` hook enforces: transfers are only allowed if `from == address(0)` (minting) or `to == address(0)` (burning). All peer-to-peer transfers revert.

Only the OREC contract can mint ZOR. There is no admin minting. No manual override. This removes human discretion from token issuance and makes the system verifiably fair: every Respect token can be traced to a proposal that passed ORDAO voting.

### Why Two Tokens?

**Historical Preservation:** The OG ledger cannot be lost or rewritten. Even though frozen, members' OG balances remain on-chain as proof of early recognition and contribution. This is important for legitimacy: new members join a system with a visible, auditable history.

**Democratic Future:** ZOR reflects ongoing peer evaluation. Because it is minted by OREC proposals only, it is provably trustworthy - no backstage favoritism, no admin discretion.

**Vote Weight Decoupling:** On-chain voting power is read from the OG ledger only. OREC snapshots a member's OG balance at the block a proposal is created; ZOR mints do not change voting weight. This is deliberate: it prevents "who earned Respect this week" from overwhelming "who has earned standing over the life of the community." A member with high OG votes at full weight even if they have been inactive lately.

The honest consequence: a member who joined after the OG freeze and holds only ZOR currently has no on-chain voting weight, however much ZOR they earn. Their ZOR is a verifiable, soulbound record of contribution and a live reward ledger, but it does not yet confer governance power. Closing this gap - giving the active ZOR ledger a path to voting weight without discarding the OG history it was decoupled from - is an open governance problem (see Chapter 9).

---

## IV. Soulbound Enforcement at the ERC-1155 Level

The mechanism that prevents Respect from being traded or bought is simple code with strong enforcement.

For OG (ERC-20):

```solidity
function transfer(address to, uint256 amount) public override returns (bool) {
  revert("Respect is soulbound and cannot be transferred");
}

function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
  revert("Respect is soulbound and cannot be transferred");
}
```

Any call to `transfer()` or `transferFrom()` reverts. No exceptions. No upgrade path. The contract was deployed with these functions in place.

For ZOR (ERC-1155):

```solidity
function _beforeTokenTransfer(
  address operator,
  address from,
  address to,
  uint256[] memory ids,
  uint256[] memory amounts,
  bytes memory data
) internal override {
  require(
    from == address(0) || to == address(0),
    "Respect tokens are soulbound and cannot be transferred"
  );
  super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
}
```

The `_beforeTokenTransfer` hook is called before any token transfer. If `from` is not the zero address (minting) and `to` is not the zero address (burning), the transfer reverts. Only the OREC contract and the original Respect Game system can mint (from == 0x0) or administrators can burn (to == 0x0).

This enforcement is at the contract level, not the wallet level. Even if a member uses advanced techniques (flash loans, batch operations, contract-to-contract transfers), the token contract itself rejects peer-to-peer transfer. There is no workaround.

---

## V. Contract Addresses and Configuration (Optimism Mainnet)

| Contract | Address | Role | Token Standard | Status |
|----------|---------|------|---|---|
| **OG Respect** | `0x34cE89baA7E4a4B00E17F7E4C0cb97105C216957` | Historical voting ledger | ERC-20 | Frozen (no new mints) |
| **ZOR Respect** | `0x9885CCeEf7E8371Bf8d6f2413723D25917E7445c` | Active weekly ledger | ERC-1155 | Active (OREC mints each week) |
| **OREC** | `0xcB05F9254765CA521F7698e61E0A6CA6456Be532` | Voting + execution engine | Smart contract | Active |

**OREC Configuration (ZAO Mainnet):**

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `voteLen` | 259,200 seconds (3 days) | Duration of YES/NO voting (read live) |
| `vetoLen` | 259,200 seconds (3 days) | Duration of NO-only veto (read live) |
| `minWeight` | 1,000 Respect (~2.6% of OG supply) | Minimum YES weight to qualify (read live) |
| `respectContract` | `0x34cE89...` (OG) | Vote weight source, read live from OREC |
| `respectContractZOR` | `0x9885CC...` | Minting target (active) |
| `maxConcurrentProposals` | 10 | Prevent proposal spam |

These values are optimized for ZAO's 188-person community. Larger fractals would increase thresholds; smaller fractals might tighten windows.

---

## VI. Gas Economics on Optimism Mainnet

Governance on Ethereum mainnet is prohibitively expensive. A single YES vote on a major protocol change costs 50-200 USD in gas. ORDAO is deployed on Optimism, a layer-2 network, where costs are 100x lower.

**Current gas costs on Optimism (May 2026):**

- **Proposing a Respect game result:** ~100,000 gas = 0.002-0.005 USD
- **Voting YES or NO:** ~50,000 gas = 0.001-0.003 USD
- **Executing a passed proposal:** ~100,000 gas = 0.002-0.005 USD
- **Minting ZOR Respect tokens:** ~30,000 gas per token = 0.0006-0.0015 USD per member

A weekly Respect game with 40+ members and 8 groups costs approximately 0.10-0.20 USD in total gas. For comparison, a single governance vote on Ethereum mainnet costs more.

This enables ZAO to run governance at a scale where every member's participation has financial viability. Members are not discouraged from voting due to gas costs.

Optimism's technical advantage is "EVM equivalence": the chain is a direct EVM (Ethereum Virtual Machine) replica, with the same opcodes, contract languages, and tooling as Ethereum mainnet. No novel languages, no specialized skill requirements.

---

## VII. Security Vectors and Documented Mitigations

ORDAO is not immune to attack. Six documented security vectors have been identified and mitigated:

### Vector 1: Re-entrancy

**Risk:** A malicious contract used as a voting recipient (in proposals that transfer assets) could call back into OREC during execution, modifying vote counts or proposal state.

**Mitigation:** OREC uses OpenZeppelin's ReentrancyGuard pattern. All external calls are made after state mutations. Vote state is locked once voting closes.

### Vector 2: Integer Overflow / Underflow

**Risk:** If a proposer submits many votes (by calling vote() repeatedly with different inputs), could an integer overflow cause vote counts to wrap around?

**Mitigation:** Solidity 0.8.x has automatic overflow checks. Any vote addition that exceeds uint256 max reverts. ZAO's Respect total is 38,000+, far below max uint256 (2^256 - 1).

### Vector 3: Voter Manipulation (Vote Changing)

**Risk:** A voter votes YES, then changes to NO, then changes back. This could be exploited to game consensus thresholds.

**Mitigation:** OREC tracks each wallet's current vote (not a vote history). When a voter calls `vote()` again, their previous vote is overwritten. Only the final vote (at the end of voting window) counts. No vote-flipping attacks possible.

### Vector 4: The 2-Wallet OREC Bottleneck (Centralization Vector)

**Risk:** OREC's execution is permissionless (anyone can execute), but Respect Game results are submitted via a specific wallet (the "game runner"). If this wallet is compromised, malicious proposals could be submitted.

**Mitigation (Partial):** The game runner submits proposals, but ORDAO voting still enforces consensus. A malicious proposal would need to pass YES > 2x NO and meet the 10% threshold. This is non-trivial, but a sufficiently motivated attacker with institutional access could propose spending the treasury to themselves, knowing they hold enough Respect to vote YES.

**Better Mitigation (Recommended):** Deploy a multi-sig (e.g., 2-of-3) to authorize game results before OREC submission. This adds 1-2 hours of latency but removes centralization.

### Vector 5: OREC Controller Compromise

**Risk:** If the OREC contract itself is compromised (e.g., via an upgrade), the attacker could drain the ZOR token minting rights.

**Mitigation:** OREC is deployed as a non-upgradeable contract (no proxy). The code is fixed. If a critical bug is found, a new OREC must be redeployed and voted into use (via governance). This is slow but secure.

### Vector 6: ERC-1155 Transfer-Bypass Attempts

**Risk:** Could an advanced contract (flash loan, batch, wrapped token) trick the ERC-1155 soulbound check?

**Mitigation:** The `_beforeTokenTransfer` hook is called by the ERC-1155 standard at the contract level, before any external calls. It is not bypassable via clever contract tricks. Transfer always reverts if `from != 0x0 AND to != 0x0`.

---

## VIII. License and Stack Interoperability

ORDAO is licensed under GPL-3.0 (copyleft). Any derivative work must also be open source.

ZAO OS (the social client layer) is licensed under MIT (permissive). This creates a licensing boundary: GPL-3.0 ORDAO contracts are used *as dependencies*, not integrated directly into MIT code.

**Integration Pattern:**

ORDAO provides an npm package, `@ordao/orclient`, which is a TypeScript SDK for reading proposals and voting. ZAO OS depends on this package.

```
ZAO OS (MIT)
  └─ @ordao/orclient (GPL-3.0 dependency)
```

ZAO OS uses orclient for ORDAO read operations (proposal state) and delegation to ethers v6 for write operations (vote submission). This maintains licensing compliance: GPL-3.0 code is isolated in the orclient package; ZAO OS calls it but does not extend it.

For contract-to-contract integration on-chain, ZAO OS contracts can import ORDAO interfaces without violating GPL (interface definitions are typically exempt). The boundary is source code distribution. If ZAO OS publishes modified ORDAO source, it must be GPL-3.0; if it only uses compiled ABIs, MIT applies.

**RPC and Wallet Library Interoperability:**

ORDAO uses ethers.js v6 for transaction signing (internally, in orclient). ZAO OS uses viem for most RPC calls. Both libraries are compatible with Optimism. No conflicts.

A member voting on ORDAO uses their wallet (Privy, Frames, MetaMask) to sign a transaction via ethers v6. The same wallet then uses viem to check their Respect balance. No coordination needed - both use standard JSON-RPC over Optimism Mainnet.

---

## IX. Audit Status and Verification

ORDAO is **not** formally audited by a third-party security firm as of May 2026. However, it has undergone the following verification:

1. **Optimystics Code Review:** sim31 (author) and the Optimystics team conducted line-by-line review of Solidity contracts.
2. **Fuzzing:** orclient has unit tests covering all major vote paths.
3. **Live Deployment:** OREC has been live on Optimism since September 2025, with 242+ transactions as of May 2026, all successful.
4. **Academic Review:** Larimer and Eden Fractal governance team reviewed the mechanism against Fractally design principles.

**Recommended Next Steps:**

For production use at scale (>500 members or >$1M treasury), commission a formal smart contract audit from a reputable firm (e.g., Trail of Bits, Consensys Diligence, Spearbit). The cost is typically 15,000-50,000 USD, and it provides liability coverage and institutional credibility.

---

## X. The Respect Game as Off-Chain Consensus, OREC as On-Chain Enforcement

It is crucial to understand the architecture boundary: the Respect Game (breakout circles, Fibonacci ranking) is entirely off-chain. OREC is the enforcement layer.

**Off-Chain (Human consensus):**
- 40+ members gather in breakout rooms of 5-6 (breakout rooms on Farcaster, Discord, or Gather.town).
- Each circle discusses and reaches consensus on ranking (which names to place at each Fibonacci level).
- The circle lead submits the ranking (e.g., "Alice: 110, Bob: 68, Carol: 42, ...") to a shared spreadsheet or Discord channel.

**On-Chain (OREC enforcement):**
- The game runner collects all circle results and submits a single proposal to OREC: "Mint this week's Respect according to these rankings."
- ORDAO voting proceeds: 72-hour voting window, 72-hour veto period, then execution.
- If the proposal passes, OREC mints ZOR tokens to each winner's wallet, immutably on-chain.

The off-chain human consensus is the source of authority. The on-chain enforcement is the record-keeping and voting gate. If a circle is corrupt (all members rank their friend 1st), that corruption happens off-chain, but the on-chain vote gate still enforces: the group's ranking must pass community-wide ORDAO voting to be minted.

This architecture is intentional. It keeps the lightweight human process lightweight, while adding cryptographic certainty to the final output.

---

## XI. Scaling Beyond ZAO: The Frapps Platform

ORDAO contracts are not ZAO-specific. They are deployed via the frapps platform, a multi-instance deployment system maintained by Optimystics.

**Frapps (Fractal Applications) Platform:**

Frapps provides:
- A CLI tool (`orfrapps`) for deploying new instances of OREC.
- A configuration language (`frapp.json`) for setting parameters (voting period, threshold, etc.).
- A hosted UI (`zao.frapps.xyz`) for members to vote.
- A backend indexer (`ornode`) that syncs OREC events to a database.

Any community can use frapps to deploy their own ORDAO + Respect tokens in 30 minutes:

```bash
orfrapps deploy \
  --respect-token=0x9885... \
  --voting-period=259200 \
  --veto-period=259200 \
  --min-threshold=1000
```

Currently, the live production OREC instances are ZAO Fractal (Optimism) and Eden Fractal (Base). Optimism Fractal ran an instance but has been paused since January 2026. Fractally, the original EOS community, predates OREC and runs on a different, pre-OREC stack - it is not a frapps instance.

The frapps pattern decouples ORDAO from ZAO governance. ZAO is an application built on ORDAO; other applications can be built the same way.

---

## Sources

- `research/whitepaper-foundations/03-ordao-onchain-architecture.md` - Primary source, OREC mechanism, Respect token design
- `research/code-walk/02-ordao-contracts-walkthrough.md` - Solidity contract details, repo structure, security vectors
- `research/reference/08-ordao-orec-frapps.md` - Deployment addresses, gas economics, frapps platform
- `github.com/sim31/ordao` - Authoritative ORDAO source code (GPL-3.0)
- `github.com/Optimystics/ordao` - Production deployment (Optimism Mainnet, maintained)
- Optimism Mainnet Etherscan: Contract verification and transaction history (all addresses verified on-chain)

