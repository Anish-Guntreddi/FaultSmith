import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { publicChallengeSchema } from "@/lib/contracts";
import { learningSteps } from "@/lib/learning-paths";
import { toPublicChallenge } from "./challenge-service";
import { runFixtureTests, sanitizeTestOutput } from "./fixture-runner";
import { challengeFixtures } from "./fixtures";

describe("prevalidated fixture registry", () => {
  it("contains three approved mutations per curated project", () => {
    expect(challengeFixtures).toHaveLength(9);

    for (const projectId of ["expense-approval", "inventory", "notifications"]) {
      expect(challengeFixtures.filter((fixture) => fixture.projectId === projectId)).toHaveLength(3);
    }

    for (const fixture of challengeFixtures) {
      const tests = fixture.visibleFiles.find((file) => file.path.startsWith("tests/"));
      expect(tests).toBeDefined();
      expect(tests?.content.match(/^def test_/gm)).toHaveLength(fixture.passedCount);
    }
  });

  it("backs every guided lesson with exactly one approved fixture", () => {
    for (const step of learningSteps) {
      const matches = challengeFixtures.filter(
        (fixture) => fixture.projectId === step.projectId && fixture.targetSkill === step.targetSkill,
      );
      expect(matches).toHaveLength(1);
    }
  });

  it.each(challengeFixtures.map((fixture) => [fixture.challengeId, fixture] as const))(
    "%s proves original-pass, mutated-fail, and repaired-pass",
    (_challengeId, fixture) => {
      const original = runFixtureTests(fixture, fixture.originalFiles);
      const mutated = runFixtureTests(fixture, fixture.mutatedFiles);
      const repaired = runFixtureTests(fixture, fixture.originalFiles);

      expect(original.status).toBe("passed");
      expect(mutated.status).toBe("failed");
      expect(mutated.matchedExpectedFailure).toBe(true);
      expect(mutated.sanitizedOutput).toContain(fixture.expectedFailureTests[0]);
      expect(repaired.status).toBe("passed");
    },
  );

  it("rejects incorrect and overbroad patches", () => {
    const fixture = challengeFixtures[0];
    const incorrect = [{ path: fixture.allowedFiles[0], content: "def approval_route(expense):\n    return 'finance_review'\n" }];
    const overbroad = [
      {
        path: fixture.allowedFiles[0],
        content: `${fixture.originalFiles[0].content}\n${"# unrelated change\n".repeat(20)}`,
      },
    ];

    expect(runFixtureTests(fixture, incorrect).status).toBe("failed");
    const broadResult = runFixtureTests(fixture, overbroad);
    expect(broadResult.status).toBe("failed");
    expect(broadResult.sanitizedOutput).toContain("minimal repair boundary");
  });

  it("does not verify comments, syntax errors, or decoys containing the repair snippet", () => {
    const fixture = challengeFixtures[0];
    const sourcePath = fixture.allowedFiles[0];
    const commentedDecoy = fixture.mutatedFiles[0].content.replace(
      fixture.brokenSnippet,
      `# ${fixture.fixedSnippet}`,
    );
    const invalidRepair = fixture.originalFiles[0].content.replace(
      'return "finance_review"',
      'return "finance_review" +',
    );
    const deadCodeDecoy = fixture.mutatedFiles[0].content.replace(
      fixture.brokenSnippet,
      `if False:\n        ${fixture.fixedSnippet}\n    ${fixture.brokenSnippet}`,
    );

    for (const content of [commentedDecoy, invalidRepair, deadCodeDecoy]) {
      const result = runFixtureTests(fixture, [{ path: sourcePath, content }]);
      expect(result.status).toBe("failed");
    }
  });

  it("enforces the allowlist and strips hidden challenge fields", () => {
    const fixture = challengeFixtures[0];
    const allowlistResult = runFixtureTests(fixture, [
      fixture.originalFiles[0],
      { path: "tests/test_expense_approval.py", content: "assert True" },
    ]);
    expect(allowlistResult.status).toBe("error");

    const publicChallenge = toPublicChallenge(fixture, { source: "prevalidated" });
    expect(publicChallengeSchema.safeParse(publicChallenge).success).toBe(true);
    expect(publicChallenge).not.toHaveProperty("hiddenRootCause");
    expect(publicChallenge).not.toHaveProperty("hiddenReferenceSolution");
    expect(publicChallenge).not.toHaveProperty("mutationPatch");
    expect(JSON.stringify(publicChallenge)).not.toContain(fixture.hiddenRootCause);
    expect(JSON.stringify(publicChallenge)).not.toContain(fixture.fixedSnippet);
  });

  it("keeps every progressive hint distinct and short of the completed repair", () => {
    for (const fixture of challengeFixtures) {
      expect(new Set(fixture.hints).size).toBe(3);
      for (const hint of fixture.hints) {
        expect(hint).not.toContain(fixture.fixedSnippet);
        expect(hint).not.toContain(fixture.hiddenReferenceSolution);
      }
    }
  });

  it("sanitizes credential families and authentication forms without disclosure", () => {
    const values = [
      ["sk", "project", "a".repeat(20)].join("-"),
      "gh" + "p_" + "b".repeat(24),
      "AK" + "IA" + "C".repeat(16),
      "xox" + "b-" + "d".repeat(20),
      "AI" + "za" + "E".repeat(35),
      ["sk", "live", "f".repeat(20)].join("_"),
      "npm" + "_" + "g".repeat(24),
      "pypi" + "-" + "h".repeat(24),
      "glpat" + "-" + "i".repeat(24),
      "S" + "G." + "j".repeat(20) + "." + "k".repeat(20),
      "Authorization: Bearer " + "l".repeat(24),
      "https://user:" + "m".repeat(20) + "@registry.example.test/package",
      "//registry.example.test/:_authToken=" + "n".repeat(24),
    ];
    const clean = sanitizeTestOutput(values.join("\n"));

    for (const value of values) expect(clean).not.toContain(value);
    expect(clean).toContain("[REDACTED_CREDENTIAL]");
    expect(clean).toContain("[REDACTED_AUTH]");
  });

  it("sanitizes private keys, home paths, terminal controls, and provider identifiers", () => {
    const privateKey =
      "-----BE" + "GIN RSA PRIVATE KEY-----\n" + "q".repeat(48) + "\n-----END RSA PRIVATE KEY-----";
    const sensitiveValues = [
      privateKey,
      "/Users/alice/project",
      "/home/bob/project",
      "/root/project",
      "C:\\Users\\carol\\project",
      "container_" + "r".repeat(20),
      "request id=" + "s".repeat(20),
      "container " + "a".repeat(64),
    ];
    const controls = "\u001b[31mred\u001b[0m\u001b]0;private title\u0007nul\u0000back\u0008";
    const clean = sanitizeTestOutput([...sensitiveValues, controls].join("\n"));

    expect(clean).not.toContain("PRIVATE KEY");
    expect(clean).not.toContain("alice");
    expect(clean).not.toContain("bob");
    expect(clean).not.toContain("carol");
    for (const value of sensitiveValues.slice(5)) expect(clean).not.toContain(value);
    for (const control of ["\u001b", "\u0007", "\u0000", "\u0008"]) {
      expect(clean).not.toContain(control);
    }
    expect(clean).toContain("/workspace/project");
    expect(clean).toContain("[REDACTED_PROVIDER_ID]");
  });

  it("truncates only after replacing sensitive values", () => {
    const secret = ["sk", "project", "z".repeat(20)].join("-");
    const clean = sanitizeTestOutput(`${"x".repeat(7_950)}\n${secret}\n${"y".repeat(1_000)}`);

    expect(clean).not.toContain(secret);
    expect(clean).toContain("[REDACTED_CREDENTIAL]");
    expect(clean.length).toBe(8_000);
  });
});
