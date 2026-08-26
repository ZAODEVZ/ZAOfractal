/** Parsing for contribution issue bodies and voter ranking comments. */

export interface ParsedContribution {
  evidence: string[];
  criteria: string[];
  /** Reasons the body does not match the template. Empty = well formed. */
  problems: string[];
}

const URL_RE = /https?:\/\/[^\s<>()\]]+/g;
const SHORT_REF_RE = /(?:^|\s)([\w.-]+\/[\w.-]+)#(\d+)\b/g;

/** Pull PR / commit / screenshot links out of an issue body. */
export function extractEvidence(body: string): string[] {
  const out = new Set<string>();
  for (const match of body.matchAll(URL_RE)) out.add(match[0].replace(/[.,]$/, ""));
  for (const match of body.matchAll(SHORT_REF_RE)) out.add(`${match[1]}#${match[2]}`);
  return [...out];
}

/**
 * Read the criteria tags a contributor claimed. Accepts either the
 * "## Criteria Tags" section or an inline "[Vision, Contribution]" line.
 */
export function extractCriteria(body: string, known: string[]): string[] {
  const lower = known.map((k) => k.toLowerCase());
  const found = new Set<string>();

  const bracketed = body.match(/\[([^\]]+)\]/g) ?? [];
  for (const group of bracketed) {
    for (const raw of group.slice(1, -1).split(",")) {
      const index = lower.indexOf(raw.trim().toLowerCase());
      if (index >= 0) found.add(known[index] as string);
    }
  }

  const section = body.match(/##\s*Criteria(?:\s*Tags)?\s*\n([\s\S]*?)(?:\n##|$)/i);
  if (section?.[1]) {
    for (const raw of section[1].split(/[,\n]/)) {
      const cleaned = raw.replace(/^[-*\s[\]]+|[\s[\]]+$/g, "");
      const index = lower.indexOf(cleaned.toLowerCase());
      if (index >= 0) found.add(known[index] as string);
    }
  }

  return [...found];
}

export function parseContributionBody(body: string, knownCriteria: string[]): ParsedContribution {
  const evidence = extractEvidence(body ?? "");
  const criteria = extractCriteria(body ?? "", knownCriteria);
  const problems: string[] = [];

  if (!body || body.trim().length < 30) {
    problems.push("Body is very short - describe what you did so peers can rank it fairly.");
  }
  if (evidence.length === 0) {
    problems.push("No evidence link found (PR, commit, doc, or screenshot URL).");
  }
  if (knownCriteria.length > 0 && criteria.length === 0) {
    problems.push(`No criteria tag found. Expected one of: ${knownCriteria.join(", ")}.`);
  }

  return { evidence, criteria, problems };
}

export interface ParsedBallot {
  issueNumbers: number[];
  problems: string[];
}

const RANK_COMMAND_RE = /(?:^|\n)\s*(?:\/rank|rank:)\s*(.+)/i;

/**
 * Parse a voter's ranking comment. Two accepted shapes:
 *
 *   /rank #12 #4 #7
 *
 *   1. #12
 *   2. #4
 *   3. #7
 *
 * Duplicates are dropped, keeping the first (best) placement.
 */
export function parseRankingComment(comment: string): ParsedBallot | null {
  if (!comment) return null;
  const problems: string[] = [];
  let numbers: number[] = [];

  const command = comment.match(RANK_COMMAND_RE);
  if (command?.[1]) {
    numbers = [...command[1].matchAll(/#?(\d+)/g)].map((m) => Number(m[1]));
  } else {
    const ordered = [...comment.matchAll(/(?:^|\n)\s*(\d+)[.)]\s*#(\d+)/g)];
    if (ordered.length === 0) return null;
    numbers = ordered
      .map((m) => ({ position: Number(m[1]), issue: Number(m[2]) }))
      .sort((a, b) => a.position - b.position)
      .map((entry) => entry.issue);
  }

  const seen = new Set<number>();
  const deduped: number[] = [];
  for (const n of numbers) {
    if (!Number.isInteger(n) || n <= 0) continue;
    if (seen.has(n)) {
      problems.push(`Issue #${n} listed more than once; kept the highest placement.`);
      continue;
    }
    seen.add(n);
    deduped.push(n);
  }

  if (deduped.length === 0) return null;
  return { issueNumbers: deduped, problems };
}

/** Drop issues that are not on this week's ballot; report what was dropped. */
export function validateBallot(
  issueNumbers: number[],
  ballot: number[],
): { issueNumbers: number[]; problems: string[] } {
  const ballotSet = new Set(ballot);
  const problems: string[] = [];
  const kept = issueNumbers.filter((n) => {
    if (ballotSet.has(n)) return true;
    problems.push(`Issue #${n} is not a contribution in this week's session; ignored.`);
    return false;
  });
  return { issueNumbers: kept, problems };
}
