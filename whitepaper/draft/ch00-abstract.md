# Abstract

Draft v0.1 - 2026-07-21

---

In most decentralized organizations, a vote is something you buy. Tokens are capital, capital is voting power, and governance drifts toward whoever holds the most. The ZAO takes the opposite position: here, a vote is something you earn.

**ZAO Fractal is The ZAO's weekly ritual for turning recognized contribution into on-chain governance.** Each week, members gather in small breakout circles, discuss what each person actually did for the community, and rank the circle. Those rankings mint **Respect** - a soulbound reputation token that cannot be bought, sold, or transferred. Respect is not a currency. It is a record of contribution, and it is your weight in how The ZAO governs itself.

Governance runs on **ORDAO**, an optimistic, Respect-weighted system deployed on Optimism. Instead of demanding majority turnout - which produces apathy at scale - ORDAO lets a proactive minority propose, gives the community a challenge window to veto, and executes if no successful challenge arrives. A proposal passes only when yes-weight exceeds twice the no-weight and clears a minimum threshold. It is consent-based, not majority-based, and every award and every vote is verifiable on-chain.

This paper documents the theory, the mechanics, and the specific story of ZAO Fractal - the longest-running fractal governance community in the ecosystem, on-chain since September 2025.

**A note on what is live versus what is designed.** This is both a specification and a manifesto. Where it describes something running today - the Respect Game, the OREC contract, the two Respect ledgers - the facts are verifiable at the addresses given in Chapter 6. Where it proposes a future property - notably a decay mechanism to keep governance weighted toward recent contribution, and a single unified Respect ledger that lets every active member vote - it is marked as a design decision, not a shipped feature. The current Respect ledgers are static and do not decay, and today only the historical ledger confers a vote. Closing that gap is the near-term work.

ZAO Fractal is not a new governance technology. It is a new governance culture: one where standing is earned in the open, and recorded where anyone can check.
