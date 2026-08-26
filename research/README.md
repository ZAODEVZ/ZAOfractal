# Deep Research

The DEEP-tier research layer for the ZAO Fractal repo. Where `/reference/` is the curated survey of the fractal-governance lineage, `/research/` is the source-heavy depth - each file is a hub doc with primary sources, frontmatter, and verdict-first sections.

## Structure

```
/research/
  README.md                              this file
  01-foundations-deep.md                 theory + math + ORDAO + comparative
  02-live-communities-deep.md            Roy/Eden/Aquadac/OF post-mortems
  03-music-cignals-deep.md               Cignals + Fractal DJ + music DAOs
  04-async-identity-deep.md              Respect.Games + Frapp-GH + identity

  whitepaper-foundations/                seven sub-docs for the whitepaper
    INDEX.md
    README.md                            the 718 dispatch hub
    01-theory-foundations.md             Larimer + sortition + academic frame
    02-respect-game-mechanism.md         Fibonacci math, decay, Sybil, Gini
    03-ordao-onchain-architecture.md     OREC three-phase cycle in code
    04-comparative-dao-governance.md     vs token-weighted, quadratic, Nouns, Moloch
    05-critiques-failure-modes.md        the honest chapter
    06-whitepaper-craft.md               document structure + voice
    07-zao-fractal-distinctness.md       ZAO's specific story

  primary-sources/                       the canonical mechanics specs
    INDEX.md
    ordao-respect-system.md              ORDAO + Respect Game system, full mechanics
    respect-deep-dive.md                 decay, Gini, tiers, voting weight

  context/                               adjacent governance frames
    INDEX.md
    superchain-ordao-crosschain.md       cross-chain fractal governance
    sociocracy-circles-small-teams.md    consent-not-consensus, role rotation
    plural-events-deliberation-toolkit.md  large-scale deliberation tools

  external/                              cross-cutting deep research
    INDEX.md
    fractal-governance-external-deep-research.md  beyond ZAO's immediate lineage

  code-walk/                             annotated walkthroughs of running code
    INDEX.md
    01-fractalbot-walkthrough.md         the Discord bot (52 commands, Python)
    02-ordao-contracts-walkthrough.md    OREC + Respect1155 Solidity + orclient SDK

  fractal-deep/                          end-to-end history of every fractal + offshoot
    INDEX.md
    01-eos-fractally-origins.md          EOS chain + Fractally protocol (both dormant)
    02-eden-fractal-full-history.md      Eden on EOS through Epoch 2 Base
    03-optimism-fractal-full-history.md  Oct 2023 launch through Jan 2026 pause
    04-optimystics-tools-survey.md       full Optimystics tool catalog with ZAO verdicts
    05-other-fractal-communities.md      Roy/Hispano/Alien Worlds/Aquadac/EOS Respect/ZEOS/Eden Korea/Upland/Upscale/Dynamics of Hegemony
    06-adjacent-governance-tooling.md    Hats Protocol, Snapshot, Pol.is, Loomio, Decidim, Consul, Sociocracy 3.0, Safe, Tally, Aragon OSx
    07-larimer-essays-academic-bibliography.md  Larimer essay archive + deeper academic bibliography (Fishkin, Landemore, Habermas, Ostrom, etc.)
```

## Top-level hub docs (01-06)

| # | File | Topic | Lines | Sources |
|---|------|-------|-------|---------|
| 01 | [01-foundations-deep.md](01-foundations-deep.md) | Larimer + sortition history + Respect Game math + Sybil defenses + ORDAO contracts + comparative DAO frameworks | ~700 | 23 |
| 02 | [02-live-communities-deep.md](02-live-communities-deep.md) | Roy Fractal at 700+ scale, Eden Fractal Epoch 2, Aquadac 12-week season, Optimism Fractal pause autopsy | ~400 | 10 |
| 03 | [03-music-cignals-deep.md](03-music-cignals-deep.md) | Cignals, Fractal DJ, music DAOs that tried peer-ranked governance, what changes if ZAO ranks tracks | ~530 | 20 |
| 04 | [04-async-identity-deep.md](04-async-identity-deep.md) | Respect.Games, Fractal Circles revival, Frapp-GH spec, identity interop landscape | ~780 | 12 |
| 05 | [05-targeted-gap-fillers.md](05-targeted-gap-fillers.md) | Targeted fills for 3 UNKNOWNs: Roy Fractal founder (Shakruz Azirof) + facilitation, Mikael/Fractal Circles dormancy, Aquadac season themes | ~600 | 21 |
| 06 | [06-frapp-gh-prd.md](06-frapp-gh-prd.md) | Full Product Requirements Document for Frapp-GH (GitHub-native async fractal) - build-ready spec, ~3-5 sprint days for Phase 1 MVP | ~1350 | 18 |

