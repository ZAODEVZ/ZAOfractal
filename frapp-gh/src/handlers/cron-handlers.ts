import { bordaCount, medianOfMedians } from "../lib/borda-count.js";
import { weekLabel } from "../lib/config-loader.js";
import type { GitHubClient } from "../lib/github-api.js";
import { buildLeaderboard } from "../lib/leaderboard.js";
import { parseRankingComment, parseContributionBody, validateBallot } from "../lib/parsing.js";
import { assignRespect, buildRespectMap, totalRespect } from "../lib/respect-scorer.js";
import type { Store } from "../lib/storage.js";
import type {
  ContributionIssue,
  FrameworkConfig,
  TallyResult,
  VoteSnapshot,
  VoterRanking,
  WeekState,
} from "../lib/types.js";
import { accountAgeDays, cycleWindow, weekNumberFor } from "../lib/week.js";
import {
  cycleNoun,
  projectTitle,
  renderResults,
  renderSessionBody,
  renderTallyFailure,
  renderVotingClosed,
  sessionTitle,
} from "./formatting.js";

export interface CycleContext {
  config: FrameworkConfig;
  client: GitHubClient;
  store: Store;
  now: Date;
  /** When true, compute and report but do not write anything to GitHub. */
  dryRun?: boolean;
}

export interface HandlerResult<T> {
  ok: boolean;
  week: number;
  message: string;
  data?: T;
}

function resolveWeek(ctx: CycleContext, week?: number): number {
  return week ?? weekNumberFor(ctx.config, ctx.now);
}

function isBot(login: string, type?: string): boolean {
  return type === "Bot" || /\[bot\]$/i.test(login);
}

/** Monday 6pm: open the session Discussion and the ranking board. */
export async function openSession(
  ctx: CycleContext,
  week?: number,
): Promise<HandlerResult<WeekState>> {
  const weekNumber = resolveWeek(ctx, week);
  const window = cycleWindow(ctx.config, ctx.now);
  window.weekNumber = weekNumber;
  const label = weekLabel(ctx.config, weekNumber);
  const title = sessionTitle(weekNumber, ctx.config);
  const noun = cycleNoun(ctx.config);

  const existingState = await ctx.store.readWeekState(weekNumber);
  if (existingState && existingState.status !== "open") {
    return {
      ok: false,
      week: weekNumber,
      message: `${noun} ${weekNumber} is already ${existingState.status}; refusing to reopen.`,
      data: existingState,
    };
  }

  // Precondition: the Discussion category must already exist. Creating one is
  // not possible through the API, so this has to be a repo-settings step and
  // the failure has to name it precisely.
  const category = ctx.config.github.discussionCategory;
  const categories = await ctx.client.listDiscussionCategories();
  if (!categories.includes(category)) {
    return {
      ok: false,
      week: weekNumber,
      message:
        categories.length === 0
          ? `Discussions are not enabled on ${ctx.config.github.owner}/${ctx.config.github.repo}. ` +
            `Turn on Settings > General > Features > Discussions, then add a category named "${category}".`
          : `No Discussion category named "${category}". Create it under Discussions > Categories ` +
            `(or point github.discussionCategory at one of: ${categories.join(", ")}).`,
    };
  }

  if (ctx.dryRun) {
    return { ok: true, week: weekNumber, message: `[dry-run] would open ${noun.toLowerCase()} ${weekNumber}` };
  }

  await ctx.client.ensureLabel(label, `Frapp-GH ${noun.toLowerCase()} ${weekNumber} contribution`, "5319E7");

  let discussion = await ctx.client.findDiscussionByTitle(title);
  if (!discussion) {
    discussion = await ctx.client.createDiscussion(
      title,
      renderSessionBody(ctx.config, window),
      ctx.config.github.discussionCategory,
    );
  }

  let projectId = existingState?.projectId;
  let projectUrl = existingState?.projectUrl;
  if (ctx.config.github.projectNumber === undefined) {
    // The board is a nice-to-have view; ranking happens in Discussion comments.
    // Project creation needs org-level scope, so a failure must not sink the week.
    try {
      const boardTitle = projectTitle(weekNumber, ctx.config);
      const board =
        (await ctx.client.findProjectByTitle(boardTitle)) ??
        (await ctx.client.createProject(boardTitle, `${noun} ${weekNumber} contributions`));
      projectId = board.id;
      projectUrl = board.url;
    } catch (err) {
      console.warn(`[frapp-gh] could not set up a project board: ${(err as Error).message}`);
    }
  }

  const state: WeekState = {
    weekNumber,
    status: "open",
    discussionId: discussion.id,
    discussionNumber: discussion.number,
    discussionUrl: discussion.url,
    projectId,
    projectUrl,
    startedAt: window.opensAt.toISOString(),
    contributionCount: 0,
    voterCount: 0,
    respectDistributed: {},
  };
  await ctx.store.writeWeekState(state);

  return {
    ok: true,
    week: weekNumber,
    message: `${noun} ${weekNumber} open: ${discussion.url}`,
    data: state,
  };
}

