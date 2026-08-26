import { readFileSync } from "node:fs";
import type { FrameworkConfig, RankingAlgorithm } from "./types.js";

export const CONFIG_FILENAME = "frapp-gh.config.json";

export const DEFAULT_RESPECT_SCORES = [110, 68, 42, 26, 16, 10];

export class ConfigError extends Error {}

/** Fills in optional fields and rejects configs that would produce a nonsense cycle. */
export function normalizeConfig(raw: unknown): FrameworkConfig {
  if (typeof raw !== "object" || raw === null) {
    throw new ConfigError("Config must be a JSON object");
  }
  const c = raw as Record<string, any>;

  if (!c.github?.owner || !c.github?.repo) {
    throw new ConfigError("config.github.owner and config.github.repo are required");
  }

  const algorithm: RankingAlgorithm = c.ranking?.algorithm ?? "borda";
  if (algorithm !== "borda" && algorithm !== "median-of-medians") {
    throw new ConfigError(`Unknown ranking algorithm: ${String(algorithm)}`);
  }

  const respectScores: number[] = c.ranking?.respectScores ?? DEFAULT_RESPECT_SCORES;
  if (!Array.isArray(respectScores) || respectScores.length === 0) {
    throw new ConfigError("config.ranking.respectScores must be a non-empty array");
  }
  if (respectScores.some((n) => typeof n !== "number" || n < 0)) {
    throw new ConfigError("config.ranking.respectScores must be non-negative numbers");
  }

  const issueLabel: string = c.github.issueLabel ?? "week-{N}-contribution";
  if (!issueLabel.includes("{N}")) {
    throw new ConfigError('config.github.issueLabel must contain the "{N}" week placeholder');
  }

  const cycleLength = c.sessionSchedule?.cycleLength ?? 7;
  const voteCloseOffsetDays = c.sessionSchedule?.voteCloseOffsetDays ?? cycleLength - 2;
  const tallyOffsetDays = c.sessionSchedule?.tallyOffsetDays ?? cycleLength - 1;
  if (voteCloseOffsetDays >= tallyOffsetDays) {
    throw new ConfigError("voteCloseOffsetDays must be earlier than tallyOffsetDays");
  }

  return {
    community: c.community ?? `${c.github.owner}/${c.github.repo}`,
    cycleNoun: c.cycleNoun ?? "Week",
    sessionSchedule: {
      startDay: c.sessionSchedule?.startDay ?? "Monday",
      startTime: c.sessionSchedule?.startTime ?? "18:00",
      timezone: c.sessionSchedule?.timezone ?? "America/New_York",
      cycleLength,
      voteCloseOffsetDays,
      tallyOffsetDays,
      epochDate: c.sessionSchedule?.epochDate,
      epochWeekNumber: c.sessionSchedule?.epochWeekNumber ?? 1,
    },
    ranking: {
      algorithm,
      respectScores,
      minVoters: c.ranking?.minVoters ?? 3,
      voterEligibility: c.ranking?.voterEligibility ?? "tier-1",
      minAccountAgeDays: c.ranking?.minAccountAgeDays ?? 14,
      breakoutSize: c.ranking?.breakoutSize ?? 5,
    },
    github: {
      owner: c.github.owner,
      repo: c.github.repo,
      issueLabel,
      discussionCategory: c.github.discussionCategory ?? "Fractal Sessions",
      projectNumber: c.github.projectNumber,
      pathPrefix: String(c.github.pathPrefix ?? "").replace(/^\/+|\/+$/g, ""),
    },
    ordao: {
      // Phase 1 never submits on-chain, whatever the file says.
      enabled: false,
      respectContractAddress: c.ordao?.respectContractAddress,
      orecContractAddress: c.ordao?.orecContractAddress,
      chainId: c.ordao?.chainId,
    },
    contributionCriteria: c.contributionCriteria ?? [],
    seedList: c.seedList ?? [],
    denyList: c.denyList ?? [],
    enforcement: c.enforcement ?? "soft",
  };
}

export function parseConfig(json: string): FrameworkConfig {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (err) {
    throw new ConfigError(`${CONFIG_FILENAME} is not valid JSON: ${(err as Error).message}`);
  }
  return normalizeConfig(raw);
}

export function loadConfigFromDisk(path = CONFIG_FILENAME): FrameworkConfig {
  return parseConfig(readFileSync(path, "utf-8"));
}

/** "week-{N}-contribution" -> "week-52-contribution". */
export function weekLabel(config: FrameworkConfig, week: number): string {
  return config.github.issueLabel.replace("{N}", String(week));
}