## Sub-folders

| Folder | What | When to use |
|--------|------|-------------|
| `whitepaper-foundations/` | Seven sub-docs that feed the 11-chapter ZAO Fractal Whitepaper. Each is a chapter-foundation. | Drafting the whitepaper |
| `primary-sources/` | The canonical ORDAO + Respect mechanics specs (the original DEEP docs every other doc traces back to) | Implementing or reviewing contract behavior |
| `context/` | Adjacent governance frames (Superchain cross-chain, sociocracy circles, plural events) | Writing the comparative chapter or designing sprint adaptations |
| `external/` | Cross-cutting external research, sources beyond the immediate ZAO lineage | Literature reviews, breadth checks |
| `code-walk/` | Annotated walkthroughs of the Discord bot and ORDAO Solidity contracts | Engineering onboarding, security review, fork or extension work |
| `fractal-deep/` | End-to-end history of every fractal community + the full Optimystics tool catalog | Need depth on a specific fractal (EOS, Eden, OF) or want to know which Optimystics tools to USE/PILOT/IGNORE/ABANDON |

Total in `/research/`: ~13000 lines, 420+ unique sources. Plus `/whitepaper/draft/` (Ch.1-3 first drafts, ~8200 words) - see [whitepaper/README.md](../whitepaper/README.md).

## How to navigate

- **First time here?** Read this README + the four hub docs (01-04). Then dive into `whitepaper-foundations/` if you are writing the whitepaper.
- **Writing the whitepaper?** `whitepaper-foundations/INDEX.md` maps each sub-doc to a chapter.
- **Implementing contracts?** `primary-sources/INDEX.md`.
- **Comparing fractal vs other governance models?** `context/INDEX.md` + the comparative section of `01-foundations-deep.md`.
- **Need a source we haven't cited?** `external/INDEX.md`.
- **Onboarding a new contributor?** Start them at `/reference/` for the shallow pass. Send them to `/research/` only when they need depth.

## Tier policy

Every file in this folder is DEEP-tier (per the zao-research skill): minimum 10 unique sources per doc, each classified `[FULL]` / `[PARTIAL]` / `[FAILED]`, with at least 3 specific numbers (dates, versions, percentages, addresses) per section. No "consider/might/explore" hedging language - direct verdicts only. Frontmatter on every file. No fabrication - unknown facts marked UNKNOWN.

Re-validate every 4-6 weeks. APIs, contract addresses, and community participation counts churn fast.

## Source provenance

External claims are sourced to primary URLs (Larimer's books, official websites, Medium articles, GitHub repos, governance forums, academic papers). ZAO-internal claims (contract addresses, OREC transaction counts, bot version history, weekly cadence) draw from the ZAO OS V1 research library and on-chain data.

The sub-folders (`whitepaper-foundations/`, `primary-sources/`, `context/`, `external/`) are imported verbatim from the ZAO OS V1 research library (docs 056, 058, 184, 497, 657, 705, 718a-g). They retain their original cross-references to ZAO research doc numbers - follow the trail in the source repo for full lineage.

---

## License

The documents in this directory are licensed **CC BY 4.0** - share and adapt
with attribution. See [LICENSE-DOCS](../LICENSE-DOCS). Code in this repository (`scripts/`,
`dao/`, `site/`) is MIT; see [LICENSE](../LICENSE). Copyright (c) 2026 Zaal Panthaki /
BCZ Strategies LLC / The ZAO.

CC BY 4.0 covers ZAO's own writing, not the third-party sources these documents
cite, and not `data/`. LICENSE-DOCS states both limits and a note on the real
people these documents name.
