# Repo level-up - done

2026-08-26. Four deliverables, one commit each, nothing pushed.

| # | Deliverable | Commit |
|---|---|---|
| 1 | `README.md` as the everything-fractal front door | `fdfdea4` |
| 2 | `docs/README.md` index across the four document trees | `ae2572f` |
| 3 | `ROADMAP.md` - public-safe L0-L7 with gates | `fecda82` |
| 4 | Licensing section - MIT code / CC BY 4.0 docs | `528855b`, `1737165`, `5a2b956` |

Verified: `node scripts/verify-claims.mjs` passes at 254 expectations. Every
relative link in `README.md` and `docs/README.md` resolves. Tree clean.

---

## What each one is

**README.md.** Restructured from three directory descriptions into a front
door: a by-intent table, what a fractal is, the live facts, then one section
per tree - whitepaper, respect/, the library, data and scripts, dashboard,
frapp-gh, site - with a hook rather than a listing. Development and
contributing at the foot.

Facts are sourced by reference rather than transcribed: the table carries the
highlights, `data/summary.json` is named as the full set, and the two commands
that regenerate and re-check sit above it.

**docs/README.md.** The four document trees ordered by how settled they are -
reference and research are inputs, the whitepaper is the argument built from
them, respect/ is the only tree that proposes actions. One-line hooks written
from what each document says rather than from its title.

**ROADMAP.md.** Eight levels from today's single weekly meeting to a
member-run node network, each with a gate that is a number rather than a
milestone anyone can declare.

**Licensing.** MIT for code, CC BY 4.0 for documents, stated in `LICENSE`,
`LICENSE-DOCS`, the root README, all four document-tree READMEs, and the
assembled whitepaper's front matter.

---

## Judgement calls, in case any should be reversed

**The roadmap's current-state figures were stale and are now measured.** The
source note said "100+ week streak, ~40 active per session, a 2-wallet
bottleneck". Published as: period counter 110, mean 8.1 settled per period,
one person ranked in 14 of the last 15 sessions, 130 of 134 executions by one
wallet. Twelve roadmap figures are pinned in `verify-claims.mjs`, including
L6's arithmetic.

**L5 is restated as three problems, not one.** The source called it the
2-wallet OREC bottleneck. It is weight, operations and keys, and only the
third is fixed by a multi-sig. Publishing the original framing would have
shipped the diagnosis whitepaper ch09 had just corrected.

**Three things were cut as internal.** Ticket and PR numbers and vault
cross-links; an identity-allocation decision that has not been announced; and
an assessment of a named third-party developer's project, including a bus-factor
judgement. The conclusion that mattered survives - build at the application
level, no node required, node ownership is a later problem - without publishing
a critique of someone else's repository in our roadmap. That last one is the
call most worth a second opinion.

**The README lede changed.** It claimed the game "has run unbroken on Mondays
since around August 2024". That is the exact claim the v0.2 pass spent eighteen
commits separating from what the chain can prove, so it is gone, and the
settlement-not-attendance note points at ch08. "One of two fractals on the
Ethereum Superchain" is also out of the lede - it is a claim about other
people's communities, sourced to a May 2026 directory, and ch08 already marks
it for re-verification before each publication.

**The facilitator bench language is repeated in the roadmap.** L1 says again
that the named bench has not been contacted and has agreed to nothing. That
language is load-bearing wherever the names appear, not only in the runbook,
and `verify-claims.mjs` asserts it.

---

## Coordination

The frapp-gh section was agreed with that lane rather than written over it.
The description is theirs verbatim. So is the status line, and it is
deliberately **"built and tested end to end locally; not yet run against live
GitHub"** - Phase 1 is code-complete with 130 tests and a full replay harness,
but has never seen a real ballot. A front door is the worst place to imply
otherwise.

They confirmed the boundary: root README is mine, `frapp-gh/README.md` and
`frapp-gh/ARCHITECTURE.md` are theirs.

Two things they raised that are now in `REVIEW.md`:

- Their commit count was six, not the five I had listed. Corrected.
- **Git author does not separate the lanes.** Every commit on this branch is
  authored `zao-assistant`, whichever lane wrote it. The hash lists in
  `REVIEW.md` are the only thing that reconciles who did what, and Zaal should
  not read the author field as a boundary.
- `b2566e8` adds `.github/ISSUE_TEMPLATE/contribution.yml` at the repo root,
  outside `frapp-gh/`, so every ZAOfractal issue now gets a template chooser.
  Blank issues stay enabled. The root README's contributing section notes it.

---

## Still open

- **Nothing is pushed.** `gate_4c836a146dcd` is unresolved and Zaal reviews the
  whole branch himself. `REVIEW.md` is the entry point, with the
  name-to-wallet linkage commits flagged first.
- **`data/` is licensed by neither file**, deliberately, because it holds
  `members.json`. Stated in `LICENSE-DOCS` and the README.
- **The bot version and its 52 slash commands have no source in this repo.**
  Flagged as unsourced in the README facts table rather than presented as
  measured.
- **The 188 community roll** was last counted around May 2026.
- **"Only active fractal on Optimism"** is true per a May 2026 directory and is
  marked for re-verification before each publication.
