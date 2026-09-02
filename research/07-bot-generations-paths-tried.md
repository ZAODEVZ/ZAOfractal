# Bot Generations: Paths Already Tried

Seven generations of the ZAO Fractal bot exist as separate GitHub repositories,
spanning May 2025 to July 2026. Nobody had read them against each other. This
document exists so v2 does not re-walk a path already found to be a dead end.

**Method.** READMEs pulled via `gh api repos/bettercallzaal/<repo>/readme` on
2026-09-02, plus the working copy of `fractalbotapril2026` at
`~/Desktop/repos/fractalbotjuly2026`. Claims here are grep results and file
citations, not recollection. Where something was not read, it says so.

**Status:** iterations 1 and 2 done, of an ongoing research pass. Sections
marked OPEN are not yet done. Iteration 2 corrected a wrong conclusion from
iteration 1 - see 3.1 - and the correction is left visible rather than edited
away.

---

## 1. The generations

| Repo | Last push | Size | README |
|---|---|---|---|
| `ZAO-FRACTAL-BOTV2` | 2025-05-27 | 71 KB | 231 lines |
| `fractalbotV3June2025` | 2025-06-09 | 11 KB | 93 lines |
| `fractalbotnov2025` | 2025-11-25 | 18.1 MB | 373 lines |
| `fractalbotdec2025` | 2025-11-29 | 18.2 MB | 497 lines |
| `fractalbotfeb2026` | 2026-03-03 | 349 KB | 406 lines |
| `fractalbotmarch2026` | 2026-03-28 | 649 KB | 611 lines |
| `fractalbotapril2026` | 2026-07-07 | 439 KB | 624 lines |

Plus `fractalbotv1old` (12 KB) and `zao-fractal-bot-archive` (18.7 MB), not yet
read. The 18 MB repos are web assets, not data: neither `fractalbotnov2025` nor
`fractalbotdec2025` has a top-level `data/` directory (`gh api .../contents`
returns 404 for that path).

`fractalbotapril2026` is the generation currently deployed.

## 2. Feature survival matrix

Counts of case-insensitive README mentions, reduced to present/absent.

| Feature | V2 | V3 | nov25 | dec25 | feb26 | mar26 | apr26 |
|---|---|---|---|---|---|---|---|
| ENS | yes | yes | yes | yes | yes | yes | yes |
| dashboard | yes | - | yes | yes | yes | yes | yes |
| webhook | - | - | yes | yes | yes | yes | yes |
| vercel | - | - | yes | yes | yes | yes | yes |
| timer | yes | - | - | yes | yes | yes | yes |
| Hats | - | - | - | - | yes | yes | yes |
| randomize | - | - | - | - | yes | yes | yes |
| curation | - | - | - | - | yes | yes | yes |
| Airtable | - | - | - | - | yes | yes | yes |
| snapshot | - | - | - | - | - | yes | yes |
| async | - | - | - | - | - | yes | yes |
| **voice control** | - | - | - | **yes** | - | - | - |
| **channel summary** | **yes** | - | - | - | - | - | - |
| ornode | - | - | - | - | - | - | - |
| Supabase | - | - | - | - | - | - | - |

## 3. Findings

### 3.1 CORRECTED: "Voice Control" was never abandoned, it was renamed

Iteration 1 of this document claimed Voice Control was built in
`fractalbotdec2025` and dropped ten weeks later, and flagged it as a warning
for v2's planned voice-room orchestration. **That was wrong.** Recording the
correction rather than quietly editing it, because the mistake is instructive:
a feature name in a README is not a feature.

`fractalbotdec2025`'s README defines its "Voice Control System" as exactly five
things: Next Speaker, Skip and Return, Skip to Voting, Time Extensions,
Real-Time Display. That is a speaker-queue control panel, not voice-channel
orchestration. Every one of those controls exists today in
`fractalbotapril2026` `cogs/timer.py`: `pick_next` and `advance`,
`skip_come_back`, `skip`, `add_time`, and the countdown embed.

The feature survived. It was absorbed into the timer and stopped being called
"voice control".

**Consequence for v2:** the voice-room orchestration Zaal asked for on
2026-09-01 - the bot moving members between a waiting room and fractal rooms -
has **no prior art in any generation**. It has never been tried, so there is no
dead end to avoid. That is the opposite of iteration 1's conclusion.

**Channel Summary**, from `ZAO-FRACTAL-BOTV2` (April to May 2025), remains the
one feature that genuinely appears once and never again. Its removal has no
recorded reason, and section 3.6 explains why no such reason exists anywhere.

### 3.1b The random tie break was a headline feature, not an accident

`fractalbotnov2025`'s README Overview lists, as a selling point:

> **Tie-Breaking**: Automatic random selection for tied votes

So the random tie break in `cogs/fractal/group.py check_for_winner` was a
deliberate, advertised design decision from November 2025, carried forward
through every generation since.

Zaal reversed it on 2026-09-01: "No tie break we need consensus to move
forward." That is a reversal of a ten-month-old intentional choice, not the
correction of an oversight. Worth recording as such, because the next person to
read `group.py` will otherwise assume the randomness was laziness.

### 3.2 ENS is the only feature that survived every generation, and v2 dropped it

