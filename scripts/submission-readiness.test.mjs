import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  evaluateSubmissionReadiness,
  runCli,
  validateUatResults,
} from "./submission-readiness.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const template = () =>
  JSON.parse(readFileSync(resolve(repositoryRoot, "docs/uat-results.template.json"), "utf8"));

function completeUat() {
  return {
    schemaVersion: 1,
    studyStatus: "complete",
    testers: ["T01", "T02", "T03", "T04", "T05"].map((testerId, index) => ({
      testerId,
      completed: true,
      purposeUnderstood: index < 4,
      durationSeconds: 120 + index,
      findings: {
        blocker: {
          observed: index === 0 ? 1 : 0,
          resolved: index === 0 ? 1 : 0,
          retested: index === 0 ? 1 : 0,
        },
        high: { observed: 0, resolved: 0, retested: 0 },
      },
    })),
  };
}

const completeSubmission = `# Submission

- **Public demo URL:** [FaultSmith](https://faultsmith.test-build.dev)
- **Public source repository:** [Repository](https://github.com/example/FaultSmith)
- **Demo video:** [YouTube](https://youtu.be/AbCdEf12345)
- **Primary Codex /feedback Session ID:** \`019f73a1-3483-7ca3-a4ed-75ac831925a5\`
- **Five-tester result:** 5/5 completed; 4/5 understood the purpose.
- **License:** MIT

Codex built the core application. GPT-5.6 provides bounded live behavior.
`;

const completeReadme = "FaultSmith uses Codex and GPT-5.6. Available under the MIT License.";
const completeDemo = "The public demonstration is under three minutes and labels its evidence mode.";

