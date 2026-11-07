# 08 - ORDAO / OREC / frapps / Optimystics

The software layer that runs every modern fractal community. Built by **Optimystics** - GitHub org with ~16 repos, mostly GPL-3.0 - and led by Tadas Vaitiekunas (`sim31` on GitHub).

## ORDAO - the system

**ORDAO** = **O**ptimistic **R**espect-based **DAO**. It is the governance framework that wraps the Respect Game's output (peer rankings) and turns it into on-chain decisions.

Its core innovation is being **optimistic**: instead of demanding a 50% quorum (which produces voter apathy in any large community), ORDAO trusts a proactive minority to propose and gives the rest of the community a challenge window to veto.

## OREC - the contract

**OREC** = **O**ptimistic **R**espect-based **E**xecutive **C**ontract. A Solidity contract that runs three phases per proposal:

1. **Voting period.** Anyone votes yes or no, weighted by Respect. Low quorum (e.g. 5%) - the design assumption is that most members will not vote, and that is OK.
2. **Veto period.** A time-delayed challenge window where **only NO votes count, vetoes carry 2x weight**. NO weight of at least half the YES weight, one third of the weight cast, vetoes (corrected 2026-11-07).
3. **Execution.** If a proposal survives both periods, anyone can call `execute()` to enact it on-chain.

The passing formula:

```
noWeight * 2 < yesWeight  AND  yesWeight >= minWeight
```

This is **consent-based** governance, not majority-based. It trusts the active minority while giving the broader community real blocking power.

## The Optimystics repo ecosystem

| Repo | Purpose |
|------|---------|
| `ordao` (Optimystics/ordao) | Core monorepo - OREC contracts, orclient, ornode, ortypes, GUI, console |
| `sim31/ordao` | Upstream dev repo, Tadas's working tree (254+ commits, last push Apr 2 2026) |
| `orclient` (npm: `@ordao/orclient`) | TypeScript SDK. Current version 1.4.4, published 2026-04-02. Built on ethers v6 + zod |
| `ornode` | Node/Express + MongoDB backend. Stores off-chain proposal content |
| `frapps` | The "fractal apps" deployment platform. Each fractal gets a subdomain (e.g. `zao.frapps.xyz`, `eden-fractal.frapps.xyz`) |
| `orfrapps` | Newer (April 2026) production-deployment + multi-instance CLI |
| `Fractalgram` | Customized Telegram Web A client (GPL-3.0) - automates polls, breakout rooms, on-chain submission. Last activity Feb 11, 2026 |
| `Respect.Games` | Async-first Respect Game web app at respect.games (beta). MIT-licensed (unlike GPL-3.0 Fractalgram) |
| `Cignals` | Competition app for ranking live performances. Alpha-tested at Eden Fractal events 53/55/56 ("Fractal DJ" music ranking) |
| Cagendas, OPTOPICS, Respect Trees, RetroPolls | Other Optimystics tools for meeting structure and async governance |

## orclient SDK functions

The SDK that fractal-app frontends call. Key functions:

| Function | What it does |
|----------|--------------|
| `proposeBreakoutResult(...)` | Submit a Respect Game session's rankings as an OREC proposal |
| `vote(propId, vote)` | Cast a yes or no vote on a proposal |
| `execute(propId)` | Execute a proposal that survived voting + veto |
| `getRespectOf(address)` | Read a member's Respect balance |

## License + stack note

ORDAO tooling is **GPL-3.0**. ZAO OS is **MIT**. Using `orclient` as an npm dependency (linking) is fine and is what ZAO OS does.

A second consideration: **orclient uses ethers v6, ZAO OS uses viem/wagmi**. The integration pattern that solved this for ZAO is **viem for reads, orclient for writes** - the SDKs do not conflict at runtime because they call different methods.

## frapps subdomains - active deployments

| Subdomain | Fractal |
|-----------|---------|
| `zao.frapps.xyz` | ZAO Fractal (Optimism) - LIVE |
| `eden-fractal.frapps.xyz` | Eden Fractal (Base) - LIVE |
| `of.frapps.xyz` | Optimism Fractal (paused since Jan 2026) |

## ZAO's OREC

ZAO Fractal's OREC contract on Optimism: **`0xcB05F9254765CA521F7698e61E0A6CA6456Be532`**. As of May 21, 2026 it had recorded **242+ transactions** since genesis. It reads the OG Respect token for vote weights and owns the ZOR Respect token to mint it.

**Known operational issue:** ZAO's OREC has been driven by only **two wallets** to date (zaal.eth and civilmonkey.eth). All on-chain submissions have flowed through these two signers. Opening up direct member-submission is on ZAO's roadmap (see ZAO research Doc 703, Recommendation #1).

## Where to learn more

- [Optimystics GitHub org](https://github.com/Optimystics) - all 16 repos
- [sim31/ordao](https://github.com/sim31/ordao) - the upstream dev repo
- [@ordao/orclient on npm](https://www.npmjs.com/package/@ordao/orclient) - SDK
- [optimystics.io](https://optimystics.io) - team site
- [Cignals overview](https://optimystics.io) - the music-ranking competition app most relevant to ZAO

## Sources

- [Optimystics - GitHub Organization](https://github.com/Optimystics) - [FULL]
- [sim31/ordao - upstream dev](https://github.com/sim31/ordao) - [FULL]
- [Optimystics blog - History of Fractal Communities](https://optimystics.io/blog/fractalhistory) - [FULL]
- ZAO internal research: Doc 56, 109, 188, 285, 702, 703 (the OREC contract address, txn counts, license/stack notes)
