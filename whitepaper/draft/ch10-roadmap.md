# Chapter 10: Roadmap

> **Draft v0.2 - 2026-08-26 - accuracy pass against the committed chain snapshot**

---

*ZAO Fractal is not a finished system. It is a practice that improves through iteration. The following roadmap is concrete: target dates, accountable owners, measurable outcomes. Each item addresses a limitation from Chapter 9 or an opportunity from Chapter 8.*

---

## Status as of 2026-08-26

This roadmap was written in May 2026 with target dates through August. Those
dates have passed. Publishing a roadmap whose deadlines are in the reader's
past, without saying what happened, is how a roadmap becomes decoration - so
here is the state of each item, before the items themselves.

| Item | Target | Status as of 2026-08-26 |
|---|---|---|
| Restore fractals web dashboard | Jun 15 | **Partly done, elsewhere.** A dashboard exists in this repo (`dao/`) reading a committed on-chain snapshot rather than a live indexer. Not deployed at zaoos.com. |
| Publish OG-to-ZOR reconciliation formula | Jun 15 | **Measured, not decided.** `respect/LEDGER-RECONCILIATION.md` costs out the options against real balances and names the open calls. No formula is adopted, and the decision is one person's to make. |
| Establish 3+ signer committee for OREC | Jun 30 | **Superseded - see the rewritten item below.** The deliverable as written cannot be built. |
| Ship documentation set | Jun 30 | **Partly done.** The whitepaper is complete and this accuracy pass is what you are reading; the operational runbooks now exist under `respect/`. Not published externally. |
| Restore ornode or retire it | Jul 15 | **Decided by circumstance.** ornode is down and the dashboard was rewritten on 2026-08-25 to read a committed snapshot instead. The retirement is real; the formal notice has not been given. |
| Frapp-GH go/no-go | Jul 15 | **Not decided.** |
| Cignals pilot, EFBS pilot, Frapp-GH phase 1 | Q3 / Aug 31 | **Not started.** |

Two of these were overtaken by measurement rather than by work: the ledger
question turned out to be bigger than a conversion formula (Chapter 4), and
the signer committee turned out to be the wrong fix for the wrong mechanism
(Chapter 9). The dates below are left as written, because a roadmap that
silently rewrites its own history is worth less than one that missed.

---

## June 15, 2026: Restore Fractals Web Dashboard

**Target date:** June 15, 2026

**Deliverable:** A public leaderboard and session history dashboard at zaoos.com, replacing the deleted zao-fractal.vercel.app.

**Scope:**
- List all Fractals (session numbers, dates, participants)
- Leaderboard: Top 20 members by accumulated Respect (ZOR only, unless OG-to-ZOR reconciliation is ready)
- Session detail page: See all rankings from a specific Fractal, drill down to individual scores
- Read-only (no wallet required)
- HTTPS, hosted on Vercel or Netlify

**Owner:** ZAO Engineering (role to be assigned)

**Rationale:** The on-chain history is immutable but inaccessible. Members cannot verify their own Respect without trusting the Discord bot. A public dashboard earns trust and makes governance visible.

---

## June 15, 2026: Publish OG-to-ZOR Ledger Reconciliation Formula

**Target date:** June 15, 2026

**Deliverable:** A public document explaining the exact formula for reconciling OG Respect (ERC-20, frozen Dec 2025) into ZOR Respect (ERC-1155, live). Includes:
- The snapshot date (Dec 2025)
- The conversion ratio (1 OG = X ZOR, if applicable)
- The claim mechanism (how to retroactively mint ZOR for earned OG)
- A worked example (Alice earned 200 OG in Fractals 1-60, here is her ZOR balance)

**Owner:** ZAO Governance + Tadas Vaitiekunas (Optimystics)

**Rationale:** Early members should not have a permanent on-chain disadvantage. A transparent formula allows historical reconciliation and prevents the two-ledger system from becoming a source of mistrust.

---

## June 30, 2026: Establish 3+ Signer Committee for OREC - **superseded**

**Target date:** June 30, 2026. **Status:** cannot be built as specified.

**Why it is superseded.** The deliverable was "transfer OREC contract admin to a 3-of-5 multi-sig". OREC's owner is OREC itself, and every privileged setter is `onlyOwner`, so there is no admin to transfer; and `propose`, `vote` and `execute` are already open to anyone, so there is no submission permission to distribute. Chapter 9 works through the measurement. A multi-sig over OREC would grant nobody anything they do not already have.

**What replaces it,** as three separate items rather than one:

**10a. Relinquish or split the OG admin role.** This is the only genuinely permissioned capability in the stack: `DEFAULT_ADMIN_ROLE` on the OG Respect contract has exactly one member and can mint vote weight at will. A multi-sig *here* would do real work, and so would renouncing the role outright once the ledger question is settled. **Owner:** Zaal. **Blocker:** relinquishing before migration would freeze the genesis allocation, so this is sequenced after 10b, not before.

