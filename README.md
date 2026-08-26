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
                               draft/ contains the complete v0.2: abstract +
                               11 chapters, 34,421 words, accuracy pass against
                               the on-chain snapshot 2026-08-26. Assemble with
                               scripts/assemble-whitepaper.mjs.
```

Start at [reference/README.md](reference/README.md) for the survey. Move to [research/README.md](research/README.md) when you need depth. The [whitepaper/README.md](whitepaper/README.md) tracks magnum-opus progress.

## Live ZAO Fractal facts

Measured from the committed snapshot at OP Mainnet block 156,071,456, pulled
2026-08-26. Re-pull with `node scripts/pull-data.mjs`; re-check every figure
quoted anywhere in this repo with `node scripts/verify-claims.mjs`.

| Fact | Value | Source |
|------|-------|--------|
| Cadence | Mondays 6pm EST, weekly. Also runs anytime with 4+ unplayed members. | community |
| Period counter | 110, settled 2026-08-25 | chain |
| Settled periods on the ZOR ledger | 41, covering periods 67-110 | chain |
| People settled per period | mean 8.1; 4 to 12 in recent sessions | chain |
| Community roll | 188 (Farcaster, counted ~May 2026); 169 addresses have ever held Respect | community / chain |
| Surface | Discord bot `fractalbotmarch2026` (52 slash commands, v2.1, March 28 2026) | unsourced in this repo |
| Chain | Optimism (OP Mainnet) | chain |
| OREC executor | `0xcB05F9254765CA521F7698e61E0A6CA6456Be532` | chain |
| OG Respect (ERC-20, periods 1-66) | `0x34cE89baA7E4a4B00E17F7E4C0cb97105C216957` | chain |
| ZOR Respect (ERC-1155, periods 67+) | `0x9885CCeEf7E8371Bf8d6f2413723D25917E7445c` | chain |
| Submission UI | `zao.frapps.xyz/submitBreakout` | - |
| OREC activity | 316 transactions, 514 events, 153 proposals, 123 executed, 11 execution reverts | chain |
| Vote weight | read live from OG at each vote; ZOR confers none | chain |

**The streak is not an on-chain number.** The chain records settlement, not
attendance, and periods 1-66 ran on a ledger with no per-period record at all.
Whitepaper ch08 keeps the ritual claim and the chain claim apart on purpose.

Operational docs that already exist:

- The whitepaper itself (complete v0.2, all 11 chapters + abstract) - [whitepaper/draft/](whitepaper/draft/)
- The bot internals walkthrough - [research/code-walk/01-fractalbot-walkthrough.md](research/code-walk/01-fractalbot-walkthrough.md)
- The ORDAO Solidity walkthrough - [research/code-walk/02-ordao-contracts-walkthrough.md](research/code-walk/02-ordao-contracts-walkthrough.md)
- Frapp-GH (async GitHub-native fractal) full PRD, build-ready - [research/06-frapp-gh-prd.md](research/06-frapp-gh-prd.md)

Since shipped, all under [respect/](respect/): the OG-to-ZOR ledger
reconciliation, the signer-committee proposal (which found there is no signer
set to join - see `respect/SIGNER-COMMITTEE.md`), the execution and
facilitation runbooks, and a dashboard in [dao/](dao/) reading the committed
snapshot rather than a live indexer.

## Licensing

Two licenses, split by what the file is. Code is MIT **by default**, so a
directory added tomorrow is covered; documents are CC BY 4.0 by the explicit
list below. Nothing falls between them by accident.

| What | License | File |
|------|---------|------|
| **Code** - `scripts/`, `dao/`, `site/`, `frapp-gh/`, and any code added later | MIT | [LICENSE](LICENSE) |
| **Documents** - `whitepaper/`, `respect/`, `reference/`, `research/`, `RESOURCES.md` | CC BY 4.0 | [LICENSE-DOCS](LICENSE-DOCS) |
| **`data/`** - the on-chain snapshot and the member map | neither, deliberately | see below |

Copyright (c) 2026 Zaal Panthaki / BCZ Strategies LLC / The ZAO.

MIT on the code so anyone can run the puller, fork the dashboard, or lift
`verify-claims.mjs` into their own repo without asking. CC BY 4.0 on the
documents so the whitepaper and the research archive can be quoted, translated
and built on, with attribution - which is the point of publishing a governance
model rather than just running one.

Two limits worth stating plainly, both spelled out in `LICENSE-DOCS`.

**CC BY 4.0 covers ZAO's own writing.** It does not license the third-party
primary sources these documents quote and synthesize - Larimer's books, the
Fractally and Eden materials, Medium articles, academic papers, other
communities' documentation. Those stay under their own terms, and the citations
throughout point to them.

**`data/` is not licensed by either file, and the omission is deliberate.** It
holds a public chain snapshot, which is not ours to license, alongside
`data/members.json`, which binds community names to wallet addresses and is
subject to a disclosure decision that has not been made. Neither license grants
any right in it.

And a related note rather than a limit: these documents name real people -
who facilitates, who attends, who votes, who executes - because a governance
record that anonymises its participants cannot be checked. CC BY 4.0 invites
redistribution of that, and the grant is irrevocable once made. Being named in
an attendance table or a proposed roster is not the same as having agreed to
anything, and `LICENSE-DOCS` says so to anyone redistributing.
