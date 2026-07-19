import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  realpathSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, isAbsolute, relative, resolve } from "node:path";

const DEFAULT_TIMEOUT_MS = 35_000;
const EVIDENCE_SCHEMA_VERSION = "faultsmith.smoke-evidence.v1";
const PRIMARY_CHALLENGE_ID = "expense-boundary-v1";
const PRIMARY_BROKEN_LINE = "if expense.amount > 500:";
const PRIMARY_REPAIRED_LINE = "if expense.amount >= 500:";
const PRIMARY_FIRST_HINT =
  "Compare the failing input with the closest passing inputs around the policy boundary.";
const EXPECTED_MODE = new Set(["fallback", "live"]);
const FORBIDDEN_FIELD =
  /(?:hidden|internal|credential|secret|api.?key|access.?token|auth.?token|container.?id|response.?id|provider.?id|system.?prompt|developer.?prompt|reference.?solution|answer.?key)/i;

export class SmokeFailure extends Error {
  constructor(ruleId, stage, details = {}) {
    const status = Number.isInteger(details.status) ? ` status=${details.status}` : "";
    super(`[${ruleId}] ${stage}${status}`);
    this.name = "SmokeFailure";
    this.ruleId = ruleId;
    this.stage = stage;
    if (Number.isInteger(details.status)) this.status = details.status;
  }
}

function fail(ruleId, stage, details) {
  throw new SmokeFailure(ruleId, stage, details);
}

function isPlainObject(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function requireObject(value, stage) {
  if (!isPlainObject(value)) fail("RESPONSE_SCHEMA", stage);
  return value;
}

function requireString(value, stage) {
  if (typeof value !== "string") fail("RESPONSE_SCHEMA", stage);
  return value;
}

function requireBoundedString(value, stage, { min = 0, max = 20_000 } = {}) {
  const text = requireString(value, stage);
  if (text.length < min || text.length > max) fail("RESPONSE_SCHEMA", stage);
  return text;
}

function requirePublicPath(value, stage) {
  const path = requireBoundedString(value, stage, { min: 1, max: 120 });
  if (!/^[a-zA-Z0-9_./-]+$/.test(path) || path.startsWith("/") || path.includes("..")) {
    fail("RESPONSE_SCHEMA", stage);
  }
  return path;
}

function requireBoolean(value, stage) {
  if (typeof value !== "boolean") fail("RESPONSE_SCHEMA", stage);
  return value;
}

function requireCount(value, stage, max = 100_000) {
  if (!Number.isInteger(value) || value < 0 || value > max) fail("RESPONSE_SCHEMA", stage);
  return value;
}

function requireArray(value, stage, { min = 0, max = 100 } = {}) {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    fail("RESPONSE_SCHEMA", stage);
  }
  return value;
}

function assertKeys(value, required, optional = [], stage = "response") {
  const object = requireObject(value, stage);
  const keys = Object.keys(object);
  const allowed = new Set([...required, ...optional]);
  if (
    required.some((key) => !Object.hasOwn(object, key)) ||
    keys.some((key) => !allowed.has(key))
  ) {
    fail("RESPONSE_KEYS", stage);
  }
  return object;
}

function assertExact(value, expected, ruleId, stage) {
  if (value !== expected) fail(ruleId, stage);
}

function isLoopbackHostname(hostname) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (normalized === "localhost" || normalized === "::1") return true;
  const parts = normalized.split(".");
  return (
    parts.length === 4 &&
    parts[0] === "127" &&
    parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)
  );
}

export function normalizeBaseUrl(input) {
  let parsed;
  try {
    parsed = new URL(input);
  } catch {
    fail("BASE_URL_INVALID", "base-url");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    fail("BASE_URL_PROTOCOL", "base-url");
  }
  if (parsed.username || parsed.password) fail("BASE_URL_CREDENTIALS", "base-url");
  if (parsed.protocol === "http:" && !isLoopbackHostname(parsed.hostname)) {
    fail("BASE_URL_INSECURE", "base-url");
  }
  if (parsed.search || parsed.hash) fail("BASE_URL_COMPONENTS", "base-url");
  if (parsed.pathname !== "/" && parsed.pathname !== "") {
    fail("BASE_URL_COMPONENTS", "base-url");
  }

  return parsed.origin;
}