**10b. Unify the ledgers so vote weight tracks current contribution.** The weight bottleneck - 12 addresses able to clear the minimum, one showing up - is a governance problem, not a key problem, and 47 of 70 ZOR recipients having no vote is what makes it urgent. `respect/LEDGER-RECONCILIATION.md` holds the costed options. **Owner:** Zaal, then a proposal.

**10c. Recruit executors and facilitators.** Execution is permissionless, unpaid, and done by one person 130 times out of 134; facilitation shows the same shape. Both are solved by people agreeing to do a job, not by contracts. `respect/EXECUTION-RUNBOOK.md` and `respect/FACILITATION-RUNBOOK.md` hold the run sheets and the gates. **Owner:** ZAO Governance.

---

## June 30, 2026: Ship Documentation Set

**Target date:** June 30, 2026

**Deliverables:**
1. **ZAO Fractal Constitution** - The rules ZAO operates under, written down. Includes: voting criteria, quorum rules, Fibonacci curve, removal procedures, amendment process.
2. **Onboarding Guide** - Step-by-step: join Discord, attend your first Fractal, submit a ranking, understand your Respect score.
3. **Video Tutorial** - 5-7 minute walkthrough of the Respect Game cycle (Monday open, breakout ranking, Sunday results). Aimed at non-technical members.
4. **FAQ** - 20-30 common questions answered.
5. **This whitepaper** - Finalized with community feedback.

**Owner:** Zaal + Tanja (operations) + volunteer community members

**Rationale:** Documentation was identified as the #1 onboarding blocker (Tanja, May 18 2026). Non-technical members cannot explain ZAO Fractal to peers. The documentation set makes the system reproducible and explainable. Other music communities should be able to fork ZAO's governance and adapt it.

---

## July 15, 2026: Restore ornode or Retire It Formally

**Target date:** July 15, 2026

**Decision point:** ornode (an indexing service for ORDAO events) is DOWN. Restore it or retire it in favor of direct contract reads.

**Update, 2026-08-26:** effectively retired. The dashboard in `dao/` was rewritten on 2026-08-25 to read a committed on-chain snapshot produced by `scripts/pull-data.mjs`, which reconciles both ledgers to zero residual and needs no indexer at all. That is Option B without the subgraph. What is outstanding from this item is only the formal deprecation notice.

**Option A (Restore):**
- Debug the indexing service (likely infrastructure issue)
- Redeploy to Vercel or AWS
- Test with historical Fractals data

**Option B (Retire):**
- Formal deprecation notice to community
- Build direct The Graph subgraph for OREC contract (query on-chain Respect directly)
- Update zaoos.com dashboard to use The Graph instead of ornode

**Owner:** ZAO Engineering

**Rationale:** Indexing is critical for usability. Members should not have to wait for blockchain confirmation or know Solidity to query their Respect. By July 15, we decide: is ornode revivable, or is it dead? If dead, we commit to The Graph subgraph instead. No more single-point-of-failure.

---

## July 15, 2026: Decide on Frapp-GH (GitHub-Native Async Fractal)

**Target date:** July 15, 2026

**Deliverable:** A formal go/no-go decision on building Frapp-GH (Chapter 06 PRD: GitHub-native async fractal governance).

**Decision criteria:**
- Is there demand from ZAO members for async participation? (Survey)
- Is GitHub a viable platform for ZAO governance? (Pilot with 5 early adopters)
- Can we ship Phase 1 (async ranking, no on-chain) in 2-3 sprints? (Scope review with engineering)

**If go:**
- Assign engineering lead (role to be filled)
- Commit to Phase 1 MVP by August 31 (see below)

**If no-go:**
- Commit to Respect.Games (Optimystics beta) pilot instead (timeline to be determined by the council)

**Owner:** Zaal + ZAO Engineering + Tadas Vaitiekunas (advisory)

**Rationale:** Async governance is a known gap (timezone friction, APAC/EU exclusion). Two tools exist: Frapp-GH (GitHub-native, GitHub-based tooling) and Respect.Games (web-app, generic). By July 15, we decide which path. This decision cascades to Q3 planning.

---

## Q3 2026: Pilot Cignals for Music-Track Ranking

**Target date:** July 2026 or later (provisional)

