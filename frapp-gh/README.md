# Frapp-GH

GitHub-native async fractal governance. Runs the ZAO Respect Game on Issues,
Discussions, and Projects - no call to attend, no chain to touch.

Phase 1 (this repo): async ranking, off-chain. Contributions are Issues, ballots
are Discussion comments, aggregation is Borda count, Respect is whatever curve
the live Monday game currently pays (2x Fibonacci today, and it has not always
been), and everything is committed back to the repo as JSON.

**Status: never run live.** Phase 1 is code-complete and tested end to end
locally - the suite is green and `npm run replay` plays a whole period against
recorded webhook deliveries - but nothing here has run against real GitHub. No
App is registered, no webhook secret exists, nothing is deployed, and no real
ballot has ever been cast. **Everything below describes what the code does when
it runs, not something that has happened.** The first live period is a decision
for Zaal, not a step that has been taken.

Built from `research/06-frapp-gh-prd.md` in this repo.

**Origin:** developed 2026-08-26 as a standalone repo at `~/Documents/frapp-gh`,
then moved in here so ZAOfractal is the single home for everything fractal -
docs, data, and the tools that run the game. That directory has since been
deleted; this is the only tree. The move and everything after it are in this
repo's history - `git log -- frapp-gh/` rather than a count written here, which
would be stale the moment it was committed. Paths in this README are relative to
`frapp-gh/`.

## The week

| When | What happens | Who |
|---|---|---|
| Mon 18:00 ET | Session Discussion opens, period label ensured, ranking board created if Projects scope allows | `fractal-open` workflow |
| Mon-Sat | Contributions submitted as Issues labeled `week-N-contribution` | contributors |
| Sat 18:00 ET | Ballots read from Discussion comments, eligibility checked, snapshot committed | `fractal-snapshot` workflow |
| Sun 18:00 ET | Borda aggregation, Respect assigned, results posted, leaderboard rebuilt | `fractal-tally` workflow |

### Submitting a contribution

Open an Issue, label it with the week (`week-52-contribution`), and include:

```
## What I Did
- Built the Borda aggregation and covered it with tests

## Evidence
ZAODEVZ/ZAOfractal#12

## Criteria Tags
[Contribution]
```

There is a **Fractal contribution** template at the repository root
(`.github/ISSUE_TEMPLATE/contribution.yml`) - templates only work from there, not
from inside `frapp-gh/`. Blank issues stay available for everything else in
ZAOfractal.

The bot replies once with what it logged. A missing evidence link or criteria
tag is a nudge, not a rejection (`enforcement: "soft"`). Set
`"enforcement": "hard"` to close malformed submissions instead.

### Voting

Reply in the session Discussion, best first:

```
/rank #12 #4 #7 #3
```

A numbered list works too:

```
1. #12
2. #4
```

Your latest ballot wins, so post again to correct it. Partial ballots are fine -
contributions you did not place share the leftover positions, so a short ballot
neither boosts nor buries the rest.

**Why comments and not the Projects board:** Projects v2 exposes one shared board
order per project, not a per-voter order (PRD risk 5). The board is a view, not
the ranking surface - `open` creates one when it can and logs a warning and
carries on when it cannot, because Projects needs org-level scope that a repo
token may not carry. A period runs fine without it. Discussion comments give
each voter their own ballot and leave a public audit trail. If a
`github.projectNumber` is configured and nobody comments a ballot, the board
order is counted as a single facilitator ballot rather than losing the week.

### Results

**What the Respect is.** A record of peer-ranked work, not a governance weight.
Nothing frapp-gh awards is on the ZOR or OG ledger: it carries no vote, counts
toward no quorum, and appears in none of the on-chain figures ZAO publishes.
Whether async Respect ever settles on-chain is an open decision, not a scheduled
step, so the session Discussion, the results comment and the leaderboard all say
so plainly. Earlier copy said only that no tokens were minted, which reads as
"not yet" when the honest statement is "not that" - a member should not spend a
period earning a number they believed was a vote.

Aggregation runs, the curve is applied, and a results table is posted to the
session Discussion. Every ballot is committed to
`.github/frapp-gh/vote-snapshots/week-N.json`, so anyone can recompute the tally.

## Aggregation

**Borda count** (default): each voter's ballot gives every contribution a rank
position; the positions are summed; lowest total wins. Ties break on first-place
votes, then on how many voters ranked it, then on issue number - so a re-run of
the same snapshot always produces the same order.

**Median-of-medians** (`"algorithm": "median-of-medians"`): voters are split into
breakout groups, each group's median rank per contribution is taken, then the
median across groups. Closer to the live fractal and much harder for one outlier
ballot to move. Groups are shuffled with the week number as the seed so the
result stays reproducible.

**Respect:** `[110, 68, 42, 26, 16, 10]` by final rank - the curve the live
Monday game pays *now*, checked against on-chain award levels by
`scripts/verify-claims.mjs` rather than copied from the PRD and hoped over. It
is not the curve ZAO has always paid: periods 67-70 paid standard Fibonacci
before the 2x curve began at 73. Change `respectScores` and you change what a
rank is worth - keep it equal to whatever the live game pays, so an async
period and a Monday breakout never award differently for the same rank. Rank 7 and beyond earn 0,
matching the six paid places of a live breakout. One author holding two ranked
contributions collects both amounts.

