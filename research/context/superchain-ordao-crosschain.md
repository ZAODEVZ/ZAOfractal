---
topic: governance
type: guide
status: research-complete
last-validated: 2026-05-21
superseded-by:
related-docs: 56, 58, 102, 103, 104, 109, 184, 285, 306, 346, 702, 703
original-query: Superchain ORDAO cross-chain respect Hats integration Eden Epoch 2 Optimism grants ZAO (reconstructed)
tier: STANDARD
---

# 184 - Superchain ORDAO & Cross-Chain Fractal Governance

> **Goal:** Understand Superchain ORDAO architecture, cross-chain Respect mechanisms, Hats Protocol integration, Eden Fractal Epoch 2 deployment on Base, and Optimism Collective grant opportunities for ZAO.

## Key Decisions (Recommendations First)

| Decision | Recommendation | Rationale | Timeline |
|----------|---|---|---|
| **Cross-chain Respect model** | ZAO should NOT attempt cross-chain Respect bridging; instead, leverage native Superchain interop for *reading* Respect balances | Respect is soulbound (non-transferable) - bridging it contradicts the design. Hub-and-spoke reads (not transfers) are safe and preserve credible neutrality. | Adopted (no change needed) |
| **Hats integration for ZAO** | Deploy ERC1155 Eligibility Modules on existing ZAO Hats tree, gated to ZOR Respect thresholds | Automates role assignment (Member/Contributor/Council) based on Respect tiers. Simplifies governance permission checks. | Future sprint (post-Doc-703 bottleneck fix) |
| **Optimism grant track** | Pursue RetroPGF (Onchain Builders) over Grants Council - ZAO's ORDAO deployment + Respect Games are public goods with retroactive proof | RetroPGF emphasizes impact over ongoing operational need. 30M+ OP allocated; ZAO qualifies as ecosystem diversity (music vertical). | RFP window dependent |
| **Eden Epoch 2 partnership** | Maintain ZAO as an independent fractal on Optimism; co-brand as "Superchain fractals" when discussing cross-community initiatives | ZAO is now the only active fractal on Optimism (since OP Fractal paused Jan 2026). Don't subsume into Eden; position as parallel hub. | Ongoing |

---

## 1. Superchain ORDAO & Interop Vision

### What is Superchain ORDAO?

Superchain ORDAO is the proposed extension of the ORDAO governance framework across multiple OP Stack chains (Optimism, Base, Mode, Zora, Fraxtal, and future Superchain members). The architecture leverages Optimism's **native L2-to-L2 messaging** to enable cross-chain governance without traditional bridges.

**Status (May 2026):** The Superchain Interop Incubator (run by Optimism Foundation and Optimystics) is actively developing this. Optimystics pitched the concept alongside Eden Fractal's June 5, 2025 Epoch 2 launch (event #121). The goal: communities can coordinate governance and verify Respect balances across chains while preserving each community's local decision-making autonomy.

### Hub-and-Spoke Architecture

The Superchain ORDAO design implements cross-chain governance through a **hub-and-spoke model**:

| Component | Role | Purpose |
|-----------|------|---------|
| **Hub Contract (OREC)** | Community's primary governance executor | Deployed on community's "home chain" (e.g., ZAO on Optimism, Eden on Base) |
| **Spoke Contracts (Emitters)** | Cross-chain Respect readers + vote relayers | Deployed on other Superchain chains; can verify Respect balances from hub |
| **L2ToL2CrossDomainMessenger** | Native Superchain interop primitive | Low-latency, trustless message passing between OP Stack L2s |
| **Ornode** | Off-chain metadata service | Stores proposals, voting history, Respect event logs (optional; OREC contract is the source of truth) |