async function loadBallot(ctx: CycleContext, week: number): Promise<ContributionIssue[]> {
  const label = weekLabel(ctx.config, week);
  const issues = await ctx.client.listIssuesByLabel(label);
  const criteria = ctx.config.contributionCriteria.map((c) => c.label);
  const denied = new Set((ctx.config.denyList ?? []).map((n) => n.toLowerCase()));

  return issues
    .filter((issue) => !denied.has(issue.author.toLowerCase()) && !isBot(issue.author))
    .map((issue) => {
      const parsed = parseContributionBody(issue.body, criteria);
      return { ...issue, evidence: parsed.evidence, criteria: parsed.criteria };
    });
}

/** Saturday EOD: read every ballot, check eligibility, commit the snapshot. */
export async function snapshotVotes(
  ctx: CycleContext,
  week?: number,
): Promise<HandlerResult<VoteSnapshot>> {
  const weekNumber = resolveWeek(ctx, week);
  const state = await ctx.store.readWeekState(weekNumber);
  if (!state) {
    return {
      ok: false,
      week: weekNumber,
      message: `No state for ${cycleNoun(ctx.config).toLowerCase()} ${weekNumber}. Run open first.`,
    };
  }

  const contributions = await loadBallot(ctx, weekNumber);
  const ballot = contributions.map((c) => c.number);
  const voters: Record<string, VoterRanking> = {};

  // Primary ranking surface: comments in the session Discussion. Latest comment
  // from a voter wins, so a voter can correct their ballot by posting again.
  if (state.discussionNumber !== undefined) {
    const comments = await ctx.client.listDiscussionComments(state.discussionNumber);
    for (const comment of comments) {
      const parsed = parseRankingComment(comment.body);
      if (!parsed) continue;
      const { issueNumbers } = validateBallot(parsed.issueNumbers, ballot);
      voters[comment.author] = {
        githubUsername: comment.author,
        accountAge: 0,
        eligibleTier: "tier-1",
        ranking: { issueNumbers },
        submittedAt: comment.createdAt,
        source: "discussion-comment",
      };
    }
  }

  // Fallback (PRD risk 5): Projects v2 exposes one shared board order, not a
  // per-voter order. If nobody commented a ballot, treat the board order as a
  // single facilitator ballot rather than losing the week entirely.
  const projectNumber = ctx.config.github.projectNumber;
  if (Object.keys(voters).length === 0 && projectNumber !== undefined) {
    const order = await ctx.client.getProjectItemOrder(projectNumber);
    const { issueNumbers } = validateBallot(order, ballot);
    if (issueNumbers.length > 0) {
      voters["project-board"] = {
        githubUsername: "project-board",
        accountAge: Number.MAX_SAFE_INTEGER,
        eligibleTier: "tier-1",
        ranking: { issueNumbers },
        submittedAt: ctx.now.toISOString(),
        source: "project-board",
      };
    }
  }

  // Eligibility: account age floor, deny list, no bots, no empty ballots.
  const minAge = ctx.config.ranking.minAccountAgeDays ?? 14;
  const denied = new Set((ctx.config.denyList ?? []).map((n) => n.toLowerCase()));

  for (const voter of Object.values(voters)) {
    if (voter.source === "project-board") continue;
    if (denied.has(voter.githubUsername.toLowerCase())) {
      voter.rejected = "on the repo deny list";
      continue;
    }
    const user = await ctx.client.getUser(voter.githubUsername);
    if (!user) {
      voter.rejected = "GitHub account not found";
      continue;
    }
    if (isBot(user.login, user.type)) {
      voter.rejected = "bots do not vote in Phase 1";
      continue;
    }
    voter.accountAge = accountAgeDays(user.createdAt, ctx.now);
    if (voter.accountAge < minAge) {
      voter.rejected = `account is ${voter.accountAge} days old; ${minAge} required`;
      continue;
    }
    if (voter.ranking.issueNumbers.length === 0) {
      voter.rejected = "ballot listed no valid contributions";
    }
  }

  const snapshot: VoteSnapshot = {
    week: weekNumber,
    snapshotTimestamp: ctx.now.toISOString(),
    discussionNumber: state.discussionNumber,
    ballot,
    voters,
  };

  const accepted = Object.values(voters).filter((v) => !v.rejected).length;
  if (ctx.dryRun) {
    return {
      ok: true,
      week: weekNumber,
      message: `[dry-run] ${accepted} ballots, ${ballot.length} contributions`,
      data: snapshot,
    };
  }

  await ctx.store.writeSnapshot(snapshot);
  await ctx.store.writeWeekState({
    ...state,
    status: "voting-closed",
    votingClosedAt: ctx.now.toISOString(),
    contributionCount: ballot.length,
    voterCount: accepted,
  });
  if (state.discussionId) {
    await ctx.client.addDiscussionComment(
      state.discussionId,
      renderVotingClosed(snapshot, ctx.config),
    );
  }

  return {
    ok: true,
    week: weekNumber,
    message: `${cycleNoun(ctx.config)} ${weekNumber} snapshot: ${accepted} ballots over ${ballot.length} contributions`,
    data: snapshot,
  };
}

