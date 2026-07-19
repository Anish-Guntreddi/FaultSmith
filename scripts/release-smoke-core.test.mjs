import { createServer } from "node:http";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  SmokeFailure,
  applyPrimaryRepair,
  assertNoForbiddenFields,
  assertSafeEvidence,
  normalizeBaseURL,
  normalizeBaseUrl,
  requestJson,
  runChallengeLifecycle,
  sha256Text,
  writeEvidence,
} from "./release-smoke-core.mjs";

const REPOSITORY_SHA = "0123456789abcdef0123456789abcdef01234567";
const FIXED_NOW = new Date("2026-07-18T16:00:00.000Z");
const BROKEN_SOURCE = [
  "from dataclasses import dataclass",
  "",
  "@dataclass",
  "class Expense:",
  "    amount: float",
  "    submitted_by: str",
  "",
  "def approval_route(expense: Expense) -> str:",
  "    if expense.amount > 500:",
  "        return \"finance_review\"",
  "    return \"manager_approval\"",
].join("\n");

const temporaryDirectories = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function temporaryDirectory() {
  const directory = mkdtempSync(join(tmpdir(), "faultsmith-smoke-"));
  temporaryDirectories.push(directory);
  return directory;
}

function testResult(mode, passed, output) {
  return {
    status: passed ? "passed" : "failed",
    passedCount: passed ? 6 : 5,
    failedCount: passed ? 0 : 1,
    durationMs: 42,
    sanitizedOutput: output,
    matchedExpectedFailure: !passed,
    executionMode: mode === "live" ? "code_interpreter" : "prevalidated_fixture",
  };
}

function challengeResponse(mode) {
  return {
    challengeId: "expense-boundary-v1",
    projectId: "expense-approval",
    title: "The missing exact-threshold approval",
    targetSkill: "Boundary conditions",
    difficulty: "intermediate",
    learningObjective: "Translate an inclusive policy boundary into executable logic.",
    learnerBrief: "Policy requires finance review for expenses of $500 or more.",
    files: [
      { path: "approvals.py", content: BROKEN_SOURCE, editable: true },
      { path: "tests/test_expense_approval.py", content: "PUBLIC_TEST_SENTINEL", editable: false },
      { path: "README.md", content: "PUBLIC_README_SENTINEL", editable: false },
    ],
    allowedFiles: ["approvals.py"],
    expectedFailureTests: ["test_exact_threshold_requires_finance"],
    initialTestResult: testResult(mode, false, "INITIAL_RAW_OUTPUT_SENTINEL"),
    availableHintCount: 3,
    source: mode === "live" ? "generated" : "prevalidated",
    ...(mode === "fallback"
      ? { fallbackReason: "A prevalidated challenge was loaded safely." }
      : {}),
  };
}

function hintResponse(mode) {
  return {
    hintIndex: 0,
    hint: "Compare the failing input with the closest passing values around the boundary.",
    source: mode === "live" ? "gpt-5.6" : "prevalidated",
    ...(mode === "fallback"
      ? { recoveryNotice: "The approved progressive hint was loaded." }
      : {}),
  };
}

function executionResponse(mode, passed, output) {
  return {
    testResult: testResult(mode, passed, output),
    fallbackUsed: mode === "fallback",
    ...(mode === "fallback"
      ? {
          recoveredFrom: "missing_key",
          recoveryNotice: "The prevalidated verifier completed this run.",
        }
      : {}),
  };
}

function assessmentResponse(mode, passed, testRuns) {
  return {
    assessment: {
      completionStatus: passed ? "verified" : "not_verified",
      rootCauseScore: passed ? 94 : 55,
      reasoningScore: passed ? 92 : 55,
      patchDisciplineScore: 96,
      conceptUnderstandingScore: passed ? 90 : 55,
      strengths: ["ASSESSMENT_PROSE_SENTINEL"],
      improvementAreas: ["IMPROVEMENT_PROSE_SENTINEL"],
      evidenceSummary: "EVIDENCE_PROSE_SENTINEL",
      nextPracticeRecommendation: "NEXT_PRACTICE_PROSE_SENTINEL",
    },
    testResult: testResult(
      mode,
      passed,
      passed ? "REPAIRED_RAW_OUTPUT_SENTINEL" : "FAILING_RAW_OUTPUT_SENTINEL",
    ),
    assessmentSource: mode === "live" ? "gpt-5.6" : "deterministic_fallback",
    hintsUsed: 1,
    testRuns,
    changedLines: passed ? 1 : 0,
    changedFiles: passed ? ["approvals.py"] : [],
    elapsedSeconds: 90,
    hypothesisRevisions: 1,
  };
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return chunks.length === 0 ? undefined : JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function startLifecycleServer(mode, mutate = (_path, response) => response) {
  const state = { posts: 0, requests: [] };
  const server = createServer(async (request, response) => {
    const path = new URL(request.url, "http://127.0.0.1").pathname;
    const body = await readBody(request);
    state.requests.push({ method: request.method, path, body });
    if (request.method === "POST") state.posts += 1;

    let payload;
    if (path === "/api/health") {
      payload = {
        status: "ok",
        liveOpenAIConfigured: mode === "live",
        fixtureFallback: "ready",
      };
    } else if (path === "/api/challenges/generate") {
      payload = challengeResponse(mode);
    } else if (path === "/api/challenges/hint") {
      payload = hintResponse(mode);
    } else if (path === "/api/challenges/execute") {
      const passed = body.files[0].content.includes("if expense.amount >= 500:");
      payload = executionResponse(
        mode,
        passed,
        passed ? "EXECUTE_REPAIRED_RAW_SENTINEL" : "EXECUTE_MUTATED_RAW_SENTINEL",
      );
    } else if (path === "/api/challenges/assess") {
      const passed = body.files[0].content.includes("if expense.amount >= 500:");
      payload = assessmentResponse(mode, passed, body.testRuns);
    } else {
      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "not found" }));
      return;
    }

    const altered = mutate(path, structuredClone(payload), body, state);
    response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(altered));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    state,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}

