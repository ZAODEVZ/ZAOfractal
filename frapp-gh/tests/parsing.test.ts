import { describe, expect, it } from "vitest";
import {
  extractCriteria,
  extractEvidence,
  parseContributionBody,
  parseRankingComment,
  validateBallot,
} from "../src/lib/parsing.js";

const CRITERIA = ["Vision", "Contribution", "Collaboration", "Innovation", "Onboarding"];

describe("extractEvidence", () => {
  it("finds URLs and owner/repo#N references", () => {
    const found = extractEvidence(
      "Shipped it. PR: bettercallzaal/frapp-gh#12 and notes at https://example.com/doc.",
    );
    expect(found).toContain("bettercallzaal/frapp-gh#12");
    expect(found).toContain("https://example.com/doc");
  });

  it("returns nothing for a body with no links", () => {
    expect(extractEvidence("Did some work this week.")).toEqual([]);
  });
});

describe("extractCriteria", () => {
  it("reads an inline bracket list", () => {
    expect(extractCriteria("Tags: [Vision, Contribution]", CRITERIA)).toEqual([
      "Vision",
      "Contribution",
    ]);
  });

  it("reads a criteria section and is case-insensitive", () => {
    expect(extractCriteria("## Criteria Tags\n- onboarding\n- INNOVATION\n", CRITERIA)).toEqual([
      "Onboarding",
      "Innovation",
    ]);
  });

  it("ignores unknown tags", () => {
    expect(extractCriteria("[Vibes, Vision]", CRITERIA)).toEqual(["Vision"]);
  });
});

describe("parseContributionBody", () => {
  it("accepts a well-formed submission", () => {
    const parsed = parseContributionBody(
      "## What I Did\nBuilt the aggregation layer and covered it in tests.\n\n## Evidence\nhttps://github.com/o/r/pull/3\n\n[Contribution]",
      CRITERIA,
    );
    expect(parsed.problems).toEqual([]);
    expect(parsed.criteria).toEqual(["Contribution"]);
  });

  it("nudges on a short body with no evidence and no tags", () => {
    const parsed = parseContributionBody("did stuff", CRITERIA);
    expect(parsed.problems).toHaveLength(3);
  });

  it("handles an empty body without throwing", () => {
    expect(() => parseContributionBody("", CRITERIA)).not.toThrow();
  });
});

describe("parseRankingComment", () => {
  it("parses the /rank command form", () => {
    expect(parseRankingComment("/rank #12 #4 #7")?.issueNumbers).toEqual([12, 4, 7]);
  });

  it("parses bare numbers after the command", () => {
    expect(parseRankingComment("rank: 3, 1, 2")?.issueNumbers).toEqual([3, 1, 2]);
  });

  it("parses a numbered list and honours the stated order", () => {
    const parsed = parseRankingComment("My picks:\n2. #4\n1. #12\n3. #7");
    expect(parsed?.issueNumbers).toEqual([12, 4, 7]);
  });

  it("drops duplicates, keeping the best placement", () => {
    const parsed = parseRankingComment("/rank #5 #5 #2");
    expect(parsed?.issueNumbers).toEqual([5, 2]);
    expect(parsed?.problems[0]).toContain("#5");
  });

  it("returns null for ordinary chatter", () => {
    expect(parseRankingComment("Great week everyone, #4 was wild")).toBeNull();
    expect(parseRankingComment("")).toBeNull();
  });

  it("ignores a rank command with no numbers", () => {
    expect(parseRankingComment("/rank soon")).toBeNull();
  });
});

describe("validateBallot", () => {
  it("keeps only issues on this week's ballot", () => {
    const result = validateBallot([1, 99, 2], [1, 2, 3]);
    expect(result.issueNumbers).toEqual([1, 2]);
    expect(result.problems[0]).toContain("#99");
  });
});
