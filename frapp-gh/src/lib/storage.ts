import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type { GitHubClient } from "./github-api.js";
import type { Leaderboard, VoteSnapshot, WeekState } from "./types.js";

export const STATE_ROOT = ".github/frapp-gh";
export const LEADERBOARD_PATH = "public/leaderboard.json";

/**
 * Prefix a repo-relative path with the tool's directory. FsStore does not need
 * this - the Actions runner works inside frapp-gh/ - but every contents-API
 * write is resolved from the repository root.
 */
export function repoPath(prefix: string | undefined, path: string): string {
  const clean = (prefix ?? "").replace(/^\/+|\/+$/g, "");
  return clean ? `${clean}/${path}` : path;
}

export function weekStatePath(week: number): string {
  return `${STATE_ROOT}/week-${week}/state.json`;
}

export function snapshotPath(week: number): string {
  return `${STATE_ROOT}/vote-snapshots/week-${week}.json`;
}

/**
 * Where cycle state lives. GitHub is the source of truth, so both backends
 * write the same JSON paths - the Actions runner writes to the checkout and
 * commits, the serverless handler writes through the contents API.
 */
export interface Store {
  readWeekState(week: number): Promise<WeekState | null>;
  writeWeekState(state: WeekState): Promise<void>;
  readSnapshot(week: number): Promise<VoteSnapshot | null>;
  writeSnapshot(snapshot: VoteSnapshot): Promise<void>;
  readLeaderboard(): Promise<Leaderboard | null>;
  writeLeaderboard(leaderboard: Leaderboard): Promise<void>;
  listWeeks(): Promise<number[]>;
}

export class FsStore implements Store {
  constructor(private readonly root = process.cwd()) {}

  private read<T>(path: string): T | null {
    const full = join(this.root, path);
    if (!existsSync(full)) return null;
    return JSON.parse(readFileSync(full, "utf-8")) as T;
  }

  private write(path: string, value: unknown): void {
    const full = join(this.root, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
  }

  async readWeekState(week: number): Promise<WeekState | null> {
    return this.read<WeekState>(weekStatePath(week));
  }
  async writeWeekState(state: WeekState): Promise<void> {
    this.write(weekStatePath(state.weekNumber), state);
  }
  async readSnapshot(week: number): Promise<VoteSnapshot | null> {
    return this.read<VoteSnapshot>(snapshotPath(week));
  }
  async writeSnapshot(snapshot: VoteSnapshot): Promise<void> {
    this.write(snapshotPath(snapshot.week), snapshot);
  }
  async readLeaderboard(): Promise<Leaderboard | null> {
    return this.read<Leaderboard>(LEADERBOARD_PATH);
  }
  async writeLeaderboard(leaderboard: Leaderboard): Promise<void> {
    this.write(LEADERBOARD_PATH, leaderboard);
  }
  async listWeeks(): Promise<number[]> {
    const dir = join(this.root, STATE_ROOT);
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .map((name) => /^week-(\d+)$/.exec(name)?.[1])
      .filter((n): n is string => Boolean(n))
      .map(Number)
      .sort((a, b) => a - b);
  }
}

export class GitHubStore implements Store {
  /**
   * @param pathPrefix directory holding the tool inside the repo ("frapp-gh"),
   * or empty when the tool is the repo.
   */
  constructor(
    private readonly client: GitHubClient,
    private readonly pathPrefix = "",
  ) {}

  private full(path: string): string {
    return repoPath(this.pathPrefix, path);
  }

  private async read<T>(path: string): Promise<T | null> {
    const file = await this.client.getFile(this.full(path));
    if (!file) return null;
    try {
      return JSON.parse(file.content) as T;
    } catch {
      throw new Error(`${path} exists in the repo but is not valid JSON`);
    }
  }

  async readWeekState(week: number): Promise<WeekState | null> {
    return this.read<WeekState>(weekStatePath(week));
  }
  async writeWeekState(state: WeekState): Promise<void> {
    await this.client.putFile(
      this.full(weekStatePath(state.weekNumber)),
      `${JSON.stringify(state, null, 2)}\n`,
      `chore(frapp-gh): week ${state.weekNumber} state -> ${state.status}`,
    );
  }
  async readSnapshot(week: number): Promise<VoteSnapshot | null> {
    return this.read<VoteSnapshot>(snapshotPath(week));
  }
  async writeSnapshot(snapshot: VoteSnapshot): Promise<void> {
    await this.client.putFile(
      this.full(snapshotPath(snapshot.week)),
      `${JSON.stringify(snapshot, null, 2)}\n`,
      `chore(frapp-gh): week ${snapshot.week} vote snapshot (${Object.keys(snapshot.voters).length} voters)`,
    );
  }
  async readLeaderboard(): Promise<Leaderboard | null> {
    return this.read<Leaderboard>(LEADERBOARD_PATH);
  }
  async writeLeaderboard(leaderboard: Leaderboard): Promise<void> {
    await this.client.putFile(
      this.full(LEADERBOARD_PATH),
      `${JSON.stringify(leaderboard, null, 2)}\n`,
      "chore(frapp-gh): refresh leaderboard",
    );
  }
  async listWeeks(): Promise<number[]> {
    const leaderboard = await this.readLeaderboard();
    return leaderboard?.weeksCounted ?? [];
  }
}
