import type {
  DiscussionComment,
  DiscussionRef,
  GitHubClient,
  GitHubUser,
  ProjectRef,
} from "../lib/github-api.js";
import type {
  ContributionIssue,
  Leaderboard,
  VoteSnapshot,
  WeekState,
} from "../lib/types.js";
import type { Store } from "../lib/storage.js";

export interface FakeSeed {
  issues?: ContributionIssue[];
  users?: Record<string, Partial<GitHubUser>>;
  discussionComments?: DiscussionComment[];
  projectOrder?: number[];
  /** Category names the repo exposes. Defaults to the ZAO category. */
  discussionCategories?: string[];
}

/**
 * In-memory GitHub. Records every write so tests - and the replay harness -
 * can assert on side effects without a live App or network.
 */
export class FakeGitHub implements GitHubClient {
  issues: ContributionIssue[];
  users: Record<string, GitHubUser>;
  discussionComments: DiscussionComment[];
  projectOrder: number[];
  discussionCategories: string[];

  discussions: DiscussionRef[] = [];
  projects: ProjectRef[] = [];
  issueComments: Array<{ issueNumber: number; body: string }> = [];
  postedDiscussionComments: Array<{ discussionId: string; body: string }> = [];
  labels: string[] = [];
  closedIssues: number[] = [];
  projectItems: string[] = [];
  files = new Map<string, string>();

  constructor(seed: FakeSeed = {}) {
    this.issues = seed.issues ?? [];
    this.discussionComments = seed.discussionComments ?? [];
    this.projectOrder = seed.projectOrder ?? [];
    this.discussionCategories = seed.discussionCategories ?? ["Fractal Sessions"];
    this.users = Object.fromEntries(
      Object.entries(seed.users ?? {}).map(([login, u]) => [
        login,
        {
          login,
          // Old enough to vote unless the test says otherwise.
          createdAt: u.createdAt ?? "2015-01-01T00:00:00Z",
          type: u.type ?? "User",
        },
      ]),
    );
  }

  async listIssuesByLabel(label: string): Promise<ContributionIssue[]> {
    return this.issues.filter((i) => i.labels.includes(label));
  }
  async getUser(login: string): Promise<GitHubUser | null> {
    return this.users[login] ?? null;
  }
  async createIssueComment(issueNumber: number, body: string): Promise<void> {
    this.issueComments.push({ issueNumber, body });
  }
  async addLabel(issueNumber: number, label: string): Promise<void> {
    const issue = this.issues.find((i) => i.number === issueNumber);
    issue?.labels.push(label);
  }
  async ensureLabel(label: string): Promise<void> {
    if (!this.labels.includes(label)) this.labels.push(label);
  }
  async closeIssue(issueNumber: number): Promise<void> {
    this.closedIssues.push(issueNumber);
  }
  async listDiscussionCategories(): Promise<string[]> {
    return this.discussionCategories;
  }
  async findDiscussionByTitle(title: string): Promise<DiscussionRef | null> {
    return this.discussions.find((d) => d.title === title) ?? null;
  }
  async createDiscussion(title: string): Promise<DiscussionRef> {
    const ref: DiscussionRef = {
      id: `D_${this.discussions.length + 1}`,
      number: 100 + this.discussions.length,
      url: `https://github.com/o/r/discussions/${100 + this.discussions.length}`,
      title,
    };
    this.discussions.push(ref);
    return ref;
  }
  async addDiscussionComment(discussionId: string, body: string): Promise<void> {
    this.postedDiscussionComments.push({ discussionId, body });
  }
  async listDiscussionComments(): Promise<DiscussionComment[]> {
    return this.discussionComments;
  }
  async findProjectByTitle(title: string): Promise<ProjectRef | null> {
    return this.projects.find((p) => p.url.endsWith(encodeURIComponent(title))) ?? null;
  }
  async createProject(title: string): Promise<ProjectRef> {
    const ref: ProjectRef = {
      id: `P_${this.projects.length + 1}`,
      number: this.projects.length + 1,
      url: `https://github.com/orgs/o/projects/${this.projects.length + 1}`,
    };
    this.projects.push(ref);
    void title;
    return ref;
  }
  async addIssueToProject(_projectId: string, issueNodeId: string): Promise<void> {
    this.projectItems.push(issueNodeId);
  }
  async getProjectItemOrder(): Promise<number[]> {
    return this.projectOrder;
  }
  async getFile(path: string) {
    const content = this.files.get(path);
    return content === undefined ? null : { content, sha: "sha" };
  }
  async putFile(path: string, content: string): Promise<void> {
    this.files.set(path, content);
  }
}

/** In-memory Store. */
export class MemoryStore implements Store {
  weeks = new Map<number, WeekState>();
  snapshots = new Map<number, VoteSnapshot>();
  leaderboard: Leaderboard | null = null;

  async readWeekState(week: number) {
    return this.weeks.get(week) ?? null;
  }
  async writeWeekState(state: WeekState) {
    this.weeks.set(state.weekNumber, structuredClone(state));
  }
  async readSnapshot(week: number) {
    return this.snapshots.get(week) ?? null;
  }
  async writeSnapshot(snapshot: VoteSnapshot) {
    this.snapshots.set(snapshot.week, structuredClone(snapshot));
  }
  async readLeaderboard() {
    return this.leaderboard;
  }
  async writeLeaderboard(leaderboard: Leaderboard) {
    this.leaderboard = structuredClone(leaderboard);
  }
  async listWeeks() {
    return [...this.weeks.keys()].sort((a, b) => a - b);
  }
}

export function makeIssue(
  number: number,
  author: string,
  label: string,
  overrides: Partial<ContributionIssue> = {},
): ContributionIssue {
  return {
    id: `I_${number}`,
    number,
    title: `Contribution #${number}`,
    body: `## What I Did\nShipped a real thing this week, described in enough detail to rank.\n\n## Evidence\nhttps://github.com/o/r/pull/${number}\n\n## Criteria Tags\n[Contribution]`,
    labels: [label],
    author,
    createdAt: "2026-05-26T12:00:00Z",
    ...overrides,
  };
}

export function makeComment(author: string, body: string, createdAt = "2026-05-30T12:00:00Z"): DiscussionComment {
  return { id: `DC_${author}_${createdAt}`, author, body, createdAt };
}
