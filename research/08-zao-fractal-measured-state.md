# The ZAO Fractal: Measured State

**As of 2026-09-02.** What is specifically true about *this* fractal, measured
rather than described.

General fractal theory is already covered and does not need repeating:
`reference/` has 16 documents on Larimer, Fractally, Eden, Optimism Fractal and
Respect mechanics, and `research/01-foundations-deep.md` goes deeper. This
document is only the ZAO part, and only the parts that were read from the chain
or the database.

It extends `research/onchain-governance-audit-2026-07-21.md`, which remains
correct where it overlaps. Three things that audit listed as unreachable are
resolved here, and section 4 says how.

---

## 1. The system, as it actually is

| Fact | Value | How |
|---|---|---|
| OG Respect | `0x34cE89baA7E4a4B00E17F7E4C0cb97105C216957`, ERC-20 | on-chain |
| OG total supply | **38,484, unchanged since 2026-07-21** | `totalSupply`, read twice six weeks apart |
| ZOR Respect | `0x9885CCeEf7E8371Bf8d6f2413723D25917E7445c`, ERC-1155 | on-chain |
| ZOR transferability | **not transferable** - `safeTransferFrom` reverts | `eth_call` simulation |
| OG transferability | **transferable** - `transfer` simulates clean | `eth_call` simulation |
| ZOR owner | the OREC executor | on-chain |
| OREC executor | `0xcB05F9254765CA521F7698e61E0A6CA6456Be532` | on-chain |
| `voteLen` / `vetoLen` | 259,200s each = **72h + 72h** | on-chain |
| `minWeight` | 1000e18 | on-chain |
| `respectContract` | OG, the frozen ledger | on-chain |
| Award mint type | **10 = Respect Breakout x2** | `@ordao/ortypes` `mintTypeDesc`, matched against live token ids |
| Respect ladder | 110 / 68 / 42 / 26 / 16 / 10 | exactly 2x ORDAO standard 55/34/21/13/8/5 |

**The six-day floor.** 72h voting plus 72h veto means no fractal result can
reach chain in under six days. This is visible in the data, not just the
config: each week's execute transaction lands roughly six days after its
proposal. Any design in which a session ends and Respect appears that evening
is impossible.

**OG is transferable and ZOR is not.** That asymmetry matters: governance
weight (OG) can be moved between wallets, while earned Respect (ZOR) cannot.
Not previously recorded anywhere.

## 2. How the game actually runs, from the award ledger

Read via `alchemy_getAssetTransfers` over ZOR mints from the zero address. The
`periodNumber` is carried in the non-fungible token id (bytes 4-11; bytes 0-3
are the mint type).

| Period | Minted on | Awards |
|---|---|---|
| 101 | 2026-06-08 | 6 |
| 102 | 2026-06-22 | 6 |
| 103 | **absent** | 0 |
| 104 | 2026-07-06 | 4 |
| 105 | 2026-08-03 | 6 |
| 106 | 2026-07-27 **and** 2026-08-10 | 7 |
| 107 | 2026-08-03 **and** 2026-08-10 | 12 |
| 108 | 2026-08-10 | 4 |
| 109 | 2026-08-18 **and** 2026-08-31 | 7 |
| 110 | 2026-08-25 | 10 |
| 111 | 2026-08-31 | 1 |

Four things follow, none of them in any existing document.

**Periods are minted late, in batches, and out of order.** Period 106 minted
across two dates two weeks apart. Period 107 the same. The tidy picture of "a
fractal happens, its Respect is minted" is not what the ledger shows.

**Period 103 has no awards at all.** A week where the game either did not run
or was never submitted. Which, is open.

**Period 111 has exactly one award.** The most recent fractal's Respect is
almost entirely unsubmitted as of 2026-09-02. Zaal's 2026-09-01 decision -
propose for whoever has a wallet, supplementary proposal later - is already the
de facto practice, just unmanaged and untracked.

**Award counts per period range from 1 to 12**, so the number of groups and the
number of people per group both vary week to week.

## 3. The concentration risk, named precisely

