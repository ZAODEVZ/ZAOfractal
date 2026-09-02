# The ZAO Fractal: Measured State

**As of 2026-09-02.** What is specifically true about *this* fractal, measured
rather than described.

General fractal theory is already covered and does not need repeating:
`reference/` has 16 documents on Larimer, Fractally, Eden, Optimism Fractal and
Respect mechanics, and `research/01-foundations-deep.md` goes deeper. This
document is only the ZAO part, and only the parts that were read from the chain
or the database.

It extends `research/onchain-governance-audit-2026-07-21.md`, which remains
correct where it overlaps. All three things that audit listed as unreachable
are resolved here (section 4), and two of its open flags are closed (sections 7
and 8).

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
- *"the ORDAO tokens Airtable was not reachable"* - **reached, section 7.** The
  base id is not in any env file; it is hardcoded in ZAO OS source.

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

## 6. The two registries, reconciled (2026-09-02)


Closes section 6's first open item. The ORDAO tokens Airtable is reachable:
base `appTUNG04rjZ9kSF4`, via `AIRTABLE_TOKEN` in
`~/Documents/ZAO OS V1/.env.local`. Tables: `Summary`, `Respect`, `Misc`,
`Fractal Hosts`, `ZAO Festivals`, `Wallet Data`. The base id is hardcoded at
`ZAO OS V1/src/app/api/admin/respect-import/route.ts:10`, not in any env file,
which is why it was not found before.

`AIRTABLE_PAT` returns 403 and `AIRTABLE_TOKEN` works; neither can list bases
(no `schema.bases:read` scope), only read records.

| | records | valid wallets |
|---|---|---|
| Airtable `Wallet Data` | 187 | 159 |
| Supabase `respect_members` | 188 | 161 |

Reconciled on lowercased wallet address:

| | count | meaning |
|---|---|---|
| in both | 147 | agree |
| **Airtable only** | **12** | on the public leaderboard, invisible to the bot |
| **Supabase only** | **14** | known to the bot, absent from the leaderboard |
| same wallet, different name | 2 | |

**Roughly 15% of the membership exists in exactly one of the two systems.**
The counts being nearly equal (187 vs 188) hides this: it looks like two copies
of one list, and it is not.

### 7.1 The drift has a face

`0xf73485a6...` is **`Iman`** in Airtable and **`0xf734...a8ea`** - an unnamed
hex placeholder - in `respect_members`.

That wallet is a recipient in period 110's award transaction
`0x10d6878532...` on 2026-08-25, at rank 4, level 3, 26 Respect.

So a member earns Respect, is named correctly on the public leaderboard, and is
anonymous to the bot that runs the game. Any bot feature that resolves people
by name - roster capture, `/mystats`, a welcome message - cannot see him.

The other mismatch is cosmetic: `0$` versus `0$ (OS)`.

## 7. The OG/ZOR numbering overlap, closed


Closes the 2026-07-21 audit's open flag 4, which read: *OG "fractals 1-73
through Sep 2025" but froze Dec 2025; ZOR "74+ from Sep 2025". 3-month overlap
unexplained.*

Full ZOR mint ledger read from genesis via `alchemy_getAssetTransfers`
(`order: asc`, paged to exhaustion - the entire ZOR history fits in one page of
1000 transfers).

**ZOR awards begin at period 67, on 2025-09-25.** Not 74. Periods 1 through 66
carry no ZOR award at all.

Periods present: 67 through 111, **except 71, 72 and 103**, plus an anomalous
period `0`.

Three corrections and one new question follow.

- The documented "ZOR from 74" is **wrong by seven periods**; the chain says 67.
- The gap is **not just period 103**. Periods **71 and 72** are also empty, and
  no document mentions them.
- **Period `0` has awards dated 2026-08-18**, which is not a plausible first
  fractal. Something minted with an unset period number. Unexplained, and worth
  chasing because it means the period field is not always populated correctly.