function runFixture({ uat = completeUat(), submission = completeSubmission } = {}) {
  const directory = mkdtempSync(join(tmpdir(), "faultsmith-readiness-"));
  const output = [];
  const errors = [];
  writeFileSync(join(directory, "uat.json"), JSON.stringify(uat));
  writeFileSync(join(directory, "submission.md"), submission);
  writeFileSync(join(directory, "readme.md"), completeReadme);
  writeFileSync(join(directory, "demo.md"), completeDemo);

  return {
    directory,
    output,
    errors,
    invoke(mode) {
      return runCli(
        [
          mode,
          "--uat",
          "uat.json",
          "--submission",
          "submission.md",
          "--readme",
          "readme.md",
          "--demo",
          "demo.md",
        ],
        {
          cwd: directory,
          stdout: (line) => output.push(line),
          stderr: (line) => errors.push(line),
        },
      );
    },
    cleanup() {
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

describe("UAT result validation", () => {
  it("accepts the deliberately pending template structurally without claiming readiness", () => {
    const result = validateUatResults(template());

    expect(result.errors).toEqual([]);
    expect(result.pending.length).toBeGreaterThan(0);
    expect(result.summary).toMatchObject({
      completedCount: 0,
      understoodCount: 0,
      fivePersonThreshold: false,
      purposeThreshold: false,
      ready: false,
    });
  });

  it("computes the five-person, 4-of-5, and high-severity retest thresholds", () => {
    const result = validateUatResults(completeUat());

    expect(result.errors).toEqual([]);
    expect(result.pending).toEqual([]);
    expect(result.summary).toEqual({
      completedCount: 5,
      understoodCount: 4,
      fivePersonThreshold: true,
      purposeThreshold: true,
      retestThreshold: true,
      ready: true,
    });
  });

  it("rejects duplicate and undersized anonymous result sets", () => {
    const undersized = completeUat();
    undersized.testers.pop();
    const duplicate = completeUat();
    duplicate.testers[4].testerId = "T01";

    expect(validateUatResults(undersized).errors.map(({ ruleId }) => ruleId)).toContain(
      "UAT_TESTER_COUNT",
    );
    expect(validateUatResults(duplicate).errors.map(({ ruleId }) => ruleId)).toEqual(
      expect.arrayContaining(["UAT_TESTER_ID_DUPLICATE", "UAT_TESTER_ID_SET"]),
    );
  });

  it("rejects learner text and identity fields without returning their values", () => {
    const unsafe = completeUat();
    const privateValue = "student-personal-value";
    unsafe.testers[0].email = privateValue;
    unsafe.testers[0].hypothesis = privateValue;
    unsafe.testers[0].sourceCode = privateValue;

    const result = validateUatResults(unsafe);
    const serialized = JSON.stringify(result);
    expect(result.errors.filter(({ ruleId }) => ruleId === "UAT_PRIVATE_FIELD")).toHaveLength(3);
    expect(serialized).not.toContain(privateValue);
  });

  it("keeps unresolved blocker/high observations pending and rejects false complete claims", () => {
    const unresolved = completeUat();
    unresolved.testers[2].findings.high = { observed: 1, resolved: 0, retested: 0 };
    const result = validateUatResults(unresolved);

    expect(result.pending.map(({ ruleId }) => ruleId)).toContain("UAT_FINDING_RETEST_PENDING");
    expect(result.errors.map(({ ruleId }) => ruleId)).toContain("UAT_COMPLETE_CLAIM_INVALID");
    expect(result.summary.ready).toBe(false);
  });
});

describe("submission readiness", () => {
  it("passes strict mode only when submission and actual UAT evidence are complete", () => {
    const fixture = runFixture();
    try {
      expect(fixture.invoke("--strict")).toBe(0);
      expect(fixture.errors).toEqual([]);
      expect(fixture.output.at(-1)).toContain("Submission readiness (strict): ready");
    } finally {
      fixture.cleanup();
    }
  });

  it("reports placeholders as pending in prepare mode and fails them in strict mode", () => {
    const submission = completeSubmission.replace(
      "https://faultsmith.test-build.dev",
      "[ADD AFTER DEPLOYMENT APPROVAL]",
    );
    const fixture = runFixture({ uat: template(), submission });
    try {
      expect(fixture.invoke("--prepare")).toBe(0);
      expect(fixture.output).toEqual(
        expect.arrayContaining([
          expect.stringContaining("SUBMISSION_PLACEHOLDER"),
          expect.stringContaining("SUBMISSION_DEMO_REQUIRED"),
          expect.stringContaining("SUBMISSION_UAT_REQUIRED"),
        ]),
      );
      fixture.output.length = 0;
      expect(fixture.invoke("--strict")).toBe(1);
    } finally {
      fixture.cleanup();
    }
  });

  it("fails malformed result JSON without printing its contents", () => {
    const fixture = runFixture();
    const privateValue = "private-learner-text";
    try {
      writeFileSync(join(fixture.directory, "uat.json"), `{bad:${privateValue}}`);
      expect(fixture.invoke("--prepare")).toBe(1);
      expect(fixture.errors).toEqual(["[error:UAT_JSON_INVALID] readiness-input"]);
      expect(JSON.stringify(fixture.errors)).not.toContain(privateValue);
    } finally {
      fixture.cleanup();
    }
  });

  it("detects each required external submission field and disclosure", () => {
    const result = evaluateSubmissionReadiness({
      submissionText: "# Empty submission\n[PLACEHOLDER]",
      readmeText: "No disclosures yet.",
      demoText: "No duration yet.",
      uatResults: template(),
    });

    expect(result.pending.map(({ ruleId }) => ruleId)).toEqual(
      expect.arrayContaining([
        "SUBMISSION_REPOSITORY_REQUIRED",
        "SUBMISSION_VIDEO_REQUIRED",
        "SUBMISSION_DEMO_REQUIRED",
        "SUBMISSION_FEEDBACK_REQUIRED",
        "SUBMISSION_TESTER_RESULT_REQUIRED",
        "SUBMISSION_LICENSE_REQUIRED",
        "SUBMISSION_CODEX_DISCLOSURE_REQUIRED",
        "SUBMISSION_GPT_DISCLOSURE_REQUIRED",
        "SUBMISSION_DEMO_DURATION_REQUIRED",
        "SUBMISSION_UAT_REQUIRED",
      ]),
    );
  });
});