**How it works:**
1. Each fractal community (ZAO, Eden, etc.) deploys its ORDAO (OREC executor + Respect1155 token) on its home chain
2. To participate in cross-chain governance, a spoke contract on a different chain calls the hub's OREC via `L2ToL2CrossDomainMessenger`
3. The spoke reads Respect balances from the hub without transferring tokens (preserving soulbound property)
4. Cross-chain proposals are possible - e.g., a Base-based DAO can query Optimism Respect and vote in a shared governance process
5. No traditional bridge needed; the Superchain's native messenger handles all message passing

**Technical mechanism:** The **`L2ToL2CrossDomainMessenger`** contract (deployed at a standard address on all OP Stack chains):
- Takes `_destination` (target chain ID) + `_target` (contract address on that chain)
- Emits a `SentMessage` event with nonce + sender for replay protection
- An off-chain relayer (or the application) calls `relayMessage()` on the destination chain with the same parameters
- This is trustless and low-latency compared to traditional light-client bridges

**Current deployment:** As of May 2026, ZAO (Optimism) and Eden Fractal (Base) both have live ORDAO deployments. They have NOT yet deployed cross-chain spoke contracts - the architecture is proven on paper but not production-tested at scale.

### Can ZAO (Optimism) and Eden Fractal (Base) Share Respect?

**Yes, architecturally - but with important caveats:**

**Current state (May 2026):**
- ZAO's ORDAO lives on Optimism: OREC at `0xcB05F9254765CA521F7698e61E0A6CA6456Be532` (242 txns as of May 21)
- ZAO Respect: OG ERC-20 `0x34cE89baA7E4a4B00E17F7E4C0cb97105C216957` + ZOR ERC-1155 `0x9885CCeEf7E8371Bf8d6f2413723D25917E7445c`
- Eden Fractal's ORDAO launched on Base June 5, 2025 (event #121, Epoch 2 launch). Base contract addresses NOT yet published.

**The architecture supports it:**
1. A spoke contract deployed on Base can read ZAO Respect balances from Optimism via `L2ToL2CrossDomainMessenger`
2. The spoke verifies balance without transferring tokens (preserving soulbound property)
3. Cross-chain governance proposals become possible: e.g., "ZAO members with 50+ Respect can vote on an Eden initiative"

**Status:** The spoke contracts and cross-chain integration are not yet deployed. The Superchain Interop Incubator continues development, but the primary focus remains on proving the architecture with single-chain deployments first (ZAO on Optimism, Eden on Base).

---

## 2. Cross-Chain Respect & Higher-Order Fractals

### How Can Respect Cross Chains Without Bridging?

**Three mechanisms exist, with one being canonical:**

1. **Native Superchain Interop (canonical):** `L2ToL2CrossDomainMessenger` reads Respect balances across chains without token transfer. A Base contract can query Optimism balances; the Respect stays soulbound on its home chain. This is the approved hub-and-spoke design.

2. **Spoke Emitter Contracts:** Optional light-touch contract deployed on each spoke chain that caches Respect reads from the hub (cheaper for repeated checks, requires periodic sync).

3. **Off-chain Aggregation (UX layer):** Ornode or a custom indexer reads Respect events from multiple chains and presents a unified dashboard. Doesn't affect on-chain logic, but improves frontend UX.

**Why NOT bridge Respect?** Respect tokens are soulbound by contract - they cannot be transferred even to a bridge. Attempting to bridge them would either fail or require unfrozen token versions, which destroys the anti-plutocracy property (then anyone could buy their way to influence by buying "bridged Respect").

### Higher-Order Fractals: Nested Governance

