# Chapter 10: Roadmap

> **Draft v0.2 - revised 2026-10-10 against the rulings of 2026-09-22, 2026-09-26 and 2026-10-10 - awaiting Zaal review**

---

*ZAO Fractal is not a finished system. It is a practice that improves through iteration. The v0.1 roadmap (2026-05-25) listed dated items for June to August 2026; every date has passed and its status is recorded at the end of this chapter rather than deleted. What follows is the roadmap as ruled by Zaal in the vault's decision files, with Season 3 as its spine. Each item names its ruling, a target date, an owner and a deliverable. Dates are targets, not promises; the one hard rule is that nothing on chain and no governance code ships without an outside review and Zaal's signature.*

---

## Season 3: The ZAO's production release, 1 December 2026

Season 3 was first scoped as "the fractal season" (membership, manifesto, activation, a public points page; `bettercallzaal/zao-papers` ZIP-2, 2026-09-15). On 2026-09-26 Zaal reframed it: "its really ZIP one tbh so this is a whole new world and season 3 will but an update of everything we will be going out of beta and into full production release essentially" (zao-vault `decisions/grill-2026-09-26-zao-papers-afternoon.md`, ruling 3). The start moved from 1 November to **1 December 2026** the same day (ruling 4) and was reconfirmed on 2026-10-10: "dec 1st is best" (`decisions/grill-2026-10-09-seat-morning.md`, item 85). The first activation lands that day.

---

## By 2026-10-17: Specify the vote-weight wrapper

**Ruling:** 2026-10-10, item 78. Vote weight is OG plus ZOR, summed in whole Respect.

**Deliverable:** An amendment to ZIP-2 specifying a contract that implements `IRespect.respectOf()` as a wallet's OG balance divided by 10^18 plus its ZOR balance, installed by one passed OREC proposal calling `setRespectContract`. No redeploy of OREC; nothing minted. Until the proposal passes, OREC reads OG only (Chapter 6, Section III).

**Owner:** the zao-core lane writes the spec; Zaal sends the reviewer ask to Tadas (ORDAO) and Eden Fractal (2026-09-26 midday grill, ruling 1; the ask is drafted and unsent); Zaal signs the proposal.

**Why first:** every other governance surface (the Snapshot space, ZAO OS, the zingfisher platform) already counts OG plus ZOR. OREC is the one that does not, and it is the one that executes.

---

## Before 1 December 2026: Capture the manifesto

**Ruling:** brainstorm 2026-09-11 item 35, reconfirmed 2026-09-26 midday ruling 3 ("this week, before ZAOstock"). The session did not happen before ZAOstock on 3 October.

**Deliverable:** The manifesto text. Zaal talks for thirty minutes, the lane assembles strictly from his words, he reads it aloud and edits. Signing it is the Season 3 join (ZIP-2 section 2); it does not exist yet (ZIP-2 Open Item 1), so this gates the launch outright.

**Owner:** Zaal, with whichever lane he opens the session in.

---

## Before 1 December 2026: Repair the record, then reconcile against the chain

**Ruling:** 2026-09-26, ruling 5, and 2026-09-22 morning item 21 ("everything").

**Deliverable:** A session row for every period since 2026-04-14 (21 weeks with no rows; 18 consecutive partially scored periods; `respect_points` zero on 771 of 801 rows; ZAOOS `governance/2562-zao-fractal-state-and-build-plan`, Key Decision 4), rebuilt from Discord and session logs first, then reconciled against the chain, then minted. Chain-first was rejected because the chain cannot show a session that never reached it.