export const normalizeBaseURL = normalizeBaseUrl;

export function assertNoForbiddenFields(value, stage = "response") {
  const seen = new Set();

  function visit(node) {
    if (node === null || typeof node !== "object") return;
    if (seen.has(node)) fail("RESPONSE_CYCLE", stage);
    seen.add(node);

    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      seen.delete(node);
      return;
    }

    for (const [key, child] of Object.entries(node)) {
      if (FORBIDDEN_FIELD.test(key.replace(/[^a-z0-9]/gi, ""))) {
        fail("FORBIDDEN_FIELD", stage);
      }
      visit(child);
    }
    seen.delete(node);
  }

  visit(value);
  return value;
}

function normalizeRequestPath(path) {
  if (
    typeof path !== "string" ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\") ||
    path.includes("..") ||
    path.includes("?") ||
    path.includes("#")
  ) {
    fail("REQUEST_PATH", "request");
  }
  return path;
}

export async function requestJson({
  baseUrl,
  path,
  method = "GET",
  body,
  stage = "request",
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl = globalThis.fetch,
}) {
  const origin = normalizeBaseUrl(baseUrl);
  const requestPath = normalizeRequestPath(path);
  if (method !== "GET" && method !== "POST") fail("REQUEST_METHOD", stage);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000) {
    fail("REQUEST_TIMEOUT_BOUND", stage);
  }
  if (typeof fetchImpl !== "function") fail("REQUEST_FETCH", stage);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  timer.unref?.();

  try {
    const response = await fetchImpl(`${origin}${requestPath}`, {
      method,
      headers: method === "POST" ? { "content-type": "application/json" } : undefined,
      body: method === "POST" ? JSON.stringify(body) : undefined,
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });

    if (!response || typeof response.status !== "number") {
      fail("RESPONSE_INVALID", stage);
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      fail("HTTP_STATUS", stage, { status: response.status });
    }

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.startsWith("application/json")) {
      await response.body?.cancel().catch(() => undefined);
      fail("RESPONSE_CONTENT_TYPE", stage);
    }

    let parsed;
    try {
      parsed = await response.json();
    } catch {
      fail("RESPONSE_JSON", stage);
    }
    assertNoForbiddenFields(parsed, stage);
    return parsed;
  } catch (error) {
    if (error instanceof SmokeFailure) throw error;
    if (controller.signal.aborted || error?.name === "AbortError") {
      fail("REQUEST_TIMEOUT", stage);
    }
    fail("REQUEST_FAILED", stage);
  } finally {
    clearTimeout(timer);
  }
}

