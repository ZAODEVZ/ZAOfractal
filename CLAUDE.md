# ZAOfractal — Codebase Guide

ZAO Fractal is a music-focused fractal democracy DAO running weekly Respect Games on Optimism OP Mainnet since August 2024. This repo holds the docs site, research archive, whitepaper, and DAO frontend.

## Repo Layout

```
/
├── site/          Astro 5 docs site → zaofractal.vercel.app
├── dao/           React + Vite DAO frontend → zao.frapps.xyz
├── reference/     16 shallow-survey markdown docs (content collection)
├── research/      38 deep-research markdown docs (content collection)
├── whitepaper/    11-chapter governance whitepaper (content collection)
├── RESOURCES.md   Master index: people, orgs, contracts, tools, papers
└── vercel.json    Deploys site/ to Vercel
```

## Development

```bash
# Docs site (http://localhost:4321)
cd site && npm install && npm run dev

# DAO frontend (http://localhost:5173)
cd dao && npm install && npm run dev
```

## Adding Content

All markdown under `reference/`, `research/`, `whitepaper/` is auto-indexed by Astro content collections and included in Pagefind search. Front matter fields that matter:

```yaml
---
title: "Required"
topic: "optional"      # for research/
tier: "deep"           # or survey / primary
status: "draft"        # or published / archived
date: 2025-01-01
---
```

Files under `research/` are organized in sub-folders. The Astro glob picks them all up recursively.

## Key Contracts (OP Mainnet, chain ID 10)

| Name | Address |
|------|---------|
| OREC | `0xcB05F9254765CA521F7698e61E0A6CA6456Be532` |
| ZOR Respect (ERC-1155) | `0x9885CCeEf7E8371Bf8d6f2413723D25917E7445c` |
| OG Respect (ERC-20) | `0x34cE89baA7E4a4B00E17F7E4C0cb97105C216957` |
| Hats | `0x3bc1A0Ad72417f2d411118085256fC53CBdDd137` |

Ornode API: `https://zao-ornode.frapps.xyz`
Frapps UI: `https://zao.frapps.xyz`

## Respect Game

Every Monday 6pm EST. 6-person breakout rooms. Rank peers 1-6; bottom rank gets 0. ZAO uses 2× Fibonacci: `110, 68, 42, 26, 16, 10`.

OREC pass condition: `noWeight * 2 < yesWeight && yesWeight >= minWeight` (2/3 supermajority, 1/3 veto).

## site/ Architecture

- `astro.config.mjs` — integrations: sitemap, pagefind; 3 rehype plugins
- `src/plugins/` — `rehypeExternalLinks`, `rehypeContractAddresses`, `rehypeCopyButton`
- `src/styles/global.css` — full design system (CSS vars: `--orange #E55611`, `--cyan #5B86A8`, `--gold #D4A23A`)
- `src/pages/` — static pages + `[...slug].astro` dynamic routes per collection
- `content.config.ts` — globs content from `../reference/`, `../research/`, `../whitepaper/`

## dao/ Architecture

- `src/lib/constants.ts` — contract addresses, ORNODE_URL, ZAO_FIBONACCI, KNOWN_MEMBERS map
- `src/lib/format.ts` — shortAddr, formatRespect, formatDate, explorerLink
- `src/App.tsx` — shell: Topbar + TabNav + StatsBar + tab routing
- `src/pages/` — LeaderboardTab, ProposalsTab, AboutTab (each fetches from ornode with demo fallback)
- `src/styles.css` — dark design system matching docs site

**To add wallet names:** edit `KNOWN_MEMBERS` in `src/lib/constants.ts`:
```ts
export const KNOWN_MEMBERS: Record<string, string> = {
  '0xYourAddress': 'Your Name',
};
```

## Deployment

- **site/**: `vercel.json` at root handles it. Push to main → auto-deploy.
- **dao/**: `dao/vercel.json` — set up a separate Vercel project pointing root to `dao/`.

## Branch Convention

Feature branch: `claude/trusting-goldberg-ETwme` — all current work lives here, not yet merged to main.
