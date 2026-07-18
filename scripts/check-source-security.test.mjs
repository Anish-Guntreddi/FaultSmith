import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  findRuleMatches,
  formatFinding,
  hostExecutionRules,
  inspectText,
  scanWorkingTree,
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

  it("detects common credential families and auth forms without returning values", () => {
    const valuesByRule = new Map([
      ["github-token", "gh" + "p_" + "a".repeat(24)],
      ["aws-access-key", "AS" + "IA" + "B".repeat(16)],
      ["slack-token", "xox" + "b-" + "c".repeat(20)],
      ["google-api-key", "AI" + "za" + "D".repeat(35)],
      ["stripe-live-key", ["sk", "live", "e".repeat(20)].join("_")],
      ["npm-token", "npm" + "_" + "f".repeat(24)],
      ["pypi-token", "pypi" + "-" + "g".repeat(24)],
      ["gitlab-token", "glpat" + "-" + "h".repeat(24)],
      ["sendgrid-key", "S" + "G." + "i".repeat(20) + "." + "j".repeat(20)],
      ["private-key", "-----BE" + "GIN EC PRIVATE KEY-----"],
      ["secret-assignment", "CLIENT_SECRET=" + "k".repeat(24)],
      ["registry-auth", "_authToken=" + "l".repeat(24)],
      ["authorization-header", "Authorization: Basic " + "m".repeat(24)],
      ["credential-url", "https://user:" + "n".repeat(20) + "@registry.example.test/pkg"],
    ]);

    for (const [rule, value] of valuesByRule) {
      const findings = findRuleMatches(value, secretRules, "package-lock.json");
      expect(findings.map((finding) => finding.rule)).toContain(rule);
      expect(JSON.stringify(findings)).not.toContain(value);
    }
  });

  it("scans lockfiles and large text while rejecting symlink blind spots", () => {
    const directory = mkdtempSync(join(tmpdir(), "faultsmith-source-scan-"));
    const largeSecret = ["sk", "large", "p".repeat(20)].join("-");
    const registrySecret = "npm" + "_" + "q".repeat(24);

    try {
      writeFileSync(join(directory, "large.txt"), `${"x".repeat(1_100_000)}\n${largeSecret}`);
      writeFileSync(
        join(directory, "package-lock.json"),
        JSON.stringify({ registryToken: registrySecret }),
      );
      symlinkSync("large.txt", join(directory, "linked-output.txt"));

      const result = scanWorkingTree(directory);
      expect(result.inspectedFiles).toBe(2);
      expect(result.findings).toEqual(
        expect.arrayContaining([
          { path: "large.txt", line: 2, rule: "openai-key" },
          { path: "package-lock.json", line: 1, rule: "npm-token" },
          { path: "linked-output.txt", line: 1, rule: "symbolic-link" },
        ]),
      );
      expect(JSON.stringify(result.findings)).not.toContain(largeSecret);
      expect(JSON.stringify(result.findings)).not.toContain(registrySecret);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
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
