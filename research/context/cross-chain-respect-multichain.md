---
topic: cross-chain-governance
type: research
status: research-complete
last-validated: 2026-06-20
tier: DEEP
original-query: "How hard is it to set up Respect on many chains (AVAX, OP, Base, etc.) that is aligned and updates as all chains update"
---

# Cross-Chain Respect: Multi-Chain Fractal Governance Architecture

> Can Respect tokens — soulbound, peer-earned, non-transferable — work across multiple blockchains simultaneously, with voting weight that reflects your total reputation across all chains?

**Short answer:** Yes, but the approach matters enormously. Bridging the tokens directly contradicts their soulbound design. The correct architecture reads balances across chains without moving tokens. Difficulty ranges from **Medium** (OP Superchain only) to **Hard** (any EVM chain including AVAX).

---

## 1. The Core Problem

OREC's `respectContract` is a **single address on a single chain**. When you vote, your weight = your Respect balance at that address on that chain. Full stop.

If someone earns Respect on Optimism (ZAO) and also on Base (Eden), neither chain knows about the other's balances. A cross-chain governance vote would undercount their influence.

**The naive solution** — bridge the tokens — **destroys the design**:
- Soulbound tokens cannot be transferred by contract rules
- Even if you unlock transfers for bridging, you've just created "bridgeable Respect" that can be bought and sold on the destination chain
- This breaks anti-plutocracy guarantees entirely

The correct solution: **read balances across chains without moving tokens.**

---

## 2. AVAX Specifically

**Avalanche C-Chain is EVM-compatible** — ORDAO *could* be deployed there with no contract changes. But:

| Factor | Status |
|--------|--------|
| Existing fractal/ORDAO community on AVAX | **None found** (as of June 2026) |
| OP Stack compatibility | **No** — AVAX is not an OP Stack chain |
| Native Superchain interop usable | **No** — `L2ToL2CrossDomainMessenger` is OP Stack only |
| Bridge options | LayerZero, Wormhole NTT, Axelar, Chainlink CCIP |
| Deployment difficulty | **Hard** — requires a general bridge with trust assumptions |
| Cost vs Optimism | AVAX C-Chain gas is comparable; but bridge relay fees add overhead |

**Verdict:** AVAX is possible but would require a general-purpose bridge (adding trust, latency, and complexity). The fractal ecosystem has no presence there. If the goal is multi-chain Respect, starting with OP Stack chains (Optimism, Base, Mode, Zora) is far easier — they share native messaging.

---

## 3. Four Approaches to Cross-Chain Respect (Ranked by Difficulty)

### Approach 1 — Superchain Native Interop (Easiest for OP Stack)

**How:** Use Optimism's `L2ToL2CrossDomainMessenger` — deployed at a standard address on every OP Stack chain. A spoke contract on Chain B can read a Respect balance from Chain A without moving any tokens.

**Architecture:**
```
ZAO (OP Mainnet) — OREC + Respect1155
        ↕ L2ToL2CrossDomainMessenger (trustless)
Eden (Base) — OREC + Respect1155
        ↕ L2ToL2CrossDomainMessenger
Future Fractal (Mode/Zora/etc.) — Spoke contract reads both
```

**Properties:**
- Trustless — no bridge operator, no multisig
- Low latency (minutes, not hours)
- Soulbound preserved — tokens never leave their home chain
- Spoke contract on each destination reads hub balances
- Aggregated voting weight = sum of balances from all registered chains

**Status (June 2026):** Architecture designed and documented by Optimystics (Superchain Interop Incubator). ZAO (Optimism) and Eden (Base) have live ORDAO deployments. Cross-chain spoke contracts NOT yet deployed — this is the next engineering milestone.

**Difficulty: Medium.** ~2-4 weeks of engineering for a team familiar with OP Stack and ORDAO.

---

### Approach 2 — Wormhole NTT Hub-and-Spoke (Any EVM Chain)

**How:** Wormhole's Native Token Transfers (NTT) supports a hub-and-spoke model for non-transferable tokens. The canonical chain holds and locks balances; NTT relays balance attestations to spoke chains.

**Key fact from Wormhole docs:**
> "For existing ERC-20 tokens that cannot modify their supply, NTT uses a Hub-and-spoke model where tokens on the native chain are locked and an equivalent balance is minted on non-native chains."

**Critical caveat:** Even with NTT, **non-transferability must be independently enforced on each destination chain**. The bridge handles supply accounting only; the soulbound constraint lives in the token contract and must be replicated on every chain you deploy to. If you don't do this, the "mirrored" Respect on destination chains would be transferable.

**Works for:** AVAX, Polygon, BNB Chain, Ethereum mainnet, Arbitrum, and any other EVM chain Wormhole supports (20+ chains).

