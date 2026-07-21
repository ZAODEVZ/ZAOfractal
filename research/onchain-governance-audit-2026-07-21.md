# On-Chain Governance Audit - 2026-07-21

A verification pass on ZAO Fractal's live on-chain state (Optimism mainnet), and the resulting technical-accuracy corrections to the whitepaper. Everything below marked "read on-chain" was queried directly against Optimism; everything marked "per doc" is sourced from the ORDAO code-walk or reference docs and has NOT been independently re-verified on-chain.

## Important caveat: generic OREC vs ZAO-specific rules

The reference and code-walk docs describe the **generic Optimystics OREC contract** shared across the fractal ecosystem (Eden Fractal, Optimism Fractal, ZAO). Their parameter values (voting/veto window lengths, minimum thresholds, "vetoes carry 2x weight") are **OREC defaults or Eden-era illustrations, not confirmed ZAO rules.** ZAO has historically been fluid with its own parameters. Any specific ZAO value should be read from ZAO's live OREC contract or confirmed by the operators - not assumed from an ecosystem survey. This audit only asserts as ZAO-fact the items it read directly on-chain.

## Verified on-chain (Optimism mainnet)

| Fact | Value | Method |
|------|-------|--------|
| OG Respect | `0x34cE89baA7E4a4B00E17F7E4C0cb97105C216957`, ERC-20, 18 decimals, name "ZAO RESPECT TOKEN", symbol "ZAO" | read on-chain (`decimals`, `name`, `symbol`) |
| OG total supply | 38,484 | read on-chain (`totalSupply` / 1e18) |
| OG owner() | reverts (no Ownable owner - legacy/immutable) | read on-chain |
| ZOR Respect | `0x9885CCeEf7E8371Bf8d6f2413723D25917E7445c`, ERC-1155, token id 0 | read on-chain |
| ZOR owner() | `0xcB05...Be532` = the OREC executor | read on-chain |
| ZOR admin interface | not IAccessControl (Ownable, not role-based) | read on-chain (`supportsInterface`) |
| OREC executor | `0xcB05F9254765CA521F7698e61E0A6CA6456Be532`, 12,954 bytes, `owner()` returns itself (self-administered) | read on-chain (`eth_getCode`, `owner`) |

Conclusion: **OREC is the sole minter of ZOR** (ZOR.owner == OREC), and OREC is self-owned, so no human key can mint Respect directly - awards can only originate from a passed OREC proposal.

### Live member weights (spot sample, read on-chain)

Using the app's own formula `weight = round(OG/1e18 + ZOR_raw)`:

| Member | OG | ZOR | Weight |
|--------|---:|----:|-------:|
| Zaal | 3094 | 656 | 3750 |
| Ohnahji | 1265 | 434 | 1699 |
| Meta Mu | 825 | 652 | 1477 |
| Jose | 600 | 540 | 1140 |
| Santana | 0 | 304 | 304 |
| jdwalka | 0 | 68 | 68 |

## The vote-weight finding (per code-walk, consistent with the chain)

The ORDAO code-walk states OREC reads the **OG ledger only** for vote weight (`respect_contract` = OG address), and that OG has been **frozen since 18 December 2025** while ZOR is the active weekly-minted reward ledger. Implication: a member holding only ZOR (joined after the freeze - e.g. the two 0-OG rows above) has **no on-chain voting weight**, however much ZOR they earn.

Note the product/spec gap: the dashboard's `computeRespectWeight` sums OG + ZOR and presents it as "weight," but on-chain governance counts OG only. The displayed number is lifetime Respect, not voting power. Reconciling these two meanings is an open item (and affects the dashboard cleanup work).

## Whitepaper accuracy pass (this session)

Corrections applied to `whitepaper/draft/` (grounded in the above):

- **ch06** - vote weight corrected to OG-only (was "OG + ZOR"); added the honest consequence for ZOR-only members.
- **ch06** - veto framing softened: blocking power is the passing threshold (`YES > 2x NO`), not a literal per-vote multiplier; flagged that ZAO's parameters are its own and fluid, to be read from the live contract.
- **ch06** - OG freeze attributed to late 2025 (18 Dec per code-walk), total supply read on-chain.
- **ch06** - live OREC instances corrected to ZAO (Optimism) + Eden Fractal (Base); removed the incorrect "Fractally" (EOS, pre-OREC) claim.
- **ch09** - the two-ledger section was stated backwards (claimed only ZOR counts and early members are disadvantaged); corrected to OG-only, with newer/ZOR members disadvantaged.

## Open flags for operator/author decision (NOT edited)

1. **ch04 decay** - claims Respect decays to ~0 after ~230 weeks of inactivity, but also says OG holders keep full weight forever; on-chain OG is frozen/static with no decay mechanism. Real planned feature, or Fractally-inheritance prose to cut?
2. ~~**ch06 minThreshold**~~ RESOLVED by live OREC read: `minWeight` = 1,000 Respect (1000e18), `voteLen` = `vetoLen` = 259,200s (72h), `respectContract` = OG. The config table was right; line 61's "~10% / 3,800-4,000" was wrong. ch06 corrected.
3. **ch06 gas** - line 33 (0.02-0.05 USD/vote) vs line 176 (0.001-0.003). 10x apart.
4. **Fractal numbering/dates** - OG "fractals 1-73 through Sep 2025" but froze Dec 2025; ZOR "74+ from Sep 2025". 3-month overlap unexplained.
5. **App-vs-chain weight** - dashboard OG+ZOR vs governance OG-only (see above).

## Tooling notes

- Live point reads (balanceOf, decimals, owner) via public Optimism RPC: work.
- Historical event scans: public RPC caps `eth_getLogs` range; Dune MCP has no interactive execution tier on this account. Full award-ledger reconstruction needs an Alchemy key or a Dune tier.
- ZAOOS Supabase (`respect_members`, `wallets`) and the ORDAO tokens Airtable were not reachable from this session.