Check a week's math either way without touching GitHub:

```bash
npx tsx scripts/tally.ts .github/frapp-gh/vote-snapshots/week-52.json --method median-of-medians
```

## Eligibility (Tier 1)

- GitHub account at least `minAccountAgeDays` old (default 14)
- Not on `denyList`, not a bot
- Ballot must name at least one contribution on this week's list
- The week does not tally below `minVoters` (default 3) - the bot says so in the
  Discussion and awards nothing

Tiers 2 and 3 (Farcaster FID, wallet binding) are Phase 2 and are not implemented.

## Setup

**Precondition, do this first:** the repo needs Discussions enabled
(Settings > General > Features > Discussions) and a category matching
`github.discussionCategory` - "Fractal Sessions" by default. The API cannot
create a category, so this is a repo-settings step. `open` refuses to run
without it and names what is missing; `scripts/setup.ts` checks it too.

1. **Config.** Edit `frapp-gh.config.json`: `github.owner`, `github.repo`, the
   schedule, the Respect curve, `minVoters`, and your criteria. Set
   `sessionSchedule.epochDate` / `epochWeekNumber` to continue an existing
   cycle count, and `cycleNoun` to whatever the community calls one cycle.

   This repo ships ZAO's real numbering: `cycleNoun: "Period"`, epoch
   `2026-08-24T18:00:00-04:00` = **period 110**.

   That date is the **session Monday**, not the settlement date. Period 110
   settled on-chain the next day - `data/periods.json` records it at
   2026-08-25T16:49:49Z, and `summary.json` puts the last of its ten awards at
   2026-08-25T18:41:21Z. Awards land after the OREC vote window, so settlement
   can fall on any day; period 109 settled the same Monday evening as its
   session (2026-08-18T00:39Z = Mon 08-17 20:39 ET) while 110 settled on the
   Tuesday. The sessions themselves are consecutive Mondays: 109 on 08-17, 110
   on 08-24. Anything citing a settlement date should say "settled", the way
   the root README's facts table does; the epoch here is deliberately the
   session.

   Sessions read "Period 111", labels read `period-111-contribution`.
2. **Repo.** Confirm the Discussions precondition above.
3. **Auth.** Either a `GITHUB_TOKEN` with `repo` scope, or a GitHub App
   (`GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_INSTALLATION_ID`).
   Actions can use the built-in token; add `FRAPP_GH_TOKEN` as a secret if you
   want the bot's comments attributed to the app.
4. **Check.** `npx tsx scripts/setup.ts` reports the current week, the schedule,
   and anything missing.
5. **Run.** The three workflows are cron-scheduled and also runnable from the
   Actions tab with `workflow_dispatch`, including a dry-run toggle.

Cron in the workflows is UTC (`22:00` = 18:00 EDT). It does not follow US DST -
switch to `23:00` for winter or accept a one-hour drift half the year.

### Optional: the HTTP service

The Actions workflows are enough to run a fractal. The Hono app adds a webhook
(acknowledging submissions as they arrive) and a read API for the leaderboard
page.

```bash
npm run dev      # http://localhost:8787
```

| Route | Purpose |
|---|---|
| `POST /webhook/github` | Issue and discussion-comment events (HMAC verified) |
| `POST /api/v1/cycle/open\|snapshot\|tally` | Same handlers as the workflows; needs `x-frapp-gh-secret` |
| `GET /api/v1/status` | Current week, phase, and deadlines |
| `GET /api/v1/votes/:week` | Committed ballot snapshot |
| `GET /api/v1/weeks/:week` | Week state |
| `GET /api/v1/leaderboard` | Cumulative Respect |
| `GET /health` | Liveness |

Deploy target is Vercel (`api/index.ts`, `vercel.json`). Env vars are documented
in `.env.example`. **Nothing here has been deployed** - no project is linked and
no secrets are set.

**Nesting matters for the service, not for Actions.** The contents API resolves
paths from the repository root, so with frapp-gh living inside ZAOfractal every
API write needs `github.pathPrefix` (set to `frapp-gh` here). Without it the
service would write period state to `/.github/frapp-gh` and `/public` at the top
of ZAOfractal. Actions are unaffected - they run with
`working-directory: frapp-gh` and write through the filesystem. `FRAPP_GH_PATH_PREFIX`
tells the bootstrap where to find the config before the config has been read.

## Layout

```
src/lib/          config, scheduling, aggregation, Respect curve, parsing, storage, GitHub adapter
src/handlers/     cycle handlers (open/snapshot/tally), webhook handlers, markdown rendering
src/app.ts        Hono routes
scripts/          cycle runner (used by Actions), offline tally, setup check
public/           static leaderboard (no build step)
.github/frapp-gh/ committed period state and vote snapshots
fixtures/         recorded webhook payloads and replay scenarios
src/testing/      in-memory GitHub and store, replay engine
```

