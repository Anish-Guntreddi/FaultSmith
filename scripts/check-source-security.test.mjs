import { describe, expect, it } from "vitest";

import {
  findRuleMatches,
  formatFinding,
  hostExecutionRules,
  inspectText,
  secretRules,
} from "./check-source-security.mjs";

describe("source security rules", () => {
  it("detects secret-shaped values without returning their contents", () => {
    const secret = "sk-" + "z".repeat(24);
    const findings = findRuleMatches(`token=${secret}`, secretRules, "src/example.ts");

    expect(findings).toEqual([
      { path: "src/example.ts", line: 1, rule: "openai-key" },
    ]);
    expect(JSON.stringify(findings)).not.toContain(secret);
    expect(formatFinding(findings[0])).not.toContain(secret);
  });

  it("allows only the deliberate output-redaction fixture", () => {
    const deliberate = "sk-" + "abcdefghijklmnop";
    expect(findRuleMatches(deliberate, secretRules, "src/server/fixtures.test.ts")).toEqual([]);
    expect(findRuleMatches(deliberate, secretRules, "src/server/fixtures.ts")).toHaveLength(1);
  });

  it("detects host execution only in non-test application source", () => {
    const hostileImport = `import { execFile } from "node:${"child_" + "process"}";`;
    expect(inspectText("src/server/runner.ts", hostileImport).map(({ rule }) => rule)).toEqual(
      expect.arrayContaining(["node-child-process", "exec-file"]),
    );
    expect(inspectText("src/server/runner.test.ts", hostileImport)).toEqual([]);
  });

  it("detects public secret environment names in runtime files", () => {
    const publicName = "NEXT_PUBLIC_" + "OPENAI_API_KEY";
    expect(inspectText("src/config.ts", `const name = "${publicName}";`)).toHaveLength(1);
    expect(inspectText("docs/example.md", publicName)).toEqual([]);
  });

  it("keeps rule patterns free of global-regex state", () => {
    const source = `execFile();\nspawnSync();`;
    const first = findRuleMatches(source, hostExecutionRules, "src/unsafe.ts");
    const second = findRuleMatches(source, hostExecutionRules, "src/unsafe.ts");
    expect(second).toEqual(first);
    expect(first).toHaveLength(2);
  });
});
