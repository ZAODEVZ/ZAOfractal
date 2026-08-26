import { describe, expect, it } from "vitest";
import { ConfigError, normalizeConfig, parseConfig, weekLabel } from "../src/lib/config-loader.js";

const MINIMAL = { github: { owner: "zao", repo: "fractal" } };

describe("normalizeConfig", () => {
  it("fills in ZAO defaults from a minimal config", () => {
    const config = normalizeConfig(MINIMAL);
    expect(config.ranking.algorithm).toBe("borda");
    expect(config.ranking.respectScores).toEqual([110, 68, 42, 26, 16, 10]);
    expect(config.ranking.minVoters).toBe(3);
    expect(config.ranking.minAccountAgeDays).toBe(14);
    expect(config.sessionSchedule.startDay).toBe("Monday");
    expect(config.sessionSchedule.voteCloseOffsetDays).toBe(5);
    expect(config.sessionSchedule.tallyOffsetDays).toBe(6);
    expect(config.enforcement).toBe("soft");
  });

  it("forces ordao off in Phase 1 even when the file enables it", () => {
    const config = normalizeConfig({ ...MINIMAL, ordao: { enabled: true, chainId: 10 } });
    expect(config.ordao?.enabled).toBe(false);
    expect(config.ordao?.chainId).toBe(10);
  });

  it("rejects a config with no repo", () => {
    expect(() => normalizeConfig({ community: "x" })).toThrow(ConfigError);
  });

  it("rejects an unknown algorithm", () => {
    expect(() => normalizeConfig({ ...MINIMAL, ranking: { algorithm: "coinflip" } })).toThrow(
      /Unknown ranking algorithm/,
    );
  });

  it("rejects a label with no week placeholder", () => {
    expect(() =>
      normalizeConfig({ github: { ...MINIMAL.github, issueLabel: "contribution" } }),
    ).toThrow(/\{N\}/);
  });

  it("rejects negative or empty respect curves", () => {
    expect(() => normalizeConfig({ ...MINIMAL, ranking: { respectScores: [] } })).toThrow();
    expect(() => normalizeConfig({ ...MINIMAL, ranking: { respectScores: [10, -1] } })).toThrow();
  });

  it("rejects a schedule where voting closes after the tally", () => {
    expect(() =>
      normalizeConfig({
        ...MINIMAL,
        sessionSchedule: { voteCloseOffsetDays: 6, tallyOffsetDays: 5 },
      }),
    ).toThrow(/earlier/);
  });

  it("rejects non-JSON and non-object input", () => {
    expect(() => parseConfig("{not json")).toThrow(ConfigError);
    expect(() => normalizeConfig(null)).toThrow(ConfigError);
  });
});

describe("weekLabel", () => {
  it("substitutes the week number", () => {
    expect(weekLabel(normalizeConfig(MINIMAL), 52)).toBe("week-52-contribution");
  });
});

describe("the repo's own config", () => {
  it("loads and normalizes", async () => {
    const { readFileSync } = await import("node:fs");
    const config = parseConfig(readFileSync("frapp-gh.config.json", "utf-8"));
    expect(config.community).toBe("The ZAO");
    expect(config.contributionCriteria).toHaveLength(5);
  });

  it("continues ZAO's on-chain period count", async () => {
    const { readFileSync } = await import("node:fs");
    const { weekNumberFor } = await import("../src/lib/week.js");
    const config = parseConfig(readFileSync("frapp-gh.config.json", "utf-8"));

    // Period 110 was awarded 2026-08-25 after the OREC vote window; its session
    // was Monday 2026-08-24 18:00 ET. See ZAOfractal data/periods.json.
    expect(config.sessionSchedule.epochWeekNumber).toBe(110);
    expect(config.cycleNoun).toBe("Period");
    expect(weekNumberFor(config, new Date("2026-08-26T12:00:00Z"))).toBe(110);
    expect(weekNumberFor(config, new Date("2026-08-31T23:00:00Z"))).toBe(111);
    expect(weekNumberFor(config, new Date("2026-08-19T12:00:00Z"))).toBe(109);
    expect(weekLabel(config, 110)).toBe("period-110-contribution");
  });

  it("defaults the cycle noun to Week for a community that does not set one", () => {
    expect(normalizeConfig(MINIMAL).cycleNoun).toBe("Week");
  });
});