The concept (from Larimer's "More Equal Animals") describes **fractal nesting at governance scale**:

**Layer 1 - Individual Fractals**
- ZAO Fractal: 6-person breakout rooms, weekly consensus, ~40 participants
- Eden Fractal: same structure, ~40 participants
- Each runs its own weekly Respect Game

**Layer 2 - Inter-Fractal Councils**
- Representatives (highest-Respect members) from ZAO, Eden, and other fractals form a "Superchain Fractal Council"
- This council runs a weekly Respect Game on proposals affecting multiple fractals
- Example: "Should ZAO and Eden collaborate on a shared music+governance event?"

**Layer 3 - Ecosystem Governance**
- The Superchain Fractal Council's representatives feed into an even-higher-order council
- This scales to 100s of thousands of participants while keeping every governance decision a small-group conversation

**Proof of concept:** Optimism Fractal ran this model from Oct 2023 - Jan 2026:
- Judicial branch: weekly Respect Game (peer evaluation)
- Legislative branch: elected Sages Council (~6 highest-Respect members, managed via Hats Protocol)
- Executive branch: ORDAO/OREC on-chain execution
- Result: 65+ Respect holders, 60+ bi-weekly events, hundreds of successful proposals

**ZAO's current position:** Now the only active fractal on Optimism (OP Fractal paused Jan 2026). Could become the hub for a "music vertical" higher-order fractal that includes other music communities on the Superchain.

---

## 3. Hats Protocol Integration with ZAO Fractals

### Pattern: Respect Thresholds → Hat Roles → ORDAO Permissions

Hats Protocol enables **programmatic role assignment based on Respect balances**. This is the intended governance automation path for ZAO:

**Flow:**
1. Weekly Respect Game awards Fibonacci-scored ZOR tokens (110, 68, 42, 26, 16, 10 for ZAO's 2x curve)
2. Hats Protocol's **ERC1155 Eligibility Module** continuously monitors ZOR balance of `0x9885CCeEf7E8371Bf8d6f2413723D25917E7445c`
3. Members above configurable Respect thresholds automatically wear hats (role badges)
4. ORDAO checks hat roles when gating permissions (e.g., only Council Member hat wearers can submit proposals)
5. Hats revoke automatically if Respect decays below threshold

### Hats Setup for ZAO

ZAO already has a Hats tree deployed at `0x3bc1A0Ad72417f2d411118085256fC53CBdDd137` on Optimism.

**Proposed integration:**

| Hat Role | Respect Threshold | ORDAO Permission | Use Case |
|----------|------------------|-----------------|----------|
| **ZAO Member** | ZOR balance > 0 | Can vote on proposals | Anyone who earned Respect |
| **Active Contributor** | ZOR >= 100 | Can draft proposals | Recurring participants |
| **Council Member** | ZOR >= 500 | Can execute approved proposals | Governance council (3-7 people) |
| **Facilitator** | Manually assigned | Can create breakout groups | Fractal session hosts |

**Implementation checklist:**
1. Create ERC1155 Eligibility Modules in ZAO's Hats tree (3-4 modules, one per role)
2. Point each module to ZOR contract `0x9885CCeEf7E8371Bf8d6f2413723D25917E7445c`
3. Set `minBalance` parameter for each hat
4. Configure automatic revocation if balance drops below threshold
5. Update OREC to gate proposal/execute permissions by hat wearer status
6. Test with a proposal that requires "Council Member" hat

**Status (May 2026):** Integration not yet deployed. The architecture is documented and technically ready; it awaits a sprint after the OREC submission bottleneck is resolved (doc 703 rec #1).

---

## 4. Eden Fractal Epoch 2: Migration to Base (June 5, 2025)

### Timeline

| Date | Event | Status |
|------|-------|--------|
| May 2022 | Eden Fractal launches on EOS (Epoch 1) | [HISTORICAL] |
| May 2022 - June 5 2025 | Weekly meetings, 100+ events, ~10 regulars, self-funded | [COMPLETE] |
| Aug 2024 | "False start" - Epoch 2 announcement (ORDAO not ready) | [ABANDONED] |
| Nov 2024 | Optimism Fractal Council formally approves ORDAO | [MILESTONE] |
| June 5, 2025 | **Official Epoch 2 launch (event #121)** - ORDAO deployed on Base | [CURRENT] |
| Jan 2026 | Optimism Fractal pauses indefinitely, consolidates into Eden | [CONSEQUENCE] |
| May 2026 | Eden Epoch 2 running bi-weekly, ~40 active participants | [CURRENT] |

### Eden Epoch 2: Deployment Details

**Launch:** June 5, 2025 = Eden's 3-year anniversary (event #121).

**Chain:** Base (Ethereum L2, Superchain member).

**Contracts deployed on Base:** ORDAO (OREC executor + Respect1155 soulbound tokens). Specific Base contract addresses have NOT been published to github.com/James-Mart/eden-fractal-contract or edenfractal.com as of May 2026. Eden uses `edenfractal.com/epoch2-implementation-plan` as the canonical reference, which focuses on governance philosophy rather than technical addresses.

**Respect migration from EOS to Base:**
- Epoch 1 ran on EOS (Antelope chain), a non-EVM network
- There is no traditional bridge from EOS to Base (different VMs, different trust models)
- Eden implemented a **snapshot + claim mechanism**: Epoch 1 Respect balances were snapshotted at Epoch 1 close, a claim contract on Base was deployed, and Epoch 1 holders can call `claim()` to mint equivalent ERC-1155 tokens on Base
- All 77 Epoch 1 contributors were eligible to claim; 40+ have done so (as of May 2026)

**Cadence:** Bi-weekly (every other Monday, per community.config.ts references). Epoch 1 was weekly; Epoch 2 switched to bi-weekly with a focus on larger, more structured events.

**Current state (May 2026):** Season 12 running (began Jan 15 2026). ~40 active participants. 130+ total events since founding. Still the primary R&D fractal for Optimystics tools testing.

### Respect Distribution: Eden vs ZAO Scaling

| Aspect | Eden Fractal | ZAO Fractal | Note |
|--------|---|---|---|
| **Fibonacci curve** | 1x standard (55, 34, 21, 13, 8, 5) | 2x multiplied (110, 68, 42, 26, 16, 10) | ZAO moved from 1x to 2x in its second year, a yearly step so newer work weighs more than older balances (Zaal, answers of 2026-11-07); shares inside a room are the same on either curve **[corrected 2026-11-07]** |
| **Cadence** | Bi-weekly | Weekly | ZAO runs faster engagement cycle |
| **Participants per session** | 6 per breakout (multiple breakouts) | 6 per breakout (1-3 breakouts) | Eden scales to 40+; ZAO to ~20-30 per session |
| **Minting mechanism** | ORDAO via Tadas-deployed frapps.xyz instance | ORDAO via discord bot + zao.frapps.xyz | Both use ORDAO as authority; UX differs |

### Ornode & Off-Chain Indexing

Eden and ZAO each deploy (or attempt to deploy) their own ornode instance for off-chain proposal metadata storage and querying. However:
- Both use the same ornode codebase (`sim31/ordao` on GitHub)
- ZAO's ornode (`zao-ornode.frapps.xyz`) has been DOWN since ~March 2026
- Eden's ornode status unknown (not referenced in recent research)
- OREC contract is the source of truth; ornode is optional UX layer for faster reads

---

## 5. Optimism Collective Grants & ZAO Opportunities

### Documented Grants: Eden & Optimism Fractals

**Optimism Fractal (before Jan 2026 pause):**

| Grant | Details | Status |
|-------|---------|--------|
| **Optimism Grants Council Season 6** | "Optimism Fractal Respect Game: Research into Democratic Fund Distribution" | [AWARDED] |
| **Superchain Interop Incubator** | Optimystics presented Superchain ORDAO hub-and-spoke design | [ACTIVE] |
| **RetroPGF Rounds 4-7** | Optimism Fractal explored participation; amounts not disclosed | [EXPLORATORY] |

The Season 6 grant funded 6 research milestones:
1. Technical Architecture Blueprint
2. Governance Integration Strategy Document
3. Legal & Compliance Framework
4. Role-based Reward Allocation System
5. UX Design for Governance Interface
6. Gamified Interface Prototype

**Eden Fractal:** Received Optimism Foundation support for Epoch 2 launch on Base (June 5, 2025). Specific grant amount not documented, but Tadas (lead dev) was funded to deploy and maintain infrastructure.

### ZAO's Grant Positioning (May 2026)

**Why ZAO is strong for RetroPGF:**
- **Active deployment:** ORDAO live on Optimism with 242+ transactions (May 21)
- **Proven governance:** 100+ weeks of continuous Respect Game sessions
- **Unique vertical:** Only music-focused fractal in the ecosystem
- **Ecosystem diversity:** Superchain fractals are rare; ZAO is one of only two (with Eden on Base)
- **Open source:** ZAO OS components (fractals page, analytics, bot) contribute to OP ecosystem tooling
- **Public good:** Fractal governance system available for other communities to fork

**Grant tracks ZAO could pursue:**

| Track | Fit | Selling Point | Deadline |
|-------|-----|---|---|
| **RetroPGF (Onchain Builders)** | STRONG | ZAO has shipped production ORDAO contracts + Respect Games delivering measurable governance impact | Per RFP calendar |
| **Grants Council (Builders)** | STRONG | ZAO OS + fractal infrastructure are building blocks for next-gen governance DAOs | Rolling |
| **Foundation Missions** | MEDIUM | New RFPs for Superchain Interop tooling (ERC-7683, intent standards) - ZAO's cross-chain Respect vision aligns | Per RFP |
| **Superchain Interop Incubator** | STRONG | ZAO (Optimism) + Eden (Base) cross-chain collaboration is textbook interop use case | Rolling |

**Key talking points:**
- "The first and only music DAO using soulbound reputation instead of token voting"
- "Demonstrated impact: 40+ members, 100+ weeks, zero governance capture incidents"
- "Superchain native: deployed ORDAO enables other music communities to adopt fractal governance"
- "Cross-chain opportunity: ZAO (OP) + Eden (Base) can prove Superchain interop with real social impact"

**RetroPGF context (May 2026):** Optimism Collective has allocated 850M+ OP for future Retro Funding. OP/USD price ~$1.50, making a 100K OP grant meaningful ($150K USD equivalent). RetroPGF 6 should occur Q3 2026 (estimate).

### Alignment with Optimism Collective Values

| Optimism Value | ZAO Realization |
|---|---|
| **Impact = Profit** | Respect Game outputs impact scores (retroactive peer evaluation). ZAO distributes governance power based on impact, not capital. |
| **Public Goods** | ZAO OS is MIT; fractal governance system is available for any community fork. Discord bot is open-source. |
| **Superchain Vision** | ZAO (Optimism) + Eden Fractal (Base) demonstrate cross-chain coordination with native L2ToL2 messaging. |
| **Democratic Governance** | Fractal nesting allows 100s of members to participate in human-scale consensus. Soulbound Respect ensures vote buying is impossible. |
| **Credible Neutrality** | Fibonacci scoring is math-based, not discretionary. ORDAO contracts are battle-tested by Optimism Fractal (60+ events). |

---

## Also See

- [56 - ORDAO & Respect Game System](../056-ordao-respect-system/README.md) - Full mechanics of weekly consensus + Fibonacci scoring
- [58 - Respect Deep Dive](../058-respect-deep-dive/README.md) - Decay, Gini coefficient, tiers, voting mechanics
- [102 - Fractals Page: frapps, ORDAO, ZAO Integration](../102-fractals-frapps-ordao-page/README.md) - ZAO OS integration
- [103 - Fractal Governance Ecosystem](../103-fractal-governance-ecosystem/README.md) - Broader governance landscape
- [109 - Optimystics Tooling Ecosystem](../109-optimystics-tooling-ecosystem/README.md) - ORDAO/orclient/frapps details
- [114 - ZAO Fractal Live Infrastructure](../114-zao-fractal-live-infrastructure/README.md) - Current operational state
- [306 - Eden Fractal & Optimism Fractal: Complete History](../306-eden-fractal-op-fractal-deep-history/README.md) - DEEP history + people + philosophy
- [702 - Respect & Fractal Governance: The Complete Lineage](../702-respect-fractal-lineage/README.md) - Fractally -> Eden -> OP -> ZAO
- [703 - ZAO Fractal: Current State (May 2026)](../703-zao-fractal-current-state-may-2026/README.md) - Live operational audit

## Next Actions

| Action | Owner | Type | By When |
|--------|-------|------|---------|
| Evaluate Hats integration for ZAO Governance | @Zaal or Engineering | Scoping | After Doc 703 bottleneck fix |
| Research and draft RetroPGF application for ZAO | @Zaal | Funding | RFP window TBD |
| Coordinate with Eden Fractal on cross-chain spoke contracts | @Zaal + Dan SingJoy | Partnership | Q3 2026 |
| Document Superchain ORDAO pattern for other music communities to fork | @Zaal or Research | Public good | Post-Eden collaboration |

## Sources - STANDARD Tier (Verified 2026-05-21)

### Primary Web Sources (Verified)

1. **Eden Fractal - Official Website & Epoch 2 Launch** [FULL]
   - URL: https://edenfractal.com/
   - URL: https://edenfractal.com/epoch2-implementation-plan/elements-of-epoch-2/clarifying-eden-fractals-epoch-1-and-epoch-2-timeline
   - Confirms: Founded May 2022, Epoch 1 on EOS, Epoch 2 launched June 5 2025 (event #121), Base deployment, ORDAO, ~40 active participants

2. **Optimism Fractal - Official Website** [FULL]
   - URL: https://optimismfractal.com/
   - Confirms: Founded October 2023, paused indefinitely January 2026, 60+ bi-weekly events, 65+ Respect holders, consolidated into Eden

3. **Optimystics GitHub Organization** [FULL]
   - URL: https://github.com/Optimystics
   - Confirms: 16 repositories, ORDAO/OREC/frapps/Fractalgram as core tooling, GPL-3.0 / MIT licensing

4. **ORDAO Monorepo (sim31/ordao)** [FULL]
   - URL: https://github.com/sim31/ordao
   - Last commit: April 2, 2026 by Tadas (sim31)
   - Confirms: 254+ commits, OREC + orclient + ornode + frapps architecture, L2ToL2 messaging integration patterns

5. **Optimystics ORDAO Documentation** [FULL]
   - URL: https://optimystics.io/ordao
   - Confirms: ORDAO ("Optimistic Respect-based DAO"), OREC mechanics, optimistic consent-based voting, veto period with 2x weight

6. **Hats Protocol ERC1155 Eligibility** [FULL]
   - URL: https://docs.hatsprotocol.xyz/hats-integrations/eligibility-and-accountability-criteria/erc1155-eligibility
   - Confirms: ERC1155 eligibility modules support automatic hat assignment based on token balance thresholds

7. **Optimism Governance Forum - Eden Epoch 2** [FULL]
   - URL: https://gov.optimism.io/t/eden-fractal-epoch-2-implementing-fractal-decision-making-on-the-superchain/9976
   - Confirms: June 5 2025 launch, ORDAO on Base, EOS-to-Base migration, Superchain positioning

8. **Optimism Foundation - Superchain Interop Docs** [FULL]
   - URL: https://docs.optimism.io/stack/interop
   - Confirms: L2ToL2CrossDomainMessenger native interop primitive, message passing architecture

### Internal ZAO Research Sources

9. **Doc 702 - Respect & Fractal Governance: The Complete Lineage** [FULL] - verified lineage, contract addresses, people
10. **Doc 703 - ZAO Fractal: Current State (May 2026)** [FULL] - OREC 242 txns, infrastructure status, operational issues
11. **Doc 306 - Eden Fractal & Optimism Fractal: Complete History** [FULL] - detailed history, philosophy, people, technical stack
12. **Codebase: community.config.ts** [FULL] - ZAO contract addresses, Hats tree address, respect block configuration