**Deliverable:** A single ZAO Fractal session using Cignals (Optimystics' live-meeting competition app) instead of standard Respect Game ranking.

**Setup:**
1. Contact Tadas Vaitiekunas (@sim31) to discuss Cignals integration
2. Propose a ZAO Fractal session (date to be confirmed) where members rank music tracks instead of peers
3. Submit results on-chain to OREC, distributing Respect based on track ranking

**Measurement:** Track engagement + satisfaction vs. standard Respect Game sessions. Decide: is Cignals a regular tool for ZAO, or one-off experiment?

**Owner:** Zaal + Tadas Vaitiekunas

**Rationale:** Cignals is designed for pairwise-comparison ranking and has a music variant (DJ sets). ZAO is music-focused. This pilot tests whether competitive music ranking is more engaging than peer-contribution ranking for music governance decisions.

---

## Q3 2026: Pilot EFBS-Equivalent (Eden Fractal Brainstorming Session)

**Target date:** September 2026 (provisional)

**Deliverable:** A bi-weekly meta-meeting (separate from weekly Fractals) where the ZAO council + volunteers discuss governance improvements, roadmap priorities, and strategic direction.

**Format:**
- 60 minutes, Zoom (or Discord voice)
- Bi-weekly (other Monday from the Fractal call, or alternate week)
- Open to any member with sufficient Respect to attend (a threshold the community sets)
- Agenda: State of ZAO, upcoming challenges, community feedback, proposals for change

**Reference:** Eden Fractal has a Town Hall that serves this purpose. ZAO should experiment with an equivalent.

**Owner:** Zaal + ZAO Council

**Rationale:** ZAO Fractal is weekly governance (peer ranking). But strategic decisions (should we change voting criteria? should we migrate chains?) require deliberation that does not fit in the breakout-room format. An EFBS gives the community a space to think out loud, propose changes, and build consensus before a formal vote.

---

## August 31, 2026: Ship Phase 1 of Frapp-GH (If Approved)

**Target date:** August 31, 2026 (contingent on July 15 go/no-go decision)

**Deliverable:** A production-ready MVP of Frapp-GH with:
- GitHub Issues (labeled `week-N-contribution`) for async contribution submission
- Projects board (v2) for voting interface (drag-and-drop rank)
- Automated Respect calculation (2x Fibonacci)
- Weekly cron (Monday open, Saturday snapshot, Sunday tally)
- Results posted to Discussion thread
- Public read-only leaderboard (GitHub Pages or Vercel)
- TypeScript + Hono backend on Vercel serverless

**Testing:** Pilot with 10-20 ZAO members for 2-3 weeks before launch.

**Owner:** ZAO Engineering + Tadas Vaitiekunas (advisory)

**Rationale:** Async participation has been a blocker for APAC and EU members. GitHub-native governance brings the Respect Game into the platform where open-source work lives, making contribution more verifiable and less visibility-biased.

---

## Long-Term (Q4 2026 and Beyond)

### ZOR Token Economy

**Scope:** Explore whether ZOR Respect can be upgraded into a light liquidity pool or DAO treasury allocation mechanism. Do not make ZOR transferable (soulbound is core to the model). But could high-Respect members have special access to treasury grants or voting power on capital allocation?

**Timeline:** Post-roadmap (Q4 2026), pending community appetite.

---

### ZABAL Games Integration

**Scope:** ZABAL Games is a community-run competition platform. Could ZAO Fractal award Respect for winning or participating in ZABAL Games? Could ZABAL Games prize distribution be governed by ZAO Fractal?

**Timeline:** Dependent on ZABAL Games roadmap and Zaal's bandwidth.

---

### WaveWarZ Respect-Weighted Prediction Markets

**Scope:** WaveWarZ is a music prediction game. Could Respect holders get early access or special roles in WaveWarZ markets? Could WaveWarZ outcomes (e.g., "This artist will perform at Coachella") award Respect to successful predictors?

**Timeline:** Dependent on WaveWarZ development.

---

## How This Roadmap Works

Each item is concrete. It has a date, an owner, and a measurable outcome. If we miss a date, we ask why and adjust. If we decide to abandon an item, we mark it deprecated and explain why.

This roadmap is not a vision statement. It is a to-do list. It is the work required to address Chapter 9's limitations and realize Chapter 8's distinctiveness at scale.

Governance is not a problem to be solved once. It is a practice. The practice improves through iteration, transparency, and community feedback. This roadmap is the next 6 months of that practice.

---

## Sources

- **06-frapp-gh-prd.md** (GitHub-native async fractal MVP, Phase 1 scope, architecture)
- **04-optimystics-tools-survey.md** (Cignals music-ranking pilot, Respect.Games async alternative, ORDAO/OREC production status)
- **05-critiques-failure-modes.md** (Documentation gap, infrastructure single-point-of-failure, participation durability risks)
- **07-zao-fractal-distinctness.md** (OREC 2-wallet bottleneck, ornode status, leaderboard restoration, two-ledger reconciliation)
- **02-live-communities-deep.md** (Eden EFBS equivalent pattern, seasonal rhythm model from Aquadac)

---

**Word count: 2,121**
