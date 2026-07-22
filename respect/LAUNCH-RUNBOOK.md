# New Respect Token - Launch Runbook

The complete, ordered plan to launch the new $ZAO Respect token, with what each step needs and who does it. This exists so the launch is fully prepped and nothing is improvised. NOTHING here executes until a deliberate go - this is the readiness document, not a trigger.

Approach (decided): one new soulbound Respect token that is both reward and vote; keep the existing OREC (no fork); point OREC at the new token via one governance proposal after a 4-week parallel proof.

Legend: [DONE] built/verified - [READY] specified, needs an input to run - [BLOCKED] waiting on a named input - [GO] requires an explicit human decision to execute.

---

## Phase 0 - Off-chain readiness (this phase)

- [DONE] Verify the current on-chain state (OG/ZOR/OREC) - see the audit doc.
- [DONE] Design spec for the new token + migration.
- [DONE] Build `ZAORespect` (soulbound ERC-20, IRespect, minter-gated) - tested, Slither-clean, reviewed.
- [DONE] Build the deploy + seed + role-handoff script (deployer renounces all; multisig gets admin).
- [DONE] Build the seed pipeline (fractal scores -> genesis allocation), tested on sample data.
- [DONE] Prove the full flow on a local chain.
- [ ] [READY] Add `award(to, amount, reason)` + `Awarded` event (distribution with a recorded reason). Small, testable. Owner: build agent.
- [ ] [BLOCKED] Clean the whitepaper open flags (decay claim, gas figures, fractal numbering) and align the bot knowledge base wording (thirdweb transfer-restriction, not a hardcoded revert).
- [ ] [GO] Confirm the genesis allocation rule: lifetime Respect = sum of `fractal_scores.score` per member; does that export already include the ZOR era, or is ZOR added 1:1 separately? (Owner: Zaal.)

## Phase 1 - Genesis data (produces the real seed)

- [ ] [BLOCKED] Export the three ZAOOS tables: `respect_members`, `fractal_sessions`, `fractal_scores` (or grant read access). This is the single hard blocker for a real seed. (Owner: Zaal.)
- [ ] [READY] Run the seed pipeline on the real export -> `seed.json` (recipients + amounts) + `seed-report.json` (per-member trace, excluded no-wallet members).
- [ ] [GO] Zaal reviews the full allocation against the source and signs off. Every number traces to a fractal_scores row. Fix any wrong amounts here, before minting.
- [ ] Decide how members with no wallet on file get one (they are excluded from genesis until they register a wallet).

## Phase 2 - Contracts finalisation (still off-chain)

- [ ] [GO] Choose the `FINAL_ADMIN` - a multisig or governance contract, never a personal EOA. (Owner: Zaal.)
- [ ] [GO] Decide the per-voter weight cap: keep uncapped (matches today) or set a real `_maxVoteWeight`. If capping, it is a token/config choice to lock before deploy.
- [ ] [GO] Commission the audit: Slither + Foundry invariants + Echidna are done in-house; a paid manual review (OpenZeppelin / Spearbit / Code4rena / Nethermind) before mainnet. Budget + firm. (Owner: Zaal.)
- [ ] Push `zaofractal-contracts` to GitHub (currently local only) so the audit + review have a source.

## Phase 3 - Testnet (first live test, OP Sepolia)

- [ ] [GO] Provide a funded testnet deployer key (a throwaway wallet + OP Sepolia ETH from a faucet).
- [ ] Deploy `ZAORespect` to OP Sepolia via the deploy script with the real seed + a test OREC + a test admin.
- [ ] Verify on the explorer: balances match the allocation, roles wired (OREC minter, deployer renounced, multisig admin).
- [ ] Run a mock fractal: mint an award with a reason, then cast a vote through a test OREC pointed at the token - confirm governance reads the new balances.
- [ ] This is the first thing Zaal can click through and test.

## Phase 4 - Mainnet shadow + 4-week parallel run

- [ ] [GO] Deploy to Optimism mainnet (audited build). Genesis-mint the corrected balances. Nothing changes for governance yet - the live OREC still reads the old OG.
- [ ] For 4 weeks, submit each weekly fractal result to BOTH the old and new systems.
- [ ] Publish a weekly diff: same rankings -> same mints -> same vote outcomes. Investigate any divergence before proceeding.

## Phase 5 - Cutover (the actual launch)

- [ ] After 4 clean weeks: a governance proposal on the existing OREC calls `setRespectContract(newToken)`. The community votes it through. This is the launch - it is a governance act, not a unilateral flip.
- [ ] Announce: the page + docs + a member explainer go live pointing at the new contract.
- [ ] Old OG + ZOR remain as the historical record.

---

## Who needs to do what (the short list for Zaal)

1. Confirm the allocation rule (Phase 0).
2. Export the three ZAOOS tables (Phase 1) - the main blocker.
3. Name the `FINAL_ADMIN` multisig (Phase 2).
4. Commission the audit (Phase 2).
5. Provide a testnet key when ready to test (Phase 3).

Everything else is built or specified. Hand me items 1-2 and I can get to a testnet test (Phase 3) quickly; items 3-4 gate mainnet.