export function sha256Text(value) {
  if (typeof value !== "string") fail("DIGEST_INPUT", "evidence");
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function applyPrimaryRepair(files) {
  if (!Array.isArray(files) || files.length === 0) fail("REPAIR_FILES", "repair");
  let occurrences = 0;
  const repaired = files.map((file) => {
    const object = requireObject(file, "repair");
    const path = requireString(object.path, "repair");
    const content = requireString(object.content, "repair");
    const matches = content.split(PRIMARY_BROKEN_LINE).length - 1;
    occurrences += matches;
    return {
      path,
      content: matches === 0 ? content : content.replace(PRIMARY_BROKEN_LINE, PRIMARY_REPAIRED_LINE),
    };
  });

  if (occurrences !== 1) fail("REPAIR_CARDINALITY", "repair");
  return repaired;
}

function assertTestResult(value, stage, expectedMode) {
  const result = assertKeys(
    value,
    [
      "status",
      "passedCount",
      "failedCount",
      "durationMs",
      "sanitizedOutput",
      "matchedExpectedFailure",
      "executionMode",
    ],
    [],
    stage,
  );
  const status = requireString(result.status, stage);
  if (!new Set(["passed", "failed", "timeout", "error"]).has(status)) {
    fail("RESPONSE_SCHEMA", stage);
  }
  const passedCount = requireCount(result.passedCount, stage, 200);
  const failedCount = requireCount(result.failedCount, stage, 200);
  requireCount(result.durationMs, stage, 120_000);
  const matchedExpectedFailure = requireBoolean(result.matchedExpectedFailure, stage);
  const executionMode = requireString(result.executionMode, stage);
  const sanitizedOutput = requireBoundedString(result.sanitizedOutput, stage, { max: 8_000 });
  assertExact(executionMode, expectedMode, "EXECUTION_MODE", stage);
  return {
    status,
    passedCount,
    failedCount,
    matchedExpectedFailure,
    executionMode,
    outputDigest: sha256Text(sanitizedOutput),
  };
}

function assertExecution(value, stage, expectedMode, expectedLifecycleMode) {
  const fallback = expectedLifecycleMode === "fallback";
  const response = assertKeys(
    value,
    ["testResult", "fallbackUsed"],
    fallback ? ["recoveredFrom", "recoveryNotice"] : [],
    stage,
  );
  const fallbackUsed = requireBoolean(response.fallbackUsed, stage);
  assertExact(fallbackUsed, fallback, "EXECUTION_FALLBACK", stage);
  if (fallback) {
    assertExact(response.recoveredFrom, "missing_key", "EXECUTION_RECOVERY", stage);
    requireBoundedString(response.recoveryNotice, stage, { min: 1, max: 300 });
  } else if (Object.hasOwn(response, "recoveredFrom") || Object.hasOwn(response, "recoveryNotice")) {
    fail("EXECUTION_RECOVERY", stage);
  }
  return {
    ...assertTestResult(response.testResult, stage, expectedMode),
    fallbackUsed,
    recoveredFrom: fallback ? "missing_key" : null,
  };
}

function assertFailureEvidence(result, stage) {
  assertExact(result.status, "failed", "MUTATED_STATUS", stage);
  if (result.failedCount < 1 || !result.matchedExpectedFailure) {
    fail("MUTATED_SIGNATURE", stage);
  }
}

function assertPassingEvidence(result, stage) {
  assertExact(result.status, "passed", "REPAIRED_STATUS", stage);
  if (result.failedCount !== 0 || result.passedCount < 1) {
    fail("REPAIRED_COUNTS", stage);
  }
}

function editableFilesFromChallenge(challenge, stage) {
  const files = requireArray(challenge.files, stage, { min: 1, max: 8 });
  const editable = files
    .map((file) => assertKeys(file, ["path", "content", "editable"], [], stage))
    .map((file) => {
      requirePublicPath(file.path, stage);
      requireBoundedString(file.content, stage, { max: 20_000 });
      requireBoolean(file.editable, stage);
      return file;
    })
    .filter((file) => file.editable === true)
    .map((file) => ({
      path: requireString(file.path, stage),
      content: requireString(file.content, stage),
    }));
  if (editable.length !== 1 || editable[0].path !== "approvals.py") {
    fail("CHALLENGE_FILES", stage);
  }
  return editable;
}

const CLOUD_SYNC_STATES = new Set([
  "cloud_saved",
  "local_only",
  "unauthorized",
  "cloud_unavailable",
]);

function assertAssessment(value, stage, expectedExecutionMode, expectedAssessmentSource) {
  const response = assertKeys(
    value,
    [
      "assessment",
      "testResult",
      "assessmentSource",
      "hintsUsed",
      "testRuns",
      "changedLines",
      "changedFiles",
      "elapsedSeconds",
      "hypothesisRevisions",
    ],
    // Optional bounded cloud-sync fact (descriptive only; never authority).
    ["cloudSync"],
    stage,
  );
  if (Object.hasOwn(response, "cloudSync") && !CLOUD_SYNC_STATES.has(response.cloudSync)) {
    fail("RESPONSE_SCHEMA", stage);
  }
  const assessment = assertKeys(
    response.assessment,
    [
      "completionStatus",
      "rootCauseScore",
      "reasoningScore",
      "patchDisciplineScore",
      "conceptUnderstandingScore",
      "strengths",
      "improvementAreas",
      "evidenceSummary",
      "nextPracticeRecommendation",
    ],
    [],
    stage,
  );
  const completionStatus = requireString(assessment.completionStatus, stage);
  if (completionStatus !== "verified" && completionStatus !== "not_verified") {
    fail("RESPONSE_SCHEMA", stage);
  }
  for (const score of [
    assessment.rootCauseScore,
    assessment.reasoningScore,
    assessment.patchDisciplineScore,
    assessment.conceptUnderstandingScore,
  ]) {
    requireCount(score, stage, 100);
  }
  for (const list of [assessment.strengths, assessment.improvementAreas]) {
    for (const entry of requireArray(list, stage, { max: 4 })) {
      requireBoundedString(entry, stage, { min: 1, max: 220 });
    }
  }
  requireBoundedString(assessment.evidenceSummary, stage, { min: 1, max: 600 });
  requireBoundedString(assessment.nextPracticeRecommendation, stage, { min: 1, max: 360 });
  const assessmentSource = requireString(response.assessmentSource, stage);
  assertExact(assessmentSource, expectedAssessmentSource, "ASSESSMENT_SOURCE", stage);
  const testResult = assertTestResult(response.testResult, stage, expectedExecutionMode);
  const changedFiles = requireArray(response.changedFiles, stage, { max: 4 });
  for (const path of changedFiles) requirePublicPath(path, stage);
  requireCount(response.elapsedSeconds, stage, 86_400);
  return {
    completionStatus,
    assessmentSource,
    ...testResult,
    hintsUsed: requireCount(response.hintsUsed, stage, 3),
    testRuns: requireCount(response.testRuns, stage, 100),
    changedLines: requireCount(response.changedLines, stage, 10_000),
    changedFileCount: changedFiles.length,
    hypothesisRevisions: requireCount(response.hypothesisRevisions, stage, 30),
  };
}

function assertRepositorySha(repositorySha) {
  if (typeof repositorySha !== "string" || !/^[0-9a-f]{7,64}$/i.test(repositorySha)) {
    fail("REPOSITORY_SHA", "evidence");
  }
  return repositorySha.toLowerCase();
}

function assertTimestamp(timestamp) {
  if (
    typeof timestamp !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(timestamp) ||
    Number.isNaN(Date.parse(timestamp))
  ) {
    fail("EVIDENCE_TIMESTAMP", "evidence");
  }
  return timestamp;
}

export async function runChallengeLifecycle({
  baseUrl,
  expectedMode = "fallback",
  repositorySha,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl = globalThis.fetch,
  now = () => new Date(),
} = {}) {
  if (!EXPECTED_MODE.has(expectedMode)) fail("EXPECTED_MODE", "lifecycle");
  const origin = normalizeBaseUrl(baseUrl);
  const sha = assertRepositorySha(repositorySha);
  const timestampValue = now();
  if (!(timestampValue instanceof Date) || Number.isNaN(timestampValue.valueOf())) {
    fail("EVIDENCE_TIMESTAMP", "evidence");
  }
  const timestamp = assertTimestamp(timestampValue.toISOString());
  const request = (options) =>
    requestJson({ origin, timeoutMs, fetchImpl, ...options, baseUrl: origin });

  const health = assertKeys(
    await request({ path: "/api/health", stage: "health" }),
    ["status", "liveOpenAIConfigured", "fixtureFallback"],
    [],
    "health",
  );
  assertExact(health.status, "ok", "HEALTH_STATUS", "health");
  assertExact(health.fixtureFallback, "ready", "HEALTH_FALLBACK", "health");
  const liveConfigured = requireBoolean(health.liveOpenAIConfigured, "health");
  assertExact(liveConfigured, expectedMode === "live", "HEALTH_LIVE_MODE", "health");

  const generateStage = "generate";
  const challenge = assertKeys(
    await request({
      path: "/api/challenges/generate",
      method: "POST",
      stage: generateStage,
      body: {
        projectId: "expense-approval",
        targetSkill: "Boundary conditions",
        difficulty: "intermediate",
        preferLive: true,
      },
    }),
    [
      "challengeId",
      "projectId",
      "title",
      "targetSkill",
      "difficulty",
      "learningObjective",
      "learnerBrief",
      "files",
      "allowedFiles",
      "expectedFailureTests",
      "initialTestResult",
      "availableHintCount",
      "source",
    ],
    expectedMode === "fallback" ? ["fallbackReason"] : [],
    generateStage,
  );
  assertExact(challenge.challengeId, PRIMARY_CHALLENGE_ID, "CHALLENGE_ID", generateStage);
  assertExact(challenge.projectId, "expense-approval", "CHALLENGE_PROJECT", generateStage);
  assertExact(challenge.targetSkill, "Boundary conditions", "CHALLENGE_SKILL", generateStage);
  const challengeSource = requireString(challenge.source, generateStage);
  const expectedSource = expectedMode === "live" ? "generated" : "prevalidated";
  assertExact(challengeSource, expectedSource, "GENERATION_SOURCE", generateStage);
  requireBoundedString(challenge.title, generateStage, { min: 1, max: 120 });
  assertExact(challenge.difficulty, "intermediate", "CHALLENGE_DIFFICULTY", generateStage);
  requireBoundedString(challenge.learningObjective, generateStage, { min: 1, max: 300 });
  requireBoundedString(challenge.learnerBrief, generateStage, { min: 1, max: 600 });
  const allowedFiles = requireArray(challenge.allowedFiles, generateStage, { min: 1, max: 4 });
  if (allowedFiles.length !== 1 || allowedFiles[0] !== "approvals.py") {
    fail("CHALLENGE_ALLOWLIST", generateStage);
  }
  const expectedFailures = requireArray(challenge.expectedFailureTests, generateStage, {
    min: 1,
    max: 12,
  });
  for (const testName of expectedFailures) {
    requireBoundedString(testName, generateStage, { min: 1, max: 160 });
  }
  assertExact(challenge.availableHintCount, 3, "CHALLENGE_HINT_COUNT", generateStage);
  if (expectedMode === "fallback") {
    requireBoundedString(challenge.fallbackReason, generateStage, { min: 1, max: 240 });
  } else if (Object.hasOwn(challenge, "fallbackReason")) {
    fail("GENERATION_FALLBACK", generateStage);
  }
  const expectedExecutionMode =
    expectedMode === "live" ? "code_interpreter" : "prevalidated_fixture";
  const expectedAssessmentSource =
    expectedMode === "live" ? "gpt-5.6" : "deterministic_fallback";
  const initial = assertTestResult(
    challenge.initialTestResult,
    generateStage,
    expectedExecutionMode,
  );
  assertFailureEvidence(initial, generateStage);
  const mutatedFiles = editableFilesFromChallenge(challenge, generateStage);
  const repairedFiles = applyPrimaryRepair(mutatedFiles);

  const hintStage = "hint";
  const hint = assertKeys(
    await request({
      path: "/api/challenges/hint",
      method: "POST",
      stage: hintStage,
      body: {
        challengeId: PRIMARY_CHALLENGE_ID,
        hintIndex: 0,
        hypothesis: "The strict comparison may exclude the exact policy boundary.",
        preferLive: true,
      },
    }),
    ["hintIndex", "hint", "source"],
    expectedMode === "fallback" ? ["recoveryNotice"] : [],
    hintStage,
  );
  assertExact(hint.hintIndex, 0, "HINT_INDEX", hintStage);
  const hintSource = requireString(hint.source, hintStage);
  assertExact(hintSource, expectedMode === "live" ? "gpt-5.6" : "prevalidated", "HINT_SOURCE", hintStage);
  const hintText = requireBoundedString(hint.hint, hintStage, { min: 1, max: 360 });
  if (expectedMode === "fallback") {
    requireBoundedString(hint.recoveryNotice, hintStage, { min: 1, max: 300 });
  } else if (Object.hasOwn(hint, "recoveryNotice")) {
    fail("HINT_RECOVERY", hintStage);
  }
  assertExact(hintText, PRIMARY_FIRST_HINT, "HINT_CONTRACT", hintStage);

  const executionBody = (files) => ({
    challengeId: PRIMARY_CHALLENGE_ID,
    files,
    executionMode: "code_interpreter",
  });
  const mutatedExecution = assertExecution(
    await request({
      path: "/api/challenges/execute",
      method: "POST",
      stage: "mutated-execute",
      body: executionBody(mutatedFiles),
    }),
    "mutated-execute",
    expectedExecutionMode,
    expectedMode,
  );
  assertFailureEvidence(mutatedExecution, "mutated-execute");

  const repairedExecution = assertExecution(
    await request({
      path: "/api/challenges/execute",
      method: "POST",
      stage: "repaired-execute",
      body: executionBody(repairedFiles),
    }),
    "repaired-execute",
    expectedExecutionMode,
    expectedMode,
  );
  assertPassingEvidence(repairedExecution, "repaired-execute");

  const hypothesis = "The strict greater-than comparison excludes the exact 500 boundary.";
  const assessmentBody = (files, testRuns) => ({
    ...executionBody(files),
    hypothesis,
    hypothesisHistory: [hypothesis],
    explanation:
      "The strict greater-than check excludes exactly 500, so an inclusive boundary restores the documented policy.",
    hintsUsed: 1,
    testRuns,
    elapsedSeconds: 90,
  });
  const repairedAssessment = assertAssessment(
    await request({
      path: "/api/challenges/assess",
      method: "POST",
      stage: "repaired-assess",
      body: assessmentBody(repairedFiles, 2),
    }),
    "repaired-assess",
    expectedExecutionMode,
    expectedAssessmentSource,
  );
  assertPassingEvidence(repairedAssessment, "repaired-assess");
  assertExact(
    repairedAssessment.completionStatus,
    "verified",
    "REPAIRED_ASSESSMENT",
    "repaired-assess",
  );

  const failingAssessment = assertAssessment(
    await request({
      path: "/api/challenges/assess",
      method: "POST",
      stage: "failing-assess",
      body: assessmentBody(mutatedFiles, 3),
    }),
    "failing-assess",
    expectedExecutionMode,
    expectedAssessmentSource,
  );
  assertFailureEvidence(failingAssessment, "failing-assess");
  assertExact(
    failingAssessment.completionStatus,
    "not_verified",
    "FAILING_ASSESSMENT_PROMOTED",
    "failing-assess",
  );

  return assertSafeEvidence({
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    repositorySha: sha,
    mode: expectedMode,
    origin,
    timestamp,
    stages: {
      health: {
        status: "ok",
        liveConfigured,
        fixtureFallback: "ready",
      },
      generate: {
        source: challengeSource,
        originalPassGate: "workflow_required",
        ...initial,
      },
      hint: { source: hintSource, hintIndex: 0 },
      mutatedExecute: mutatedExecution,
      repairedExecute: repairedExecution,
      repairedAssess: repairedAssessment,
      failingAssess: failingAssessment,
    },
  });
}

function assertExactKeys(value, keys, stage = "evidence") {
  const object = requireObject(value, stage);
  const actual = Object.keys(object).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    fail("EVIDENCE_SCHEMA", stage);
  }
  return object;
}