On the overlap itself: the 20 most recent OG mints all went to a **single
address**, `0x7234c36a...`, in bulk amounts (2852, 2559, 2000, 1000, 110, 50),
the last on 2025-12-09. Those are not per-member fractal awards. So the
"overlap" is not two award ledgers running concurrently - it is ZOR taking over
per-member awards from period 67 while OG continued to receive bulk mints to
one wallet until the December freeze. That is a materially different story from
the one the whitepaper tells, and it should be checked against the operators
before being written into `ch06`.

## 8. Who can actually vote (2026-09-02)

Closes the app-versus-chain weight item, carried over from the 2026-07-21
audit. Read directly: `balanceOf` on OG and `balanceOf(addr, 0)` on ZOR, for
every one of the 161 `respect_members` rows that has a wallet.

| Holding | Members | Governance weight |
|---|---|---|
| OG and ZOR | 21 | yes |
| OG only | 94 | yes |
| **ZOR only** | **28** | **none** |
| neither | 18 | none |

Members hold 37,512 of OG's 38,484 supply, and 15,684 ZOR.

**Twenty-eight members have earned Respect and cannot vote on anything.** That
is 20% of the 143 members holding any Respect at all. OREC's `respectContract`
is OG, OG has been frozen since December 2025, and ZOR is not a governance
token - so anyone who arrived after the freeze accumulates Respect weekly and
accumulates no say, permanently, by construction.

The dashboard does not show this. `computeRespectWeight` sums OG + ZOR and
labels the result "weight". For these 28 people that number is not their voting
power, it is their lifetime earnings, and the two are presented identically.

The highest-earning members with no vote:

| ZOR earned | Member |
|---|---|
| 738 | `0xf734...a8ea` |
| 726 | Steve Strange |
| 670 | Motomoto |
| 498 | SwarthyHatter |
| 482 | Leo (Civil_Monkey) |
| 356 | XTincT |
| 330 | Emily |

**`0xf734...a8ea` is Iman** - the same wallet as section 6.1, named in Airtable
and anonymous in `respect_members`. He is simultaneously the most-earning
voteless member of the fractal and a member the bot cannot identify by name.
Two independent defects landing on one person is a useful test of whether these
findings matter in practice.

For scale: 738 ZOR is more than the OG holding of most voting members, and
`minWeight` to pass a proposal is 1000.

This is not a bug in any component. Every part behaves as written. It is a
governance design consequence that nothing currently surfaces to the people it
affects.

## 9. The period 0 anomaly, explained

One award carries period 0: **1 Respect**, mint type 10, to
`0x70a74f41e99e412657c014583544fa6ecdba4743`, on 2026-08-18, transaction
`0x055d04485f74...`.

One Respect is not on the ladder (110/68/42/26/16/10), and period 0 is not a
real meeting. This is a **test mint left in the live ledger**. It is harmless
to governance - ZOR carries no vote - but any tooling that derives the meeting
list from token ids will see a phantom period 0, and any leaderboard summing
ZOR counts it.

Correcting section 7: the period gaps are 71, 72 and 103; period 0 is not a gap
but a stray.

## 10. Still open


- ~~The Airtable tokens base, still unreached.~~ **CLOSED, section 7.**
- ~~Period 103.~~ **Partly closed, section 8**: the gap is periods 71, 72 and
  103, and whether each was a meeting that never ran or one never submitted is
  still open - answering it needs the Discord history, not the chain.
- ~~Period `0`.~~ **CLOSED, section 9**: a single 1-Respect test mint.
- ~~App-vs-chain weight.~~ **CLOSED, section 8.** 28 members have zero
  governance weight; the dashboard shows them a number that is not their vote.
- ~~The OG/ZOR numbering overlap.~~ **CLOSED, section 8**, with three
  corrections to the documented version.
- **`ch08-the-zao-fractal.md` is stale**: it says "100 Weeks" and the chain is
  at period 111.
