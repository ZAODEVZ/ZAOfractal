# Architecture

Frapp-GH Phase 1. Source spec: `research/06-frapp-gh-prd.md` in this repo.

Internally a cycle is a "week" (`weekNumber`, `weekStatePath`); to readers it is
whatever `cycleNoun` says, which for ZAO is "Period" continuing the on-chain
count. The field names were not renamed because the numbering is the thing that
has to match, not the vocabulary.

## Shape

GitHub is the database. Git is the log. The code is a scheduled job plus a
small read API.

```
GitHub repo
  Discussion (session + ballots + results)
  Issues     (contributions, labeled week-N-contribution)
  Projects   (optional visual board)
  Actions    (cron: open / snapshot / tally)
        |
        |  scripts/cycle.ts  (Actions, FsStore -> commit)
        |  src/app.ts        (Vercel, GitHubStore -> contents API)
        v
  src/handlers/cron-handlers.ts
        open      -> ensure label, create Discussion, create board, write state
        snapshot  -> read ballots, check eligibility, commit vote snapshot
        tally     -> aggregate, assign Respect, post results, rebuild leaderboard
        |
        v
  src/lib/  borda-count | respect-scorer | parsing | week | storage | github-api
```

Two runtimes, one set of handlers. The Actions runner uses `FsStore` and lets the
workflow commit; the serverless app uses `GitHubStore` and writes through the
contents API. Handlers never touch `fs` or Octokit directly - they take a
`GitHubClient` and a `Store`, which is why the full cycle is testable in memory.

## Cycle state machine

```
(none) --open--> open --snapshot--> voting-closed --tally--> completed
                                          |
                                          +-- below minVoters --> stays voting-closed,
                                              failure notice posted, no Respect
```

`open` refuses to reopen a week past `open`. `snapshot` and `tally` refuse to run
without their predecessor's artifact and return a 409 rather than throwing.

## Files written

| Path | Written by | Contents |
|---|---|---|
| `.github/frapp-gh/week-N/state.json` | all three steps | status, discussion, counts, Respect map |
| `.github/frapp-gh/vote-snapshots/week-N.json` | snapshot | every ballot, with eligibility verdicts |
| `public/leaderboard.json` | tally | cumulative Respect, rebuilt from all period states |

Paths are relative to `frapp-gh/`. The Actions runner writes them directly
(`working-directory: frapp-gh`); the deployed service writes through the
contents API, which resolves from the repository root, so `github.pathPrefix`
prefixes every one of those writes with `frapp-gh/`.

The snapshot is the receipt: it records rejected ballots and the reason, so the
tally can be recomputed by anyone from committed data alone.

## Aggregation

`positionsForVoter` converts one ballot into a position per contribution.
Explicitly ranked items take their 1-based position; the rest share the average
of the leftover positions. Without this, a voter who ranks 3 of 12 would hand the
other 9 an artificially strong or weak score depending on the fill rule.

`bordaCount` sums positions. `medianOfMedians` groups voters (seeded by week
number for reproducibility), takes each group's median position per
contribution, then the median across groups.

`sortScored` orders by score, then first-place votes, then times ranked, then
issue number. Fully deterministic - the same snapshot always yields the same
table.

A contribution with zero placements is the limit case of the averaging rule and
is deliberately kept eligible: it sorts below everything that was placed, and
earns whatever the curve pays at that rank. Covered in `borda-count.test.ts`,
`respect-scorer.test.ts`, and the replay scenario, so it cannot be refactored
away by accident.

`assignRespect` maps final rank onto the curve and flags ties so the results
comment can explain why two equal scores ordered the way they did.

## Time

`src/lib/week.ts` resolves "Monday 18:00 America/New_York" without a timezone
library, using `Intl.DateTimeFormat` to measure the zone's offset at the instant
in question and applying it twice so DST transitions land correctly. Week numbers
count cycles forward from `epochDate`, so an existing fractal keeps its numbering
and the count does not shift twice a year.

## Trust

Phase 1 is Tier 1 only: GitHub account age, deny list, no bots, `minVoters`
floor. `seedList` is parsed but unweighted - weighting is Phase 2. Webhook
payloads are HMAC-verified with a constant-time compare; the cycle endpoints
require a shared secret header. Nothing signs a transaction, and `config.ordao`
is forced to `enabled: false` at load.

## Replay

`src/testing/replay.ts` plays a scenario of recorded webhook deliveries against
the real routes with an injected clock and in-memory GitHub. Each payload is
applied to the fake before it reaches the handler, so the fake's state is
derived from the same deliveries the handlers see rather than hand-authored
alongside them. `npm run replay` runs a full period; a 4xx at any step exits
non-zero.

## Known limits

- Projects v2 gives one shared board order, so per-voter drag-ranking is not
  available; ballots are Discussion comments. Board order is a single-ballot
  fallback.
- Cron is fixed UTC and does not follow US daylight saving.
- The leaderboard rebuilds from committed week states; a hand-edited state file
  changes the standings. The vote snapshots are the check on that.
- One Discussion per period, found by exact title. Renaming a session Discussion
  detaches it from its period.
- Workflows and issue templates must live at the repository root; only the
  workflows' `working-directory` points here. Both now do.