function assertDigest(value) {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) {
    fail("EVIDENCE_DIGEST", "evidence");
  }
}

export function assertSafeEvidence(evidence) {
  const root = assertExactKeys(evidence, [
    "schemaVersion",
    "repositorySha",
    "mode",
    "origin",
    "timestamp",
    "stages",
  ]);
  assertExact(root.schemaVersion, EVIDENCE_SCHEMA_VERSION, "EVIDENCE_VERSION", "evidence");
  assertRepositorySha(root.repositorySha);
  if (!EXPECTED_MODE.has(root.mode)) fail("EVIDENCE_MODE", "evidence");
  const normalizedOrigin = normalizeBaseUrl(root.origin);
  assertExact(root.origin, normalizedOrigin, "EVIDENCE_ORIGIN", "evidence");
  assertTimestamp(root.timestamp);

  const stages = assertExactKeys(root.stages, [
    "health",
    "generate",
    "hint",
    "mutatedExecute",
    "repairedExecute",
    "repairedAssess",
    "failingAssess",
  ]);
  assertExactKeys(stages.health, ["status", "liveConfigured", "fixtureFallback"]);
  assertExactKeys(stages.hint, ["source", "hintIndex"]);
  assertExactKeys(stages.generate, [
    "source",
    "originalPassGate",
    "status",
    "passedCount",
    "failedCount",
    "matchedExpectedFailure",
    "executionMode",
    "outputDigest",
  ]);
  for (const key of ["mutatedExecute", "repairedExecute"]) {
    assertExactKeys(stages[key], [
      "status",
      "passedCount",
      "failedCount",
      "matchedExpectedFailure",
      "executionMode",
      "outputDigest",
      "fallbackUsed",
      "recoveredFrom",
    ]);
  }
  for (const key of ["repairedAssess", "failingAssess"]) {
    assertExactKeys(stages[key], [
      "completionStatus",
      "assessmentSource",
      "status",
      "passedCount",
      "failedCount",
      "matchedExpectedFailure",
      "executionMode",
      "outputDigest",
      "hintsUsed",
      "testRuns",
      "changedLines",
      "changedFileCount",
      "hypothesisRevisions",
    ]);
  }
  for (const key of [
    "generate",
    "mutatedExecute",
    "repairedExecute",
    "repairedAssess",
    "failingAssess",
  ]) {
    assertDigest(stages[key].outputDigest);
  }

  const live = root.mode === "live";
  const executionMode = live ? "code_interpreter" : "prevalidated_fixture";
  const generatedSource = live ? "generated" : "prevalidated";
  const hintSource = live ? "gpt-5.6" : "prevalidated";
  const assessmentSource = live ? "gpt-5.6" : "deterministic_fallback";
  assertExact(stages.health.status, "ok", "EVIDENCE_SCHEMA", "evidence");
  assertExact(stages.health.fixtureFallback, "ready", "EVIDENCE_SCHEMA", "evidence");
  assertExact(
    requireBoolean(stages.health.liveConfigured, "evidence"),
    live,
    "EVIDENCE_SCHEMA",
    "evidence",
  );
  assertExact(stages.hint.source, hintSource, "EVIDENCE_SCHEMA", "evidence");
  assertExact(stages.hint.hintIndex, 0, "EVIDENCE_SCHEMA", "evidence");
  assertExact(stages.generate.source, generatedSource, "EVIDENCE_SCHEMA", "evidence");
  assertExact(
    stages.generate.originalPassGate,
    "workflow_required",
    "EVIDENCE_SCHEMA",
    "evidence",
  );

  for (const key of ["generate", "mutatedExecute", "repairedExecute", "repairedAssess", "failingAssess"]) {
    const stage = stages[key];
    requireCount(stage.passedCount, "evidence", 200);
    requireCount(stage.failedCount, "evidence", 200);
    requireBoolean(stage.matchedExpectedFailure, "evidence");
    assertExact(stage.executionMode, executionMode, "EVIDENCE_SCHEMA", "evidence");
  }
  assertExact(stages.generate.status, "failed", "EVIDENCE_SCHEMA", "evidence");
  assertFailureEvidence(stages.generate, "evidence:generate");
  assertFailureEvidence(stages.mutatedExecute, "evidence:mutated-execute");
  assertPassingEvidence(stages.repairedExecute, "evidence:repaired-execute");
  assertPassingEvidence(stages.repairedAssess, "evidence:repaired-assess");
  assertFailureEvidence(stages.failingAssess, "evidence:failing-assess");
  assertExact(
    stages.repairedExecute.matchedExpectedFailure,
    false,
    "EVIDENCE_SCHEMA",
    "evidence:repaired-execute",
  );
  assertExact(
    stages.repairedAssess.matchedExpectedFailure,
    false,
    "EVIDENCE_SCHEMA",
    "evidence:repaired-assess",
  );
  for (const key of ["mutatedExecute", "repairedExecute"]) {
    assertExact(
      requireBoolean(stages[key].fallbackUsed, "evidence"),
      !live,
      "EVIDENCE_SCHEMA",
      "evidence",
    );
    assertExact(
      stages[key].recoveredFrom,
      live ? null : "missing_key",
      "EVIDENCE_SCHEMA",
      "evidence",
    );
  }
  assertExact(stages.mutatedExecute.status, "failed", "EVIDENCE_SCHEMA", "evidence");
  assertExact(stages.repairedExecute.status, "passed", "EVIDENCE_SCHEMA", "evidence");
  assertExact(stages.repairedAssess.status, "passed", "EVIDENCE_SCHEMA", "evidence");
  assertExact(stages.failingAssess.status, "failed", "EVIDENCE_SCHEMA", "evidence");
  assertExact(stages.repairedAssess.completionStatus, "verified", "EVIDENCE_SCHEMA", "evidence");
  assertExact(stages.failingAssess.completionStatus, "not_verified", "EVIDENCE_SCHEMA", "evidence");
  for (const key of ["repairedAssess", "failingAssess"]) {
    assertExact(stages[key].assessmentSource, assessmentSource, "EVIDENCE_SCHEMA", "evidence");
    requireCount(stages[key].hintsUsed, "evidence", 3);
    requireCount(stages[key].testRuns, "evidence", 100);
    requireCount(stages[key].changedLines, "evidence", 10_000);
    requireCount(stages[key].changedFileCount, "evidence", 4);
    requireCount(stages[key].hypothesisRevisions, "evidence", 30);
  }
  assertNoForbiddenFields(evidence, "evidence");
  return evidence;
}