**Workflows live at the repo root**, not here: GitHub only executes
`.github/workflows` at the top level of a repository. See
`../.github/workflows/fractal-{open,snapshot,tally}.yml` and `frapp-gh-ci.yml` -
each sets `working-directory: frapp-gh`. The contribution issue template is at
the root for the same reason, as `../.github/ISSUE_TEMPLATE/contribution.yml`;
it is not under `frapp-gh/`, where GitHub would never read it. That placement
adds a template chooser to every ZAOfractal issue, blank issues included, which
is a repo-wide change and was made deliberately rather than assumed - see the
Submitting section above.

State lives in git, so the audit trail is the commit history:

```
.github/frapp-gh/week-52/state.json
.github/frapp-gh/vote-snapshots/week-52.json
public/leaderboard.json
```

**`period-N` and `week-N` are the same number.** The community-facing name comes
from `cycleNoun`, so ZAO reads "Period 111" in the Discussion and
`period-111-contribution` on the label, while the field, the paths and the API
routes stay `week` - `week-111/state.json`, `GET /api/v1/votes/111`. Nothing is
misconfigured when those differ; only the vocabulary does. Renaming the
internals is a live decision, not a settled one - see ARCHITECTURE.

## Replaying a whole period locally

The async week runs end to end with no GitHub App, no network, and no
credentials:

```bash
npm run replay                 # fixtures/scenarios/full-period.json
npm run replay -- --results    # also print the results comment as posted
```

Recorded deliveries live in `fixtures/webhooks/` and a scenario orders them on a
simulated clock. The harness signs each payload, posts it to the real webhook
route, and moves GitHub's own state the way the delivery says it moved - an
issue is on the ballot because an `issues.opened` delivery put it there, a ballot
counts because a `discussion_comment` delivery carried it. So a green replay is
evidence about the flow, not about the fake.

The shipped scenario covers the awkward cases on purpose: a submission that
arrives unlabeled and gets labeled later, a thin submission that is nudged
rather than rejected, an edit that must not re-acknowledge, a withdrawn label, a
bot, chatter that is not a ballot, a voter who corrects themselves in a later
comment, a partial ballot, and an account too new to vote.

```
2026-09-05 22:00  200  cycle:snapshot   Period 111 snapshot: 4 ballots over 6 contributions
2026-09-06 22:00  200  cycle:tally      Period 111 tallied: 272 Respect across 6 members
```

Write a new scenario by pointing a JSON file at other payloads - the format is
`{ name, seed, steps: [{ at, webhook, payload } | { at, cycle }] }`. A step that
returns 4xx exits non-zero, so a scenario doubles as a regression test.

**Zero placements is a valid outcome and still earns.** A contribution no voter
ranked takes the leftover-position average, so it can land inside the paid curve
when the field is small - in the shipped scenario `#45` earns 10 with nobody
having placed it. Submitting work that nobody got to is not the same as
submitting nothing. It can never outrank a contribution that *was* placed
(`timesRanked` is a tie-break), so it settles at the bottom and earns whatever
the curve pays there - which is nothing once the field is longer than
`respectScores`.

## Development

```bash
npm install
npm run typecheck
npm test
npm run test:coverage   # 80% line/statement/function floor, 70% branch
```

Handlers are written against `GitHubClient` and `Store` interfaces, so the whole
period runs against an in-memory fake in `src/testing/fakes.ts` -
`tests/cycle.test.ts` plays open -> snapshot -> tally directly, and
`tests/replay.test.ts` plays the same cycle through recorded webhook deliveries.

## Deviations from the PRD

The PRD is the spec; these five points differ, each for a stated reason.

1. **Ballots come from Discussion comments, not per-voter board order.** Projects
   v2 has no per-voter ordering to read. Board order remains a single-ballot
   fallback. This is the PRD's own risk 5 mitigation, promoted to the default.
2. **Discussions and Projects use GraphQL.** They have no REST v3 endpoints; the
   PRD's REST-only plan cannot create a Discussion. Issues, users, and file
   commits still use REST.
3. **Node runtime, not edge.** GitHub App auth (`@octokit/auth-app`) wants Node
   crypto. Webhook signature checks use Web Crypto and would run either way.
4. **Vitest, not Jest.** Same coverage floor, no ESM/TS transform configuration.
5. **Plain CSS, not Tailwind v4.** The leaderboard is a static file with no build
   step, and a CDN stylesheet would break the "no external deps" property.

Also added beyond the PRD: partial-ballot handling, deterministic tie-breaks, a
working median-of-medians implementation, dry-run mode on every cycle step, and
`minVoters` enforcement that refuses the week loudly instead of awarding Respect
to a two-person quorum.

## Phase 2 (not built)

Wallet binding via EIP-191, `@ordao/orclient` submission
(`proposeBreakoutResult`), OREC voting, Respect1155 minting, Farcaster SIWF, and
seed-list vote weighting. `config.ordao` is parsed and forced to `enabled: false`
so a config copied from a Phase 2 fork cannot make Phase 1 attempt a transaction.