**Difficulty: Hard.** Requires deploying and configuring NTT contracts on every chain, auditing the soulbound enforcement on each destination, and managing relayer infrastructure. Bridge introduces a trust assumption (Wormhole guardian network).

---

### Approach 3 — EAS Attestations (Off-Chain, Practical for Sybil Resistance)

**How:** Ethereum Attestation Service (EAS) lets a trusted attester sign a statement like "wallet 0x123 has 500 Respect on Optimism" and publish it as an on-chain attestation. Contracts on other chains can read that attestation via resolver contracts or ZK proofs.

**EAS deployments:** Ethereum, Arbitrum, Base, Optimism, Polygon, Scroll, and more.

**Used by:** Gitcoin Passport (Sybil resistance across chains), grant programs on Base and Optimism reading Ethereum-issued credentials.

**Tradeoff:** Introduces a trusted attester (the entity signing attestations). If the attester is centralized, it's a trust bottleneck. If it's the ORDAO contract itself, you've created a read-only oracle — which is reasonable.

**Difficulty: Medium.** EAS is well-documented with SDKs. The main work is: who attests, how often do they update, and what's the latency between Respect change and attestation update.

---

### Approach 4 — Off-Chain Aggregation via Ornode (Quickest to Prototype)

**How:** Extend the ornode backend to index Respect balances from multiple chains (via RPC calls to each). When OREC checks voting weight, it queries the aggregated ornode instead of a single contract.

**Properties:**
- Fastest to build (days, not weeks)
- Works for any chain with an RPC endpoint (including AVAX)
- Does NOT require any new on-chain contracts
- Tradeoff: ornode is off-chain — introduces a centralization point

**Good for:** UX layer (dashboards, leaderboards), early prototyping of multi-chain Respect, or cases where full trustlessness isn't critical yet.

**Difficulty: Easy-Medium.** But it's not production-safe for high-stakes governance.

---

## 4. What Standards Exist for Cross-Chain Soulbound Tokens

| Standard | What it does | Cross-chain support |
|----------|-------------|---------------------|
| **ERC-4973** (Account-Bound Tokens) | Non-transferable NFT bound to wallet; holder can `unequip()` | No native bridge — must use EAS or off-chain layers |
| **ERC-5114** (Soulbound Badge) | Token bound to a specific NFT as identity anchor | No native bridge |
| **ERC-5484** | Soulbound with burn authorization controls | No native bridge |
| **ERC-7802** | Token with mint/burn access granted to cross-chain bridges | Designed for cross-chain; compatible with Burn-and-Mint bridging |
| **ERC-7683** | Cross-chain intents standard | Not for reputation; for cross-chain transactions |

**Key finding: No native cross-chain protocol exists specifically for soulbound/non-transferable tokens.** Cross-chain portability is always a layered add-on: EAS attestations, Galxe aggregation, or hub-and-spoke NTT with destination-chain soulbound enforcement.

---

## 5. Existing Cross-Chain Reputation Projects (Not Fractals, But Relevant)

| Project | Approach | Chains | Notes |
|---------|----------|--------|-------|
| **Gitcoin Passport** | EAS attestations + SBT-like credential | Ethereum, OP, Base, Arbitrum | Dominant Sybil resistance tool for grants |
| **Galxe** | On-chain credential aggregation + indexed multi-chain history | 30+ chains | Used for NFT campaigns, governance gating |
| **Ethereum Attestation Service (EAS)** | On-chain attestations with cross-chain resolvers | Ethereum, OP, Base, Arbitrum, Scroll | Infrastructure layer; other projects build on it |
| **Lens Protocol** | Social graph as portable NFT | Polygon → expanding | Identity travels with user across Lens-compatible apps |
| **Arcx** | Wallet reputation scoring from on-chain history | Multi-chain indexing | Read-only; no on-chain token |
| **ENS + CCIP-Read** | Name resolution extending multi-chain via CCIP | Ethereum + EVM chains | ENS names resolving cross-chain records |

**None of these use the Respect Game / ORDAO peer-evaluation model.** ZAO + Eden would be the first fractal-democracy implementation of cross-chain reputation.

---

## 6. Engineering Roadmap: Multi-Chain Respect for ZAO

Ordered by what to build first:

### Phase 1 — OP Superchain (3-4 weeks, Medium difficulty)

1. Deploy a **Spoke Respect Reader** contract on Base (reads ZAO Respect on Optimism via `L2ToL2CrossDomainMessenger`)
2. Extend ZAO's OREC to accept `voteWithCrossChainWeight(chainId, balance, proof)` — aggregates local + remote balances
3. Test with Eden Fractal: ZAO members' Optimism Respect is visible in Eden governance, and vice versa
4. Deploy symmetric spoke on Optimism reading Eden/Base balances