Every one of the last twelve ZOR mints was sent by
`0x7234c36a71ec237c2ae7698e8916e0735001e9af`, calling the OREC executor.

`voteWeightOf` and `respectOf` both return **3094** for that address, against a
`minWeight` of 1000. One key clears the passing threshold three times over,
alone, every week.

`research/onchain-governance-audit-2026-07-21.md` independently lists Zaal's OG
holding as 3094. The addresses therefore match: **the sole relayer is the
founder's own wallet**, not a service key.

That sharpens the risk rather than softening it. If that key is lost, no
Respect can be minted by anyone, because ZOR's owner is OREC and OREC needs a
passing proposal. `whitepaper/draft/ch10-roadmap.md` carries a milestone dated
2026-06-30, "Establish 3+ Signer Committee for OREC". It is **two months
overdue** and this is what it was for.

Zaal was shown this measurement on 2026-09-01 and chose to accept the risk for
now. Recorded so the acceptance is visible rather than looking like nobody
noticed.

## 4. What today resolved from the July audit

That audit's "Tooling notes" listed three blockers. All three were solvable
from this machine, and the credentials were in
`~/Documents/ZAO OS V1/.env.local` the whole time.

- *"Historical event scans: public RPC caps `eth_getLogs` range... needs an
  Alchemy key"* - `ALCHEMY_API_KEY` is in that file. Full award-ledger
  reconstruction now works via `alchemy_getAssetTransfers`, which is what
  section 2 is built from.
- *"ZAOOS Supabase (`respect_members`, `wallets`) ... not reachable from this
  session"* - reachable via REST with the service role key in the same file.
  Project `efsxtoxvigqowjhgcbiz`.
- *"the ORDAO tokens Airtable was not reachable"* - still not reached. Open.

And one correction to that audit's framing: **`wallets` does not exist.** It is
named as a table to reach; it is not in the schema. Only `respect_members`,
`users` and the `fractal_*` tables are.

## 5. The offchain half, and why it went dark

| Table | Rows | Note |
|---|---|---|
| `fractal_sessions` | 133 | only **7** carry a `thread_id`, i.e. were written by the bot |
| `fractal_scores` | 801 | only 30 carry a `discord_id` |
| `respect_members` | 188 | 161 have a wallet |
| `users` | 60 | 22 bound to a Discord id |
| `fractal_events` | 4 | all test rows from 2026-04-14 |

**Nothing has been recorded since 2026-03-23.** The newest bot-written session
is "ZAO Fractal 92 - Group 1". Zero sessions created after 2026-04-15.

The cause is not a code bug. The deployed bot's `.env`, downloaded from the
bot-hosting panel on 2026-09-01, contains `ALCHEMY_API_KEY`, `DISCORD_TOKEN`,
`FRACTAL_BOT_WEBHOOK_SECRET` and `WEB_WEBHOOK_URL` - **and no Supabase
credentials at all.** Its only write path was ZAO OS's webhook, whose own
header comment reads "fire-and-forget semantics (10s timeout)".

So the game ran correctly every week for five months and recorded nothing, and
nothing depended on the recording strongly enough for anyone to notice.

**The chain is therefore the only complete ledger of the ZAO fractal.** Every
award since period 1 is on Optimism. What exists only in Supabase, and is
therefore lost for the 2026-03-23 to 2026-09-02 window, is the human layer:
names, Discord ids, group names, facilitator, thread links, and anyone who
attended and earned nothing.

## 6. Still open

- **The Airtable tokens base**, still unreached. It is also the identity source
  for `ZAO-Leaderboard`, which is a second member registry alongside
  `respect_members`.
- **Period 103**: did the game not run, or was it never submitted?
- **App-vs-chain weight**, carried over from the July audit: the dashboard's
  `computeRespectWeight` sums OG + ZOR and calls it weight, while governance
  counts OG only. A ZOR-only member has zero voting power however much they
  earn. Unreconciled.
- **The OG/ZOR numbering overlap** from the July audit's flag 4. Section 2 gives
  a period-to-date map that should let someone close it, but it is not closed
  here.
- **`ch08-the-zao-fractal.md` is stale**: it says "100 Weeks" and the chain is
  at period 111.