function pathIsWithin(candidate, root) {
  const pathFromRoot = relative(root, candidate);
  return pathFromRoot !== "" && !pathFromRoot.startsWith("..") && !isAbsolute(pathFromRoot);
}

export function writeEvidence(
  evidence,
  { outputPath, allowedDirectory, evidenceDirectory } = {},
) {
  assertSafeEvidence(evidence);
  const directory = allowedDirectory ?? evidenceDirectory;
  if (typeof directory !== "string" || directory.trim() === "") {
    fail("EVIDENCE_DIRECTORY", "evidence-write");
  }
  if (typeof outputPath !== "string" || outputPath.trim() === "") {
    fail("EVIDENCE_PATH", "evidence-write");
  }

  const approvedDirectory = resolve(directory);
  const target = isAbsolute(outputPath)
    ? resolve(outputPath)
    : resolve(approvedDirectory, outputPath);
  if (!pathIsWithin(target, approvedDirectory) || extname(target).toLowerCase() !== ".json") {
    fail("EVIDENCE_PATH", "evidence-write");
  }

  mkdirSync(approvedDirectory, { recursive: true, mode: 0o700 });
  const approvedReal = realpathSync.native(approvedDirectory);
  const parent = dirname(target);
  mkdirSync(parent, { recursive: true, mode: 0o700 });
  const parentReal = realpathSync.native(parent);
  if (parentReal !== approvedReal && !pathIsWithin(parentReal, approvedReal)) {
    fail("EVIDENCE_PATH", "evidence-write");
  }
  if (existsSync(target)) {
    if (lstatSync(target).isSymbolicLink()) fail("EVIDENCE_PATH", "evidence-write");
    fail("EVIDENCE_EXISTS", "evidence-write");
  }

  const temporary = resolve(parentReal, `.faultsmith-evidence-${randomUUID()}.tmp`);
  try {
    writeFileSync(temporary, `${JSON.stringify(evidence, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    linkSync(temporary, target);
    unlinkSync(temporary);
  } catch (error) {
    if (existsSync(temporary)) unlinkSync(temporary);
    if (error instanceof SmokeFailure) throw error;
    if (existsSync(target)) {
      if (lstatSync(target).isSymbolicLink()) fail("EVIDENCE_PATH", "evidence-write");
      fail("EVIDENCE_EXISTS", "evidence-write");
    }
    fail("EVIDENCE_WRITE", "evidence-write");
  }

  return target;
}

export const smokeEvidenceSchemaVersion = EVIDENCE_SCHEMA_VERSION;
