# Frapp-GH

GitHub-native async fractal governance. Runs the ZAO Respect Game on Issues,
Discussions, and Projects - no call to attend, no chain to touch.

Phase 1 (this repo): async ranking, off-chain. Contributions are Issues, ballots
are Discussion comments, aggregation is Borda count, Respect is the ZAO 2x
Fibonacci curve, and everything is committed back to the repo as JSON.

Built from `research/06-frapp-gh-prd.md` in this repo.

**Origin:** developed 2026-08-26 as a standalone repo at `~/Documents/frapp-gh`
(three commits: scaffold, Phase 1, period numbering), then moved in here so
ZAOfractal is the single home for everything fractal - docs, data, and the tools
that run the game. The standalone copy is dead; this is the live tree. Paths in
this README are relative to `frapp-gh/`.

## The week

| When | What happens | Who |
|---|---|---|
| Mon 18:00 ET | Session Discussion opens, ranking board created, week label ensured | `fractal-open` workflow |
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
order per project, not a per-voter order (PRD risk 5). Discussion comments give
each voter their own ballot and leave a public audit trail. If a
`github.projectNumber` is configured and nobody comments a ballot, the board
order is counted as a single facilitator ballot rather than losing the week.

### Results

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

**Respect:** `[110, 68, 42, 26, 16, 10]` by final rank. Rank 7 and beyond earn 0,
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
   `2026-08-24T18:00:00-04:00` = **period 110**, which is the session Monday for
   the award ZAOfractal `data/periods.json` records on 2026-08-25. On-chain
   awards land after the OREC vote window, so the award timestamp is not the
   session date - period 109 (Mon 08-17) and 110 (Mon 08-24) are consecutive
   Mondays. Sessions read "Period 111", labels read `period-111-contribution`.
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

## Layout

```
src/lib/          config, scheduling, aggregation, Respect curve, parsing, storage, GitHub adapter
src/handlers/     cycle handlers (open/snapshot/tally), webhook handlers, markdown rendering
src/app.ts        Hono routes
scripts/          cycle runner (used by Actions), offline tally, setup check
public/           static leaderboard (no build step)
.github/workflows/ fractal-open, fractal-snapshot, fractal-tally, ci
.github/frapp-gh/  committed week state and vote snapshots
```

State lives in git, so the audit trail is the commit history:

```
.github/frapp-gh/week-52/state.json
.github/frapp-gh/vote-snapshots/week-52.json
public/leaderboard.json
```

## Development

```bash
npm install
npm run typecheck
npm test
npm run test:coverage   # 80% line/statement/function floor, 70% branch
```

Handlers are written against `GitHubClient` and `Store` interfaces, so the whole
week runs against an in-memory fake in `tests/fakes.ts` - `tests/cycle.test.ts`
plays a full open -> snapshot -> tally cycle with no network.

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
