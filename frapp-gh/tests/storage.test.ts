import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  FsStore,
  GitHubStore,
  LEADERBOARD_PATH,
  snapshotPath,
  weekStatePath,
} from "../src/lib/storage.js";
import { FakeGitHub } from "./fakes.js";
import type { VoteSnapshot, WeekState } from "../src/lib/types.js";

const state: WeekState = {
  weekNumber: 52,
  status: "open",
  startedAt: "2026-05-25T22:00:00Z",
  contributionCount: 0,
  voterCount: 0,
  respectDistributed: {},
};

const snapshot: VoteSnapshot = {
  week: 52,
  snapshotTimestamp: "2026-05-30T22:00:00Z",
  ballot: [11, 12],
  voters: {},
};

const dirs: string[] = [];
function tempRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "frapp-gh-"));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  while (dirs.length) rmSync(dirs.pop() as string, { recursive: true, force: true });
});

describe("path helpers", () => {
  it("puts state and snapshots where the workflows commit them", () => {
    expect(weekStatePath(52)).toBe(".github/frapp-gh/week-52/state.json");
    expect(snapshotPath(52)).toBe(".github/frapp-gh/vote-snapshots/week-52.json");
  });
});

describe("FsStore", () => {
  it("round-trips state, snapshots, and the leaderboard", async () => {
    const store = new FsStore(tempRepo());
    expect(await store.readWeekState(52)).toBeNull();

    await store.writeWeekState(state);
    await store.writeSnapshot(snapshot);
    await store.writeLeaderboard({
      asOf: "2026-06-01T00:00:00Z",
      community: "The ZAO",
      totalRespectDistributed: 0,
      weeksCounted: [52],
      entries: [],
    });

    expect(await store.readWeekState(52)).toEqual(state);
    expect(await store.readSnapshot(52)).toEqual(snapshot);
    expect((await store.readLeaderboard())?.community).toBe("The ZAO");
  });

  it("lists week directories in order and ignores stray files", async () => {
    const root = tempRepo();
    const store = new FsStore(root);
    await store.writeWeekState({ ...state, weekNumber: 51 });
    await store.writeWeekState({ ...state, weekNumber: 52 });
    mkdirSync(join(root, ".github/frapp-gh/vote-snapshots"), { recursive: true });
    writeFileSync(join(root, ".github/frapp-gh/README.md"), "notes");

    expect(await store.listWeeks()).toEqual([51, 52]);
  });

  it("returns an empty week list on a fresh repo", async () => {
    expect(await new FsStore(tempRepo()).listWeeks()).toEqual([]);
  });
});

describe("GitHubStore", () => {
  it("writes JSON through the contents API with a descriptive message", async () => {
    const github = new FakeGitHub();
    const store = new GitHubStore(github);

    await store.writeWeekState(state);
    await store.writeSnapshot(snapshot);

    expect(github.files.has(weekStatePath(52))).toBe(true);
    expect(await store.readWeekState(52)).toEqual(state);
    expect(await store.readSnapshot(52)).toEqual(snapshot);
  });

  it("returns null for files that do not exist yet", async () => {
    const store = new GitHubStore(new FakeGitHub());
    expect(await store.readWeekState(52)).toBeNull();
    expect(await store.readSnapshot(52)).toBeNull();
    expect(await store.readLeaderboard()).toBeNull();
    expect(await store.listWeeks()).toEqual([]);
  });

  it("reports a corrupted state file instead of returning junk", async () => {
    const github = new FakeGitHub();
    github.files.set(weekStatePath(52), "{ half a file");
    await expect(new GitHubStore(github).readWeekState(52)).rejects.toThrow(/not valid JSON/);
  });

  it("derives the week list from the committed leaderboard", async () => {
    const github = new FakeGitHub();
    const store = new GitHubStore(github);
    await store.writeLeaderboard({
      asOf: "2026-06-01T00:00:00Z",
      community: "The ZAO",
      totalRespectDistributed: 178,
      weeksCounted: [51, 52],
      entries: [],
    });
    expect(github.files.has(LEADERBOARD_PATH)).toBe(true);
    expect(await store.listWeeks()).toEqual([51, 52]);
  });
});
