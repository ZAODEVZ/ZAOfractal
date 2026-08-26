import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import type { ContributionIssue } from "./types.js";

export interface GitHubUser {
  login: string;
  createdAt: string;
  type: string;
}

export interface DiscussionRef {
  id: string;
  number: number;
  url: string;
  title: string;
}

export interface DiscussionComment {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface ProjectRef {
  id: string;
  number: number;
  url: string;
}

/**
 * The surface the handlers need. Kept as an interface so tests can run the
 * whole cycle against an in-memory fake instead of the network.
 */
export interface GitHubClient {
  listIssuesByLabel(label: string): Promise<ContributionIssue[]>;
  getUser(login: string): Promise<GitHubUser | null>;
  createIssueComment(issueNumber: number, body: string): Promise<void>;
  addLabel(issueNumber: number, label: string): Promise<void>;
  ensureLabel(label: string, description: string, color: string): Promise<void>;
  closeIssue(issueNumber: number, reason?: string): Promise<void>;

  /** Category names available on the repo. Empty means Discussions are off. */
  listDiscussionCategories(): Promise<string[]>;
  findDiscussionByTitle(title: string): Promise<DiscussionRef | null>;
  createDiscussion(title: string, body: string, categoryName: string): Promise<DiscussionRef>;
  addDiscussionComment(discussionId: string, body: string): Promise<void>;
  listDiscussionComments(discussionNumber: number): Promise<DiscussionComment[]>;

  findProjectByTitle(title: string): Promise<ProjectRef | null>;
  createProject(title: string, shortDescription: string): Promise<ProjectRef>;
  addIssueToProject(projectId: string, issueNodeId: string): Promise<void>;
  /** Issue numbers in current board order (top to bottom). */
  getProjectItemOrder(projectNumber: number): Promise<number[]>;

  getFile(path: string): Promise<{ content: string; sha: string } | null>;
  putFile(path: string, content: string, message: string): Promise<void>;
}

export interface OctokitClientOptions {
  owner: string;
  repo: string;
  octokit: Octokit;
}

const DISCUSSION_CATEGORY_QUERY = `
  query($owner: String!, $repo: String!) {
    repository(owner: $owner, name: $repo) {
      id
      discussionCategories(first: 25) { nodes { id name } }
    }
  }`;

const DISCUSSION_SEARCH_QUERY = `
  query($owner: String!, $repo: String!) {
    repository(owner: $owner, name: $repo) {
      discussions(first: 50, orderBy: { field: CREATED_AT, direction: DESC }) {
        nodes { id number url title }
      }
    }
  }`;

const DISCUSSION_COMMENTS_QUERY = `
  query($owner: String!, $repo: String!, $number: Int!, $cursor: String) {
    repository(owner: $owner, name: $repo) {
      discussion(number: $number) {
        comments(first: 100, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          nodes { id body createdAt author { login } }
        }
      }
    }
  }`;

const PROJECT_ITEMS_QUERY = `
  query($owner: String!, $repo: String!, $number: Int!, $cursor: String) {
    repository(owner: $owner, name: $repo) {
      projectV2(number: $number) {
        items(first: 100, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          nodes { content { ... on Issue { number } } }
        }
      }
    }
  }`;

export class OctokitGitHubClient implements GitHubClient {
  private readonly owner: string;
  private readonly repo: string;
  private readonly octokit: Octokit;
  private repositoryId?: string;

  constructor(options: OctokitClientOptions) {
    this.owner = options.owner;
    this.repo = options.repo;
    this.octokit = options.octokit;
  }

  private async graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    return this.octokit.graphql<T>(query, {
      owner: this.owner,
      repo: this.repo,
      ...variables,
    });
  }

  async listIssuesByLabel(label: string): Promise<ContributionIssue[]> {
    const issues = await this.octokit.paginate(this.octokit.rest.issues.listForRepo, {
      owner: this.owner,
      repo: this.repo,
      labels: label,
      state: "all",
      per_page: 100,
    });

    return issues
      .filter((issue) => !issue.pull_request)
      .map((issue) => ({
        id: issue.node_id,
        number: issue.number,
        title: issue.title,
        body: issue.body ?? "",
        labels: issue.labels.map((l) => (typeof l === "string" ? l : (l.name ?? ""))),
        author: issue.user?.login ?? "unknown",
        createdAt: issue.created_at,
      }));
  }