**Owner:** the fractal data work (the `season3` and `fractaldata` lanes are parked; reopening is Zaal's).

---

## After the repair: OG resumes as the one-time achievements ledger

**Ruling:** 2026-09-26, ruling 1. Zaal, verbatim: "have things like intros, have you added socials, have you voted on a proposal the zao 101 acheivements to all be OG respect kinda thre respect yuo can only get once".

**Deliverable:** OG Respect minted through OREC as custom transactions for one-time achievements: intro, socials linked, voted on a proposal, ZAO 101, video. ZOR stays the weekly game. Past OG amounts are repaired first.

**Owner:** Zaal signs; the fractal bot and the platform record.

---

## Season 3: Respect splits by project

**Ruling:** 2026-09-26, ruling 2; 2026-09-22 morning items 24 to 28.

**Deliverable:** ZAO Fractal Respect (governance, OREC) stays the only Respect that carries ZAO governance. ZAO Festivals Respect gets its own ledger for people who build the festivals (ZAOstock was the first case). WaveWarZ Respect comes later. Each lives in its own org; The ZAO dogfoods the split on its own projects first. Whether the sub-ledgers are contracts or tables is an open question for Zaal (onboarding spec Q1).

---

## Season 3: Membership, activation and roles through Hats Protocol

**Ruling:** ZIP-2 sections 1 to 6; 2026-09-22 afternoon item 18 (tree 226 is an org chart with no platform powers until Season 3 changes that deliberately).

**Deliverable:** A soulbound, immutable Manifesto Hat on tree 226 as the membership credential, claimable gaslessly through `claimHatFor`; revocation only by a passed OREC proposal; achievements, titles and roles granted as hats after a human-checked phase; the tree pruned as ZIP-2 section 6 lists (ZAO 101 folds into ZAO Fractal, ZAO Cards into ZAO Festivals, Student LOANZ dormant, Location and Community become profile attributes, ZABAL Gamez the one new branch). Activation is a rolling 90-day window read by the wrapper above, never a burn (2026-09-26 midday ruling 2).

**Owner:** the Season 3 build, once reopened; Zaal's hand on every on-chain step.

---

## Season 3: The platform

**Ruling:** 2026-09-22 morning items 12 to 19; 2026-10-10 items 79 and 83.

**Deliverable:** In the CharmVerse fork (`bettercallzaal/zingfisher`): sign in and get a ZID on the spot, a member page showing OG, ZOR and the sum, standing and voucher, fractal history mirrored from chain, and the proposals footprint; then proposal drafting, discussion and an advisory vote. Holder approval of ZIPs runs in the existing Snapshot space, which already weighs OG plus ZOR (2026-10-10 item 79); anything on chain goes through OREC. The public website at test.thezao.com is worked daily until it is ready to share (item 83).

**Owner:** the zao-core lane, PR-only; Postgres for the full app waits on the software-spend review (item 80).

---

## Still open from v0.1: the OREC signer bottleneck

Only a handful of wallets have ever submitted breakout results to OREC, and the last twelve mints came from one address (ZIP-2, Security). The v0.1 roadmap set 30 June 2026 for a committee of three or more signers; it did not ship. The v2 fractal bot has no code path to OREC at all; a human submits at zao.frapps.xyz. Whether the bot submits in Season 3 or the human path stays is a question for Zaal, written as a next action in ZAOOS `governance/2657-respect-binding-token-design`.

---

## Status of the v0.1 roadmap (2026-05-25)

Recorded, not deleted, per the rule below. "UNKNOWN" means this revision did not find evidence either way; it is not "not done".

| v0.1 item | Target | Status at 2026-10-10 |
|---|---|---|
| Restore Fractals web dashboard | 2026-06-15 | Not shipped as dated. A dashboard exists in `bettercallzaal/zao-fractal-bot` under `web/app` (public, member, admin) and is undeployed; it is Season 3's points page. |
| Publish the OG-to-ZOR reconciliation formula | 2026-06-15 | Not shipped. Superseded in shape by the 2026-09-26 record-repair ruling (Discord and session logs first). ZAOOS `governance/115-zao-data-reconciliation` holds the plan. |
| Three or more OREC signers | 2026-06-30 | Not shipped; carried above. |
| Documentation set | 2026-06-30 | UNKNOWN. |
| Restore ornode or retire it formally | 2026-07-15 | Not decided. Upstream `sim31/ordao` last commit 2026-04-02 (ZAOOS `governance/2562`, Key Decision 3). The bot reads chain directly with viem instead. |
| Decide on Frapp-GH | 2026-07-15 | UNKNOWN. |
| Pilot Cignals for music-track ranking | Q3 2026 | UNKNOWN. |
| Pilot an EFBS-equivalent | September 2026 | UNKNOWN. |
| Ship Phase 1 of Frapp-GH | 2026-08-31 | UNKNOWN; contingent on the undecided go/no-go. |

---

## Long-Term (2027 and beyond)

### ZOR Token Economy

**Scope:** Explore whether high-Respect members gain access or roles that ZOR unlocks, without ever making ZOR transferable; soulbound is core to the model. Any mechanism that moves value is Zaal's decision and a ZIP.

### ZABAL Gamez Integration

**Scope:** ZABAL Gamez is the three-month build-a-thon and the one new project branch Season 3 adds to tree 226 (ZIP-2 section 6). Whether participation earns Respect in its own ledger follows the per-project split above.

### WaveWarZ Respect

**Scope:** Ruled on 2026-09-26 (ruling 2) as a later per-project Respect: WaveWarZ Respect in its own org, after ZAO Festivals Respect has been dogfooded.

---

## How This Roadmap Works

Each item is concrete. It has a ruling behind it, a date, an owner and a measurable outcome. If a date is missed, the chapter says so and why; the v0.1 table above is that rule applied to this chapter's own first version. If an item is abandoned, it is marked deprecated and the reason is written next to it. Nothing here is deleted.

Governance is not a problem to be solved once. It is a practice. The practice improves through iteration, transparency and community feedback. This roadmap is the next three months of that practice, and Season 3 is where it lands.

---

## Sources

- zao-vault `decisions/grill-2026-09-22-seat-morning.md` (items 12 to 31), `grill-2026-09-22-seat-afternoon.md` (items 18, 19), `grill-2026-09-26-zao-papers-midday.md` (rulings 1 to 3), `grill-2026-09-26-zao-papers-afternoon.md` (rulings 1 to 6), `grill-2026-10-09-seat-morning.md` (items 78 to 85)
- `bettercallzaal/zao-papers` `zips/zip-0002-season-3.md` (ZIP-2) and its Open Items
- ZAOOS research `governance/2562-zao-fractal-state-and-build-plan`, `governance/2558-dao-periodic-reactivation-precedent`, `governance/2642-zao-holder-approval-systems-inventory`, `governance/2656-zao-core-system-map`, `governance/2657-respect-binding-token-design`, `governance/115-zao-data-reconciliation`
