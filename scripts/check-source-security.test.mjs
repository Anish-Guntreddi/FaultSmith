import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  expectedPublicFirebaseConfigNames,
  findRuleMatches,
  formatFinding,
  hostExecutionRules,
  inspectText,
  passwordBoundaryRules,
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

  it("detects Firebase service-account material without returning values", () => {
    const serviceAccountJson = [
      "{",
      `"ty` + `pe": "service_` + `account",`,
      `"private_` + `key_id": "` + "a1b2c3d4".repeat(2) + `",`,
      `"client_email": "svc@demo-project.iam.` + `gserviceaccount.com"`,
      "}",
    ].join("\n");

    const findings = findRuleMatches(serviceAccountJson, secretRules, "credentials.json");
    const rules = findings.map((finding) => finding.rule);

    expect(rules).toContain("gcp-service-account-json");
    expect(rules).toContain("gcp-private-key-id");
    expect(rules).toContain("gcp-service-account-email");
    expect(JSON.stringify(findings)).not.toContain("a1b2c3d4");
    expect(JSON.stringify(findings)).not.toContain("demo-project");
  });

  it("detects JWT-shaped bearer tokens without returning values", () => {
    const token = "eyJ" + "a".repeat(20) + "." + "b".repeat(24) + "." + "c".repeat(16);
    const findings = findRuleMatches(`Bearer ${token}`, secretRules, "server.log");

    expect(findings.map((finding) => finding.rule)).toContain("jwt-bearer-token");
    expect(JSON.stringify(findings)).not.toContain(token);
  });

  it("catches publicized server secrets and password-shaped assignments", () => {
    const publicized = "NEXT_PUBLIC_" + "FIREBASE_SERVICE_ACCOUNT";
    expect(
      inspectText("src/config.ts", `const name = "${publicized}";`).map(({ rule }) => rule),
    ).toContain("public-secret-environment");

    const assignment = "SERVICE_" + "ACCOUNT=" + "forgedmaterial01";
    expect(
      findRuleMatches(assignment, secretRules, ".env.local").map(({ rule }) => rule),
    ).toContain("secret-assignment");
  });

  it("treats documented public Firebase web config names as public metadata", () => {
    expect(expectedPublicFirebaseConfigNames.has("NEXT_PUBLIC_FIREBASE_API_KEY")).toBe(true);

    for (const name of expectedPublicFirebaseConfigNames) {
      expect(inspectText("src/client/firebase-auth.ts", `process.env.${name} ?? ""`)).toEqual([]);
      expect(inspectText(".env.example", `${name}=`)).toEqual([]);
    }

    const variant = "NEXT_PUBLIC_FIREBASE_API_KEY" + "_LEGACY";
    expect(inspectText(".env.example", `${variant}=`).map(({ rule }) => rule)).toContain(
      "public-secret-environment",
    );
  });

  it("does not mistake TypeScript password type annotations for secret values", () => {
    const signature = "createUser(email: string, password: string): Promise<void>;";
    expect(findRuleMatches(signature, secretRules, "src/client/firebase-auth.ts")).toEqual([]);
  });

  it("flags password fields crossing server, persistence, or evidence boundaries", () => {
    const leakyServer = [
      "const password = pw();",
      "persist({ payload: body.password });",
      `record["password"] = true;`,
    ].join("\n");

    const serverFindings = inspectText("src/server/progress-service.ts", leakyServer);
    expect(serverFindings.map(({ rule }) => rule)).toContain("password-boundary");

    expect(
      inspectText("src/lib/attempt-events.ts", "event.password = wipe();").map(
        ({ rule }) => rule,
      ),
    ).toContain("password-boundary");

    expect(inspectText("src/server/progress-service.test.ts", leakyServer)).toEqual([]);
    expect(
      inspectText("src/client/firebase-auth.ts", leakyServer).map(({ rule }) => rule),
    ).not.toContain("password-boundary");
  });
});