async function withLifecycleServer(mode, mutate, callback) {
  const fixture = await startLifecycleServer(mode, mutate);
  try {
    return await callback(fixture);
  } finally {
    await fixture.close();
  }
}

function lifecycleOptions(server, expectedMode) {
  return {
    baseUrl: server.baseUrl,
    expectedMode,
    repositorySha: REPOSITORY_SHA,
    now: () => FIXED_NOW,
  };
}

describe("release smoke URL and transport policy", () => {
  it("normalizes secure and loopback origins", () => {
    expect(normalizeBaseUrl("http://127.0.0.1:3000/")).toBe("http://127.0.0.1:3000");
    expect(normalizeBaseURL("http://[::1]:3000")).toBe("http://[::1]:3000");
    expect(normalizeBaseUrl("https://demo.example.com")).toBe("https://demo.example.com");
  });

  it.each([
    "http://example.com",
    ["http://user", "password@127.0.0.1:3000"].join(":"),
    "https://example.com/path",
    "https://example.com?mode=live",
    "https://example.com#fragment",
    "file:///tmp/faultsmith",
  ])("rejects an unsafe base URL: %s", (url) => {
    expect(() => normalizeBaseUrl(url)).toThrow(SmokeFailure);
  });

  it("bounds requests, rejects non-JSON, and never discloses HTTP response bodies", async () => {
    const server = createServer((request, response) => {
      if (request.url === "/slow") {
        setTimeout(() => {
          response.writeHead(200, { "content-type": "application/json" });
          response.end("{}");
        }, 100);
        return;
      }
      if (request.url === "/text") {
        response.writeHead(200, { "content-type": "text/plain" });
        response.end("not json");
        return;
      }
      if (request.url === "/invalid") {
        response.writeHead(200, { "content-type": "application/json" });
        response.end("not-json");
        return;
      }
      response.writeHead(500, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "RESPONSE_BODY_SECRET_SENTINEL" }));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    try {
      await expect(requestJson({ baseUrl, path: "/slow", timeoutMs: 10 })).rejects.toMatchObject({
        ruleId: "REQUEST_TIMEOUT",
      });
      await expect(requestJson({ baseUrl, path: "/text" })).rejects.toMatchObject({
        ruleId: "RESPONSE_CONTENT_TYPE",
      });
      await expect(requestJson({ baseUrl, path: "/invalid" })).rejects.toMatchObject({
        ruleId: "RESPONSE_JSON",
      });
      const failure = await requestJson({ baseUrl, path: "/failure", stage: "probe" }).catch(
        (error) => error,
      );
      expect(failure).toMatchObject({ ruleId: "HTTP_STATUS", status: 500 });
      expect(failure.message).not.toContain("RESPONSE_BODY_SECRET_SENTINEL");
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("fails a redirect instead of following it across an origin", async () => {
    const server = createServer((_request, response) => {
      response.writeHead(302, { location: "https://example.com/redirected" });
      response.end();
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    try {
      await expect(
        requestJson({ baseUrl: `http://127.0.0.1:${address.port}`, path: "/redirect" }),
      ).rejects.toMatchObject({ ruleId: "REQUEST_FAILED" });
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

describe("release smoke content safety", () => {
  it("rejects forbidden fields recursively", () => {
    expect(() =>
      assertNoForbiddenFields({ safe: [{ nested: { providerContainerId: "provider-value" } }] }),
    ).toThrowError(expect.objectContaining({ ruleId: "FORBIDDEN_FIELD" }));
  });

  it("applies the primary repair exactly once", () => {
    const repaired = applyPrimaryRepair([{ path: "approvals.py", content: BROKEN_SOURCE }]);
    expect(repaired[0].content).toContain("if expense.amount >= 500:");
    expect(repaired[0].content).not.toContain("if expense.amount > 500:");
    expect(() => applyPrimaryRepair(repaired)).toThrowError(
      expect.objectContaining({ ruleId: "REPAIR_CARDINALITY" }),
    );
    expect(() =>
      applyPrimaryRepair([
        { path: "a.py", content: BROKEN_SOURCE },
        { path: "b.py", content: BROKEN_SOURCE },
      ]),
    ).toThrowError(expect.objectContaining({ ruleId: "REPAIR_CARDINALITY" }));
  });
});

describe("release smoke lifecycle", () => {
  it.each(["fallback", "live"])("proves the complete %s lifecycle", async (mode) => {
    await withLifecycleServer(mode, undefined, async (server) => {
      const evidence = await runChallengeLifecycle(lifecycleOptions(server, mode));

      expect(server.state.posts).toBe(6);
      expect(evidence).toMatchObject({
        schemaVersion: "faultsmith.smoke-evidence.v1",
        repositorySha: REPOSITORY_SHA,
        mode,
        origin: server.baseUrl,
        timestamp: FIXED_NOW.toISOString(),
        stages: {
          health: { liveConfigured: mode === "live", fixtureFallback: "ready" },
          generate: {
            source: mode === "live" ? "generated" : "prevalidated",
            originalPassGate: "workflow_required",
          },
          mutatedExecute: {
            status: "failed",
            fallbackUsed: mode === "fallback",
            recoveredFrom: mode === "fallback" ? "missing_key" : null,
          },
          repairedExecute: { status: "passed" },
          repairedAssess: { completionStatus: "verified" },
          failingAssess: { completionStatus: "not_verified" },
        },
      });
      expect(evidence.stages.mutatedExecute.outputDigest).toBe(
        sha256Text("EXECUTE_MUTATED_RAW_SENTINEL"),
      );
      expect(evidence.stages.mutatedExecute.outputDigest).not.toBe(
        evidence.stages.repairedExecute.outputDigest,
      );
      const serialized = JSON.stringify(evidence);
      expect(evidence.stages.generate).not.toHaveProperty("originalPassedCount");
      for (const forbidden of [
        "BROKEN_SOURCE",
        "PUBLIC_TEST_SENTINEL",
        "RAW_SENTINEL",
        "PROSE_SENTINEL",
        "closest passing values",
      ]) {
        expect(serialized).not.toContain(forbidden);
      }
      expect(() => assertSafeEvidence(evidence)).not.toThrow();
      for (const request of server.state.requests.filter(({ method }) => method === "POST")) {
        expect(new URL(request.path, server.baseUrl).origin).toBe(server.baseUrl);
      }
    });
  });

  it("refuses live mode at health before any POST", async () => {
    await withLifecycleServer("fallback", undefined, async (server) => {
      await expect(
        runChallengeLifecycle(lifecycleOptions(server, "live")),
      ).rejects.toMatchObject({ ruleId: "HEALTH_LIVE_MODE", stage: "health" });
      expect(server.state.posts).toBe(0);
    });
  });

  const adversarialCases = [
    {
      name: "generation source drift",
      mode: "live",
      expectedRule: "GENERATION_SOURCE",
      mutate(path, response) {
        if (path === "/api/challenges/generate") response.source = "prevalidated";
        return response;
      },
    },
    {
      name: "initial execution mode drift",
      mode: "live",
      expectedRule: "EXECUTION_MODE",
      mutate(path, response) {
        if (path === "/api/challenges/generate") {
          response.initialTestResult.executionMode = "prevalidated_fixture";
        }
        return response;
      },
    },
    {
      name: "offline fallback flag drift",
      mode: "fallback",
      expectedRule: "EXECUTION_FALLBACK",
      mutate(path, response) {
        if (path === "/api/challenges/execute") response.fallbackUsed = false;
        return response;
      },
    },
    {
      name: "mutated source passes",
      mode: "live",
      expectedRule: "MUTATED_STATUS",
      mutate(path, response, body) {
        if (
          path === "/api/challenges/execute" &&
          !body.files[0].content.includes("if expense.amount >= 500:")
        ) {
          response.testResult = testResult("live", true, "ADVERSARIAL_PASS");
        }
        return response;
      },
    },
    {
      name: "repaired source fails",
      mode: "live",
      expectedRule: "REPAIRED_STATUS",
      mutate(path, response, body) {
        if (
          path === "/api/challenges/execute" &&
          body.files[0].content.includes("if expense.amount >= 500:")
        ) {
          response.testResult = testResult("live", false, "ADVERSARIAL_FAIL");
        }
        return response;
      },
    },
    {
      name: "failing assessment promotion",
      mode: "live",
      expectedRule: "FAILING_ASSESSMENT_PROMOTED",
      mutate(path, response, body) {
        if (
          path === "/api/challenges/assess" &&
          !body.files[0].content.includes("if expense.amount >= 500:")
        ) {
          response.assessment.completionStatus = "verified";
        }
        return response;
      },
    },
    {
      name: "repair-shaped hint",
      mode: "live",
      expectedRule: "HINT_REVEALS_REPAIR",
      mutate(path, response) {
        if (path === "/api/challenges/hint") response.hint = "Use >= at this boundary.";
        return response;
      },
    },
    {
      name: "unknown health response key",
      mode: "live",
      expectedRule: "RESPONSE_KEYS",
      mutate(path, response) {
        if (path === "/api/health") response.extra = true;
        return response;
      },
    },
    {
      name: "unknown generation response key",
      mode: "live",
      expectedRule: "RESPONSE_KEYS",
      mutate(path, response) {
        if (path === "/api/challenges/generate") response.extra = true;
        return response;
      },
    },
    {
      name: "unknown hint response key",
      mode: "live",
      expectedRule: "RESPONSE_KEYS",
      mutate(path, response) {
        if (path === "/api/challenges/hint") response.extra = true;
        return response;
      },
    },
    {
      name: "unknown execution response key",
      mode: "live",
      expectedRule: "RESPONSE_KEYS",
      mutate(path, response) {
        if (path === "/api/challenges/execute") response.extra = true;
        return response;
      },
    },
    {
      name: "unknown assessment response key",
      mode: "live",
      expectedRule: "RESPONSE_KEYS",
      mutate(path, response) {
        if (path === "/api/challenges/assess") response.extra = true;
        return response;
      },
    },
    {
      name: "recursive hidden response key",
      mode: "live",
      expectedRule: "FORBIDDEN_FIELD",
      mutate(path, response) {
        if (path === "/api/challenges/generate") {
          response.files[0].metadata = { hiddenReferenceSolution: "do not disclose" };
        }
        return response;
      },
    },
  ];

  it.each(adversarialCases)("fails closed on $name", async ({ mode, expectedRule, mutate }) => {
    await withLifecycleServer(mode, mutate, async (server) => {
      await expect(
        runChallengeLifecycle(lifecycleOptions(server, mode)),
      ).rejects.toMatchObject({ ruleId: expectedRule });
    });
  });
});

describe("release smoke evidence writer", () => {
  async function validEvidence() {
    return withLifecycleServer("fallback", undefined, (server) =>
      runChallengeLifecycle(lifecycleOptions(server, "fallback")),
    );
  }

  it("writes only a strict safe schema beneath the approved directory", async () => {
    const evidence = await validEvidence();
    const root = temporaryDirectory();
    const allowedDirectory = join(root, "test-results");
    const target = writeEvidence(evidence, {
      outputPath: "release/fallback.json",
      allowedDirectory,
    });
    const written = readFileSync(target, "utf8");

    expect(JSON.parse(written)).toEqual(evidence);
    expect(written).not.toContain("RAW_SENTINEL");
    expect(() =>
      writeEvidence(evidence, { outputPath: "release/fallback.json", allowedDirectory }),
    ).toThrowError(expect.objectContaining({ ruleId: "EVIDENCE_EXISTS" }));
  });

  it("rejects traversal, non-JSON output, symlink traversal, and extra evidence fields", async () => {
    const evidence = await validEvidence();
    const root = temporaryDirectory();
    const allowedDirectory = join(root, "allowed");

    expect(() =>
      writeEvidence(evidence, { outputPath: "../escaped.json", allowedDirectory }),
    ).toThrowError(expect.objectContaining({ ruleId: "EVIDENCE_PATH" }));
    expect(() =>
      writeEvidence(evidence, { outputPath: "evidence.txt", allowedDirectory }),
    ).toThrowError(expect.objectContaining({ ruleId: "EVIDENCE_PATH" }));
    expect(() => assertSafeEvidence({ ...evidence, rawResponse: "unsafe" })).toThrowError(
      expect.objectContaining({ ruleId: "EVIDENCE_SCHEMA" }),
    );

    const outside = join(root, "outside");
    const link = join(allowedDirectory, "linked");
    mkdirSync(outside);
    mkdirSync(allowedDirectory);
    symlinkSync(outside, link, "dir");
    expect(() =>
      writeEvidence(evidence, { outputPath: "linked/escaped.json", allowedDirectory }),
    ).toThrowError(expect.objectContaining({ ruleId: "EVIDENCE_PATH" }));
  });
});