ENS appears in all seven READMEs across 16 months. It is the single most
durable feature in the bot's history. `fractalbotapril2026` implements it
properly: `cogs/wallet.py:42` `is_ens_name`, `cogs/wallet.py:47` `resolve_ens`,
resolving onchain through the ENS Universal Resolver contract.

**v2 has no ENS resolution at all.** A grep of `src/` and `packages/` for
`resolve_?ens|getEnsAddress|universalResolver` returns nothing outside a test
fixture.

Worse than absent: v2 actively discards the signal.
`src/lib/nameResolver.ts:39` reads

```js
.replace(/\.(eth|base|sol)\b/g, '') // ENS/name-service suffixes
```

so `ohnahji.eth` is normalised to `ohnahji` and matched as a display name. A
member who registers with an ENS name gets fuzzy-matched by string rather than
resolved to their actual address.

Given 161 of 188 `respect_members` rows carry a wallet, and that the onchain
proposal is built from wallet addresses, this is a correctness gap in the path
that mints Respect, not a convenience feature.

### 3.3 `ornode` appears in no generation's README

Zero mentions across all seven, May 2025 to July 2026. The bot has apparently
never used ornode.

`whitepaper/draft/ch10-roadmap.md` carries a milestone dated 2026-07-15:
"Restore ornode or Retire It Formally". If the bot never used it, "restore" may
be the wrong verb for the bot's side of that milestone. Whether ZAO OS or the
frapps frontend used ornode is a separate question and is OPEN.

### 3.4 `Supabase` appears in no generation's README either

Including `fractalbotapril2026`, whose 42 KB README does not mention it once -
while five of its cogs import `utils/supabase_client` (`intro.py`, `events.py`,
`hats.py`, `proposals.py`, `wallet.py`, plus `history.py`).

The persistence layer was never documented in any generation. That is
consistent with what was measured on 2026-09-01: the deployed bot has had no
Supabase credentials at all, and wrote nothing from 2026-03-23 onward without
anyone noticing. A layer nobody documents is a layer nobody checks.

### 3.5 The timer has been dropped and restored once already

Present in `ZAO-FRACTAL-BOTV2`, absent from `fractalbotV3June2025` and
`fractalbotnov2025`, back from `fractalbotdec2025` onward. It is now 1,011
lines in `cogs/timer.py` and is scheduled for a full port into v2 as Phase 3.
Whatever caused the June-to-November 2025 gap is OPEN and worth knowing before
porting it.

### 3.6 The bot has been restarted from scratch five times in sixteen months

This is the finding that explains all the others.

Commit histories, via `gh api repos/bettercallzaal/<repo>/commits`:

| Repo | First commit | Message | Commits |
|---|---|---|---|
| `ZAO-FRACTAL-BOTV2` | 2025-04-22 | "Initial commit of ZAO Fractal Bot" | 7 |
| `fractalbotV3June2025` | 2025-06-09 | "Initial commit with README" | 2 |
| `fractalbotnov2025` | 2025-11-03 | "v3.0 - Complete Simplification & Improvements" | 28 |
| `fractalbotdec2025` | 2025-11-03 | same lineage as nov2025 | 37 |
| `fractalbotfeb2026` | 2026-02-13 | "Initial commit: ZAO Fractal Bot Feb 2026" | 26 |
| `fractalbotmarch2026` | 2026-02-13 | same lineage as feb2026 | 45 |
| `fractalbotapril2026` | 2026-04-09 | "Initial commit: FractalBot April 2026 (from March 2026 v2.1)" | 10 |

Five independent lineages, each opening with an initial commit that discards
everything before it. `nov2025`/`dec2025` are one lineage, `feb2026`/`march2026`
are another. The currently deployed bot carries **ten commits of its own
history**.

Two consequences follow, and both were visible in today's work before the cause
was understood.

**Every restart loses the reason for every prior decision.** There is no
explanation anywhere for why Channel Summary went, because the repository it
lived in was abandoned wholesale rather than edited. A `git log` cannot cross a
repository boundary. This is why section 3.1 had to be corrected from a README
rather than confirmed from a commit.

**Every restart silently drops features.** Section 3.2's ENS gap is one
instance, and `zao-fractal-bot` (v2) is the **sixth** restart, following the
same pattern: fresh repository, no history, features re-derived from memory
rather than carried.

The mitigation is not "stop rewriting" - the rewrites bought real things, and
v2's test suite and typed engine are worth having. The mitigation is that a
restart must carry a written inventory of what the previous generation did, so
dropping something is a decision rather than an oversight. This document is the
first such inventory in sixteen months.

## 4. Open items for later iterations

- Commit history of `fractalbotdec2025` and `fractalbotfeb2026` for the reason
  Voice Control was removed. This is the highest-value open item, because v2 is
  about to build something adjacent to it.
- Commit history around the V3-to-nov2025 timer gap.
- `fractalbotv1old` and `zao-fractal-bot-archive`, not yet read.
- `fractalbotmarch2026` `data/` and `research/` for pre-Supabase fractal
  history usable for the backfill.
- Reconcile `ch10-roadmap.md` against measured reality: four milestones are
  overdue as of 2026-09-02.
- Add to `ch09-limitations-and-open-problems.md` the two single-points-of-
  failure measured 2026-09-01. Section "Infrastructure Single-Points-of-Failure"
  exists and lists neither.