  async getUser(login: string): Promise<GitHubUser | null> {
    try {
      const { data } = await this.octokit.rest.users.getByUsername({ username: login });
      return { login: data.login, createdAt: data.created_at, type: data.type };
    } catch (err) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  }

  async createIssueComment(issueNumber: number, body: string): Promise<void> {
    await this.octokit.rest.issues.createComment({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      body,
    });
  }

  async addLabel(issueNumber: number, label: string): Promise<void> {
    await this.octokit.rest.issues.addLabels({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      labels: [label],
    });
  }

  async ensureLabel(label: string, description: string, color: string): Promise<void> {
    try {
      await this.octokit.rest.issues.getLabel({
        owner: this.owner,
        repo: this.repo,
        name: label,
      });
    } catch (err) {
      if ((err as { status?: number }).status !== 404) throw err;
      await this.octokit.rest.issues.createLabel({
        owner: this.owner,
        repo: this.repo,
        name: label,
        description,
        color,
      });
    }
  }

  async closeIssue(issueNumber: number, reason = "not_planned"): Promise<void> {
    await this.octokit.rest.issues.update({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      state: "closed",
      state_reason: reason as "not_planned" | "completed",
    });
  }

  async listDiscussionCategories(): Promise<string[]> {
    try {
      const { categories } = await this.loadCategories();
      return [...categories.keys()];
    } catch (err) {
      // Discussions disabled on the repo: GraphQL returns an error, not an
      // empty list. Treat both as "no categories" so callers can say so plainly.
      console.warn(`[frapp-gh] could not read discussion categories: ${(err as Error).message}`);
      return [];
    }
  }

  async findDiscussionByTitle(title: string): Promise<DiscussionRef | null> {
    const data = await this.graphql<{
      repository: { discussions: { nodes: DiscussionRef[] } };
    }>(DISCUSSION_SEARCH_QUERY, {});
    return data.repository.discussions.nodes.find((d) => d.title === title) ?? null;
  }

  private async loadCategories(): Promise<{ repoId: string; categories: Map<string, string> }> {
    const data = await this.graphql<{
      repository: { id: string; discussionCategories: { nodes: Array<{ id: string; name: string }> } };
    }>(DISCUSSION_CATEGORY_QUERY, {});
    this.repositoryId = data.repository.id;
    return {
      repoId: data.repository.id,
      categories: new Map(data.repository.discussionCategories.nodes.map((n) => [n.name, n.id])),
    };
  }

  async createDiscussion(title: string, body: string, categoryName: string): Promise<DiscussionRef> {
    const { repoId, categories } = await this.loadCategories();
    const categoryId = categories.get(categoryName);
    if (!categoryId) {
      throw new Error(
        `Discussion category "${categoryName}" not found. Create it in repo settings first. ` +
          `Available: ${[...categories.keys()].join(", ") || "(none - enable Discussions)"}`,
      );
    }
    const data = await this.octokit.graphql<{
      createDiscussion: { discussion: DiscussionRef };
    }>(
      `mutation($repoId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
         createDiscussion(input: { repositoryId: $repoId, categoryId: $categoryId, title: $title, body: $body }) {
           discussion { id number url title }
         }
       }`,
      { repoId, categoryId, title, body },
    );
    return data.createDiscussion.discussion;
  }

  async addDiscussionComment(discussionId: string, body: string): Promise<void> {
    await this.octokit.graphql(
      `mutation($discussionId: ID!, $body: String!) {
         addDiscussionComment(input: { discussionId: $discussionId, body: $body }) { comment { id } }
       }`,
      { discussionId, body },
    );
  }

  async listDiscussionComments(discussionNumber: number): Promise<DiscussionComment[]> {
    const out: DiscussionComment[] = [];
    let cursor: string | null = null;
    do {
      const data: any = await this.graphql(DISCUSSION_COMMENTS_QUERY, {
        number: discussionNumber,
        cursor,
      });
      const page = data.repository.discussion?.comments;
      if (!page) break;
      for (const node of page.nodes) {
        out.push({
          id: node.id,
          author: node.author?.login ?? "unknown",
          body: node.body ?? "",
          createdAt: node.createdAt,
        });
      }
      cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
    } while (cursor);
    return out;
  }

