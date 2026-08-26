import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts", "src/handlers/**/*.ts"],
      // types.ts is declarations only; github-api.ts is a thin Octokit adapter
      // whose behaviour is exercised through the FakeGitHub contract instead.
      exclude: ["src/lib/types.ts", "src/lib/github-api.ts"],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 70 },
    },
  },
});
