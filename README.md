# ZAOfractal

**Live site: [zaofractal.vercel.app](https://zaofractal.vercel.app)** (canonical domain `fractal.thezao.com` pending DNS).

Home of **ZAO Fractal** - the weekly Respect Game that has run unbroken on Mondays at 6pm EST since around August 2024. It is the only music-focused fractal in existence, the only active fractal on Optimism, and one of two on the Ethereum Superchain.

## What is a fractal?

A fractal is a small-group consensus meeting that distributes a soulbound reputation token (Respect) to participants based on how their peers rank their recent contribution. Repeat weekly. Governance weight comes from contribution, not capital.

The idea was formalized by Daniel Larimer in *More Equal Animals* (Feb 20, 2021) and the Fractally protocol (Jan 28, 2022). Eden Fractal proved it could run for years. Optimism Fractal brought it to Ethereum. ZAO Fractal is the first to apply it to music.

## Repo layout

```
ZAOfractal/
  README.md                  - this file
  reference/                 - shallow survey: every fractal that has ever existed
                               (Larimer, Fractally, Eden, Optimism, Roy, Aquadac, etc.)
                               16 files, ~1300 lines. Start here.
  research/                  - DEEP-tier: 6 hub docs + 4 sub-folders
                               (whitepaper-foundations/, primary-sources/,
                                context/, external/, code-walk/)
                               25+ files, ~10500 lines, 320+ unique sources.
  whitepaper/                - The magnum opus governance document
                               draft/ contains the complete v0.1: abstract +
                               11 chapters, 28,529 words, accuracy pass 2026-07-21.
```

Start at [reference/README.md](reference/README.md) for the survey. Move to [research/README.md](research/README.md) when you need depth. The [whitepaper/README.md](whitepaper/README.md) tracks magnum-opus progress.

## Live ZAO Fractal facts (as of May 2026)

| Fact | Value |
|------|-------|
| Cadence | Mondays 6pm EST, weekly. Also runs anytime with 4+ unplayed members. |
| Streak | 100+ continuous weeks |
| Surface | Discord bot `fractalbotmarch2026` (52 slash commands, v2.1, March 28 2026) |
| Chain | Optimism (OP Mainnet) |
| OREC executor | `0xcB05F9254765CA521F7698e61E0A6CA6456Be532` |
| OG Respect (ERC-20, fractals 1-73) | `0x34cE89baA7E4a4B00E17F7E4C0cb97105C216957` |
| ZOR Respect (ERC-1155, fractals 74+) | `0x9885CCeEf7E8371Bf8d6f2413723D25917E7445c` |
| Submission UI | `zao.frapps.xyz/submitBreakout` |
| OREC transactions | 242+ as of May 21, 2026 |

Operational docs that already exist:

- The whitepaper itself (complete v0.1, all 11 chapters + abstract) - [whitepaper/draft/](whitepaper/draft/)
- The bot internals walkthrough - [research/code-walk/01-fractalbot-walkthrough.md](research/code-walk/01-fractalbot-walkthrough.md)
- The ORDAO Solidity walkthrough - [research/code-walk/02-ordao-contracts-walkthrough.md](research/code-walk/02-ordao-contracts-walkthrough.md)
- Frapp-GH (async GitHub-native fractal) full PRD, build-ready - [research/06-frapp-gh-prd.md](research/06-frapp-gh-prd.md)

Still to come: dashboard rebuild spec, OG-to-ZOR ledger reconciliation, signer-committee proposal for the 2-wallet OREC bottleneck.

## License

To be set by ZAO. Reference material in this repo synthesizes publicly available primary sources from the wider fractal-governance ecosystem (Larimer's books, Medium articles, official websites, public GitHub repos) and ZAO's own research library.
