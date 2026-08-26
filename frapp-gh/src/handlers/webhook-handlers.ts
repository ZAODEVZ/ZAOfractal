import { weekLabel } from "../lib/config-loader.js";
import type { GitHubClient } from "../lib/github-api.js";
import { parseContributionBody, parseRankingComment } from "../lib/parsing.js";
import type { Store } from "../lib/storage.js";
import type { ContributionIssue, FrameworkConfig } from "../lib/types.js";
import { weekNumberFor } from "../lib/week.js";
import { cycleNoun, renderSubmissionAck, BOT_MARKER } from "./formatting.js";

export interface WebhookContext {
  config: FrameworkConfig;
  client: GitHubClient;
  store: Store;
  now: Date;
}

export interface WebhookOutcome {
  handled: boolean;
  action: string;
  detail?: string;
}

/**
 * Constant-time HMAC-SHA256 check of the X-Hub-Signature-256 header.
 * Uses Web Crypto so the same code runs on Node and on the edge.
 */
export async function verifySignature(
  payload: string,
  signatureHeader: string | undefined,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const expected = `sha256=${[...new Uint8Array(mac)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}`;

  if (expected.length !== signatureHeader.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signatureHeader.charCodeAt(i);
  }
  return diff === 0;
}

function toContribution(issue: any): ContributionIssue {
  return {
    id: issue.node_id,
    number: issue.number,
    title: issue.title,
    body: issue.body ?? "",
    labels: (issue.labels ?? []).map((l: any) => (typeof l === "string" ? l : l.name)),
    author: issue.user?.login ?? "unknown",
    createdAt: issue.created_at,
  };
}

/**
 * Issue events. The handler stays deliberately thin - validate, nudge, and add
 * the issue to this week's board. Aggregation happens in the cron jobs.
 */
export async function handleIssueEvent(
  ctx: WebhookContext,
  payload: any,
): Promise<WebhookOutcome> {
  const action = payload.action as string;
  if (!["opened", "edited", "labeled", "reopened", "unlabeled"].includes(action)) {
    return { handled: false, action, detail: "ignored action" };
  }

  const issue = toContribution(payload.issue ?? {});
  const week = weekNumberFor(ctx.config, ctx.now);
  const label = weekLabel(ctx.config, week);
  const noun = cycleNoun(ctx.config);

  // Withdrawing the label pulls the contribution off the ballot. Say so, so it
  // is not a silent removal that surfaces only when results look wrong.
  if (action === "unlabeled") {
    const removed = payload.label?.name;
    if (removed !== label) return { handled: false, action, detail: "unrelated label" };
    await ctx.client.createIssueComment(
      issue.number,
      `${BOT_MARKER}\nRemoved from the ${noun.toLowerCase()} ${week} ballot - the \`${label}\` label was taken off. ` +
        `Re-add it before voting closes to put this back in the running.`,
    );
    return { handled: true, action, detail: `withdrew #${issue.number} from the ballot` };
  }

  if (!issue.labels.includes(label)) {
    return { handled: false, action, detail: `not labeled ${label}` };
  }
  if ((ctx.config.denyList ?? []).some((n) => n.toLowerCase() === issue.author.toLowerCase())) {
    return { handled: false, action, detail: "author on deny list" };
  }
  if (/\[bot\]$/i.test(issue.author)) {
    return { handled: false, action, detail: "bot author" };
  }

  const criteria = ctx.config.contributionCriteria.map((c) => c.label);
  const parsed = parseContributionBody(issue.body, criteria);
  issue.evidence = parsed.evidence;
  issue.criteria = parsed.criteria;

  // Acknowledge once per issue. Editing a submission should not re-comment.
  if (action === "opened" || action === "labeled") {
    await ctx.client.createIssueComment(
      issue.number,
      renderSubmissionAck(ctx.config, week, issue, parsed.problems),
    );
  }

  if (ctx.config.enforcement === "hard" && parsed.problems.length > 0 && action === "opened") {
    await ctx.client.closeIssue(issue.number, "not_planned");
    return { handled: true, action, detail: "closed under hard enforcement" };
  }

  const state = await ctx.store.readWeekState(week);
  if (state?.projectId) {
    try {
      await ctx.client.addIssueToProject(state.projectId, issue.id);
    } catch (err) {
      console.warn(`[frapp-gh] could not add #${issue.number} to the board: ${(err as Error).message}`);
    }
  }

  if (state && action === "opened") {
    await ctx.store.writeWeekState({
      ...state,
      contributionCount: state.contributionCount + 1,
    });
  }

  return {
    handled: true,
    action,
    detail: `logged #${issue.number} by @${issue.author} (${parsed.problems.length} nudges)`,
  };
}

/** Discussion comments are the ranking surface; the webhook only logs them. */
export async function handleDiscussionCommentEvent(
  ctx: WebhookContext,
  payload: any,
): Promise<WebhookOutcome> {
  const action = payload.action as string;
  const body: string = payload.comment?.body ?? "";
  if (body.includes(BOT_MARKER)) return { handled: false, action, detail: "own comment" };

  // Use the same parser the snapshot uses. A cheaper regex here would report
  // "not a ballot" for numbered-list ballots that do in fact get counted, which
  // is worse than saying nothing.
  const ballot = parseRankingComment(body);
  return {
    handled: false,
    action,
    detail: ballot
      ? `ballot noted from @${payload.comment?.user?.login ?? "unknown"} (${
          ballot.issueNumbers.length
        } placed); counted at snapshot time`
      : "not a ballot",
  };
}

/**
 * Installation lifecycle. Nothing to provision - the config lives in the repo
 * and state lives in git - so this only records what happened, which is what
 * makes a missing installation diagnosable later.
 */
export async function handleInstallationEvent(
  _ctx: WebhookContext,
  payload: any,
): Promise<WebhookOutcome> {
  const action = payload.action as string;
  const account = payload.installation?.account?.login ?? "unknown";
  const repos: string[] = (payload.repositories ?? payload.repositories_added ?? []).map(
    (r: any) => r.full_name ?? r.name,
  );
  return {
    handled: true,
    action,
    detail: `installation ${action} for @${account}${repos.length ? ` on ${repos.join(", ")}` : ""}`,
  };
}