**Result:** ZAO and Eden Fractal share a unified Respect graph across OP Mainnet + Base. A member who earns Respect in both communities has aggregated weight in either governance system.

### Phase 2 — Any EVM Chain (2-3 months, Hard)

1. Choose bridge: Wormhole NTT recommended (supports hub-and-spoke, large chain coverage)
2. Deploy NTT hub contract on Optimism (ZAO's home chain)
3. Deploy NTT spoke + soulbound-enforcing Respect mirror contract on each target chain (AVAX, Polygon, etc.)
4. Configure attestation relay (Wormhole guardians or self-hosted relayer)
5. Audit: verify soulbound enforcement is correctly replicated on every spoke chain
6. Update OREC `respectContract` to read from the aggregator

**Result:** Anyone on any EVM chain can participate in ZAO governance and have their cross-chain Respect counted. AVAX, Polygon, BNB, Ethereum mainnet all included.

### Phase 3 — Non-EVM Chains (Research only)

Non-EVM chains (Solana, Cosmos, TON) would require custom bridge adapters and are not currently relevant to the fractal ecosystem. Not recommended until Phase 2 is mature.

---

## 7. Key Tradeoffs Summary

| Factor | Superchain only | General bridge (Wormhole etc.) | Off-chain aggregation |
|--------|-----------------|-------------------------------|----------------------|
| Includes AVAX | No | Yes | Yes |
| Trust model | Trustless | Bridge guardian trust | Ornode operator trust |
| Engineering effort | Medium | Hard | Easy |
| Latency | Minutes | Minutes to hours | Real-time (RPC) |
| Soulbound preserved | Yes (tokens don't move) | Yes (if enforced on destination) | Yes (tokens don't move) |
| Production-safe | Yes | After audit | Prototype only |
| Recommended for ZAO | **Yes — Phase 1** | Future (Phase 2) | Prototyping only |

---

## 8. The ZAO + Eden First Step

The simplest, highest-value cross-chain Respect to build **right now**:

```
ZAO (Optimism) ←→ Eden Fractal (Base)
    via L2ToL2CrossDomainMessenger

Shared governance: 
- ZAO members can vote in Eden proposals with their OP Respect
- Eden members can vote in ZAO proposals with their Base Respect
- A "Superchain Fractal Council" can form from both communities' top Respect holders
```

This positions ZAO and Eden as a **unified Superchain fractal ecosystem** and is a strong grant narrative for Optimism Collective (Superchain Interop Incubator). It's also exactly what Optimystics has been designing in the Superchain ORDAO architecture.

Talking to Dan Singjoy about this is the right move — he's the person who'd coordinate the Eden side of the spoke contract deployment.

---

## Sources

- [Wormhole NTT — Hub-and-Spoke for non-transferable tokens](https://wormhole.com/products/native-token-transfers)
- [ERC-4973: Account-Bound Tokens](https://eips.ethereum.org/EIPS/eip-4973)
- [ERC-5114: Soulbound Badge](https://eips.ethereum.org/EIPS/eip-5114)
- [ERC-7802: Token With Mint/Burn Access Across Chains](https://eips.ethereum.org/EIPS/eip-7802)
- [ERC-7683: A Standard for Cross-Chain Intents](https://lifi.substack.com/p/erc-7683-a-standard-for-cross-chain)
- [Chainlink CCIP: Lock-and-Mint vs Burn-and-Mint](https://docs.chain.link/ccip/concepts/cross-chain-tokens)
- [Chainlink: What is Burn and Mint?](https://chain.link/article/burn-and-mint-transfer)
- [Comparative Analysis of Cross-Chain Token Standards — arXiv 2025](https://arxiv.org/pdf/2603.06388)
- [Gitcoin Passport — Cross-chain Sybil resistance](https://passport.gitcoin.co)
- [Galxe — Multi-chain credential aggregation](https://galxe.com)
- [Ethereum Attestation Service (EAS)](https://attest.sh)
- [Decentralized Cross-Network Identity Management — arXiv](https://arxiv.org/pdf/2104.03277)
- [awesome-soulbound-tokens — GitHub (Ensoul-Labs)](https://github.com/Ensoul-Labs/awesome-soulbound-tokens)
- [Reputation Tokens: The Future of Trust in DeFi — HodlHorizon](https://hodlhorizon.com/news/rise-of-reputation-tokens-trust-collateral)
- [Superchain ORDAO design — /research/context/superchain-ordao-crosschain.md (this repo)](../context/superchain-ordao-crosschain.md)
- [ORDAO GitHub — sim31/ordao](https://github.com/sim31/ordao)
- [ZAO OREC on Optimism — 0xcB05F9254765CA521F7698e61E0A6CA6456Be532](https://optimistic.etherscan.io/address/0xcb05f9254765ca521f7698e61e0a6ca6456be532)