  async findProjectByTitle(title: string): Promise<ProjectRef | null> {
    const data = await this.graphql<{
      repository: { projectsV2: { nodes: Array<ProjectRef & { title: string }> } };
    }>(
      `query($owner: String!, $repo: String!) {
         repository(owner: $owner, name: $repo) {
           projectsV2(first: 50) { nodes { id number url title } }
         }
       }`,
      {},
    );
    return data.repository.projectsV2.nodes.find((p) => p.title === title) ?? null;
  }

  async createProject(title: string, shortDescription: string): Promise<ProjectRef> {
    if (!this.repositoryId) await this.loadCategories();
    const ownerData = await this.graphql<{ repository: { owner: { id: string } } }>(
      `query($owner: String!, $repo: String!) {
         repository(owner: $owner, name: $repo) { owner { id } }
       }`,
      {},
    );
    const created = await this.octokit.graphql<{ createProjectV2: { projectV2: ProjectRef } }>(
      `mutation($ownerId: ID!, $title: String!, $repositoryId: ID!) {
         createProjectV2(input: { ownerId: $ownerId, title: $title, repositoryId: $repositoryId }) {
           projectV2 { id number url }
         }
       }`,
      { ownerId: ownerData.repository.owner.id, title, repositoryId: this.repositoryId },
    );
    const project = created.createProjectV2.projectV2;
    if (shortDescription) {
      await this.octokit.graphql(
        `mutation($projectId: ID!, $description: String!) {
           updateProjectV2(input: { projectId: $projectId, shortDescription: $description }) {
             projectV2 { id }
           }
         }`,
        { projectId: project.id, description: shortDescription },
      );
    }
    return project;
  }

  async addIssueToProject(projectId: string, issueNodeId: string): Promise<void> {
    await this.octokit.graphql(
      `mutation($projectId: ID!, $contentId: ID!) {
         addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) { item { id } }
       }`,
      { projectId, contentId: issueNodeId },
    );
  }

  async getProjectItemOrder(projectNumber: number): Promise<number[]> {
    const out: number[] = [];
    let cursor: string | null = null;
    do {
      const data: any = await this.graphql(PROJECT_ITEMS_QUERY, { number: projectNumber, cursor });
      const page = data.repository.projectV2?.items;
      if (!page) break;
      for (const node of page.nodes) {
        if (typeof node.content?.number === "number") out.push(node.content.number);
      }
      cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
    } while (cursor);
    return out;
  }

  async getFile(path: string): Promise<{ content: string; sha: string } | null> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
      });
      if (Array.isArray(data) || data.type !== "file") return null;
      return {
        content: Buffer.from(data.content, "base64").toString("utf-8"),
        sha: data.sha,
      };
    } catch (err) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  }

  async putFile(path: string, content: string, message: string): Promise<void> {
    const existing = await this.getFile(path);
    await this.octokit.rest.repos.createOrUpdateFileContents({
      owner: this.owner,
      repo: this.repo,
      path,
      message,
      content: Buffer.from(content, "utf-8").toString("base64"),
      ...(existing ? { sha: existing.sha } : {}),
    });
  }
}

export interface AuthEnv {
  GITHUB_TOKEN?: string;
  GITHUB_APP_ID?: string;
  GITHUB_APP_PRIVATE_KEY?: string;
  GITHUB_APP_INSTALLATION_ID?: string;
}

/**
 * Prefers GitHub App installation auth (what the deployed webhook uses) and
 * falls back to a plain token (what Actions and local scripts use).
 */
export function createOctokit(env: AuthEnv): Octokit {
  if (env.GITHUB_APP_ID && env.GITHUB_APP_PRIVATE_KEY && env.GITHUB_APP_INSTALLATION_ID) {
    return new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: env.GITHUB_APP_ID,
        privateKey: env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, "\n"),
        installationId: env.GITHUB_APP_INSTALLATION_ID,
      },
    });
  }
  if (env.GITHUB_TOKEN) return new Octokit({ auth: env.GITHUB_TOKEN });
  throw new Error(
    "No GitHub credentials. Set GITHUB_TOKEN, or GITHUB_APP_ID + GITHUB_APP_PRIVATE_KEY + GITHUB_APP_INSTALLATION_ID.",
  );
}