/** Sunday EOD: aggregate, assign Respect, post results, refresh leaderboard. */
export async function tallyResults(
  ctx: CycleContext,
  week?: number,
): Promise<HandlerResult<TallyResult>> {
  const weekNumber = resolveWeek(ctx, week);
  const state = await ctx.store.readWeekState(weekNumber);
  const snapshot = await ctx.store.readSnapshot(weekNumber);

  if (!state || !snapshot) {
    return {
      ok: false,
      week: weekNumber,
      message: `${cycleNoun(ctx.config)} ${weekNumber} has no ${
        !state ? "state" : "vote snapshot"
      }. Run snapshot first.`,
    };
  }

  const allVoters = Object.values(snapshot.voters);
  const accepted = allVoters.filter((v) => !v.rejected && v.ranking.issueNumbers.length > 0);
  const rejectedVoters = allVoters
    .filter((v) => v.rejected)
    .map((v) => ({ username: v.githubUsername, reason: v.rejected as string }));

  if (accepted.length < ctx.config.ranking.minVoters) {
    const reason = `Only ${accepted.length} eligible ballot(s); ${ctx.config.ranking.minVoters} required.`;
    if (!ctx.dryRun && state.discussionId) {
      await ctx.client.addDiscussionComment(
        state.discussionId,
        renderTallyFailure(weekNumber, reason, ctx.config),
      );
    }
    return { ok: false, week: weekNumber, message: reason };
  }

  const contributions = await loadBallot(ctx, weekNumber);
  const issueMap = new Map(contributions.map((c) => [c.number, c]));
  const ballot = snapshot.ballot.filter((n) => issueMap.has(n));

  const input = { ballot, voters: accepted };
  const scored =
    ctx.config.ranking.algorithm === "median-of-medians"
      ? medianOfMedians(input, {
          breakoutSize: ctx.config.ranking.breakoutSize,
          seed: weekNumber,
        })
      : bordaCount(input);

  const ranked = assignRespect(scored, issueMap, ctx.config.ranking);
  const respectDistributed = buildRespectMap(ranked);

  const result: TallyResult = {
    week: weekNumber,
    method: ctx.config.ranking.algorithm,
    voterCount: accepted.length,
    contributionCount: ballot.length,
    ranked,
    respectDistributed,
    totalRespect: totalRespect(respectDistributed),
    rejectedVoters,
    tallyCompletedAt: ctx.now.toISOString(),
  };

  if (ctx.dryRun) {
    return {
      ok: true,
      week: weekNumber,
      message: `[dry-run] tallied ${cycleNoun(ctx.config).toLowerCase()} ${weekNumber}`,
      data: result,
    };
  }

  const contributionTitles: Record<string, string> = {};
  for (const entry of ranked) {
    if (entry.respectAwarded > 0 && !contributionTitles[entry.author]) {
      contributionTitles[entry.author] = entry.title;
    }
  }

  const completed: WeekState = {
    ...state,
    status: "completed",
    tallyCompletedAt: result.tallyCompletedAt,
    contributionCount: result.contributionCount,
    voterCount: result.voterCount,
    respectDistributed,
    tallyMethod: result.method,
    contributionTitles,
  };
  await ctx.store.writeWeekState(completed);

  if (state.discussionId) {
    await ctx.client.addDiscussionComment(state.discussionId, renderResults(result, ctx.config));
  }

  await refreshLeaderboard(ctx, completed);

  return {
    ok: true,
    week: weekNumber,
    message: `${cycleNoun(ctx.config)} ${weekNumber} tallied: ${result.totalRespect} Respect across ${
      Object.keys(respectDistributed).length
    } members`,
    data: result,
  };
}

/** Recompute the public leaderboard from every committed week state. */
export async function refreshLeaderboard(
  ctx: CycleContext,
  justCompleted?: WeekState,
): Promise<HandlerResult<number>> {
  const weekNumbers = new Set(await ctx.store.listWeeks());
  if (justCompleted) weekNumbers.add(justCompleted.weekNumber);

  const states: WeekState[] = [];
  for (const weekNumber of [...weekNumbers].sort((a, b) => a - b)) {
    if (justCompleted && weekNumber === justCompleted.weekNumber) {
      states.push(justCompleted);
      continue;
    }
    const state = await ctx.store.readWeekState(weekNumber);
    if (state) states.push(state);
  }

  const leaderboard = buildLeaderboard(ctx.config.community, states, {
    asOf: ctx.now.toISOString(),
  });
  if (!ctx.dryRun) await ctx.store.writeLeaderboard(leaderboard);

  return {
    ok: true,
    week: justCompleted?.weekNumber ?? 0,
    message: `Leaderboard: ${leaderboard.entries.length} members, ${leaderboard.totalRespectDistributed} Respect`,
    data: leaderboard.entries.length,
  };
}
