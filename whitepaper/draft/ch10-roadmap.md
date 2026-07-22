# Chapter 10: Roadmap

> **Draft v0.1 - 2026-05-25 - awaiting Zaal review**

---

*ZAO Fractal is not a finished system. It is a practice that improves through iteration. The following roadmap is concrete: target dates, accountable owners, measurable outcomes. Each item addresses a limitation from Chapter 9 or an opportunity from Chapter 8.*

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

## June 30, 2026: Establish 3+ Signer Committee for OREC

**Target date:** June 30, 2026

**Deliverable:** Multi-sig authorization for OREC contract submission. Propose and implement a 3-of-5 multi-sig (or equivalent) that controls ORDAO execution on-chain.

**Process:**
1. ZAO council nominates 5 candidates (zaal + 4 others from the community)
2. Fractal 120+ votes on the 5 nominees (simple majority)
3. If approved, transfer OREC contract admin to the 3-of-5 multi-sig
4. Test the multi-sig by submitting results from a Fractal through the new mechanism

**Owner:** ZAO Governance + Zaal

**Rationale:** Centralized submission (zaal + civilmonkey.eth only) is a single-person failure mode. A multi-sig distributes trust and makes the system more resilient. It also demonstrates to the community that decentralization is real, not aspirational.

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

**Decision point:** ornode (an indexing service for ORDAO events) is currently DOWN. Restore it or retire it in favor of direct contract reads.

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

**Word count: 1,256**
