import "server-only";

import {
  assessmentResponseSchema,
  type AssessRequest,
  type AssessmentResult,
  type AssessmentResponse,
  type ExecuteRequest,
  type ExecutionResponse,
  type GenerateChallengeRequest,
  hintResponseSchema,
  type HintRequest,
  type HintResponse,
  hypothesisResponseSchema,
  type HypothesisRequest,
  type HypothesisResponse,
  type PublicChallenge,
} from "@/lib/contracts";
import { assertNoLeak } from "@/server/hypothesis-containment";
import { buildCoachContext } from "@/server/hypothesis-context";
import { buildDeterministicFallbackResponse } from "@/server/hypothesis-fallback";
import { recordContainmentRejection } from "@/server/hypothesis-health";
import type { MutationPlan } from "@/server/mutation-contract";
import {
  OpenAIGateway,
  hasOpenAIKey,
  type AIGateway,
  type ModelAssessmentScores,
} from "./ai-gateway";
import { getPrevalidatedChallenge, toPublicChallenge } from "./challenge-service";
import { countChangedLines, runFixtureTests, validateSubmittedFiles } from "./fixture-runner";
import { getFixture, selectFixture, withRequestedDifficulty, type ChallengeFixture } from "./fixtures";
import { RequestError } from "./request-guard";

/** Design spec section 3.4: one regeneration on a rejected candidate, then fall back. */
const MAX_COACH_ATTEMPTS = 2;

type LiveOptions = {
  gateway?: AIGateway;
  liveAvailable?: boolean;
};

function resolveLiveOptions(options?: LiveOptions) {
  const liveAvailable = options?.liveAvailable ?? hasOpenAIKey();
  return {
    liveAvailable,
    gateway: options?.gateway ?? (liveAvailable ? new OpenAIGateway() : undefined),
  };
}

function sameStrings(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function assertPlanMatchesFixture(
  plan: MutationPlan,
  fixture: ChallengeFixture,
  request: GenerateChallengeRequest,
) {
  const valid =
    plan.challengeId === fixture.challengeId &&
    plan.projectId === request.projectId &&
    plan.targetSkill === request.targetSkill &&
    plan.difficulty === request.difficulty &&
    sameStrings(plan.allowedFiles, fixture.allowedFiles) &&
    sameStrings(plan.expectedFailureTests, fixture.expectedFailureTests) &&
    plan.mutationPatch === fixture.mutationPatch;

  if (!valid) {
    throw new Error("The mutation plan diverged from the approved fixture boundary.");
  }
}

function fallbackChallenge(
  request: GenerateChallengeRequest,
  reason: string,
): PublicChallenge {
  const challenge = getPrevalidatedChallenge(
    request.projectId,
    request.targetSkill,
    request.difficulty,
    reason,
  );
  if (!challenge) {
    throw new RequestError(
      "That project and skill combination is not supported.",
      "UNSUPPORTED_CONFIGURATION",
      400,
    );
  }
  return challenge;
}

export async function generateChallengeWorkflow(
  request: GenerateChallengeRequest,
  options?: LiveOptions,
) {
  const fixture = selectFixture(request.projectId, request.targetSkill);
  if (!fixture) {
    throw new RequestError(
      "That project and skill combination is not supported.",
      "UNSUPPORTED_CONFIGURATION",
      400,
    );
  }
  const selected = withRequestedDifficulty(fixture, request.difficulty);
  const live = resolveLiveOptions(options);

  if (!request.preferLive) {
    return fallbackChallenge(request, "Prevalidated mode was selected for this attempt.");
  }
  if (!live.liveAvailable || !live.gateway) {
    return fallbackChallenge(
      request,
      "Live GPT-5.6 generation is unavailable because the server has no API credential.",
    );
  }

  let validationFeedback = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const plan = await live.gateway.planMutation(selected, request, validationFeedback);
      assertPlanMatchesFixture(plan, selected, request);

      const original = await live.gateway.runTests(selected, selected.originalFiles, false);
      if (original.status !== "passed" || original.failedCount !== 0) {
        throw new Error("The original project did not pass its isolated test gate.");
      }

      const mutated = await live.gateway.runTests(selected, selected.mutatedFiles, true);
      if (
        mutated.status !== "failed" ||
        mutated.failedCount < 1 ||
        !mutated.matchedExpectedFailure
      ) {
        throw new Error("The mutation did not reproduce the approved failure signature.");
      }

      const interpretation = await live.gateway.interpretValidation(
        selected,
        original,
        mutated,
      );
      if (
        !interpretation.originalPassed ||
        !interpretation.mutationFailed ||
        !interpretation.matchedExpectedFailure ||
        !interpretation.releaseRecommended
      ) {
        throw new Error(
          `Validation interpretation rejected release: ${interpretation.validationFeedback}`.slice(0, 240),
        );
      }

      return toPublicChallenge(selected, {
        source: "generated",
        initialTestResult: mutated,
      });
    } catch (error) {
      validationFeedback =
        error instanceof Error ? error.message.slice(0, 240) : "Validation failed.";
    }
  }

  return fallbackChallenge(
    request,
    "Live validation did not pass after two attempts; a prevalidated challenge was loaded.",
  );
}

export async function executeChallengeWorkflow(
  request: ExecuteRequest,
  options?: LiveOptions,
): Promise<ExecutionResponse> {
  const fixture = getFixture(request.challengeId);
  if (!fixture) {
    throw new RequestError("The challenge identifier is invalid.", "INVALID_CHALLENGE", 404);
  }
  const fileError = validateSubmittedFiles(fixture, request.files);
  if (fileError) throw new RequestError(fileError, "INVALID_FILES", 400);

  const live = resolveLiveOptions(options);
  if (request.executionMode === "prevalidated_fixture") {
    return { testResult: runFixtureTests(fixture, request.files), fallbackUsed: false };
  }

  if (!live.liveAvailable || !live.gateway) {
    return {
      testResult: runFixtureTests(fixture, request.files),
      fallbackUsed: true,
      recoveredFrom: "missing_key",
      recoveryNotice:
        "Code Interpreter is unavailable without a server API credential; the prevalidated verifier completed this run.",
    };
  }

  const result = await live.gateway.runTests(fixture, request.files, false);
  if (result.status === "timeout" || result.status === "error") {
    return {
      testResult: runFixtureTests(fixture, request.files),
      fallbackUsed: true,
      recoveredFrom: result.status,
      recoveryNotice:
        result.status === "timeout"
          ? "Code Interpreter timed out. FaultSmith created a safe recovery result with the prevalidated verifier; retry to request a fresh container."
          : "Code Interpreter became unavailable. FaultSmith preserved the attempt with the prevalidated verifier.",
    };
  }

  return { testResult: result, fallbackUsed: false };
}

function prevalidatedHint(
  fixture: ChallengeFixture,
  request: HintRequest,
  recoveryNotice?: string,
): HintResponse {
  return hintResponseSchema.parse({
    hintIndex: request.hintIndex,
    hint: fixture.hints[request.hintIndex],
    source: "prevalidated",
    recoveryNotice,
  });
}

export async function revealHintWorkflow(
  request: HintRequest,
  options?: LiveOptions,
): Promise<HintResponse> {
  const fixture = getFixture(request.challengeId);
  if (!fixture) {
    throw new RequestError("The challenge identifier is invalid.", "INVALID_CHALLENGE", 404);
  }
  if (!request.preferLive) return prevalidatedHint(fixture, request);

  const live = resolveLiveOptions(options);
  if (!live.liveAvailable || !live.gateway) {
    return prevalidatedHint(
      fixture,
      request,
      "GPT-5.6 hint delivery is unavailable without a server API credential; the approved progressive hint was loaded.",
    );
  }

  try {
    const hint = await live.gateway.revealHint(fixture, request);
    const approvedHint = fixture.hints[request.hintIndex];
    if (
      hint !== approvedHint ||
      hint.includes(fixture.fixedSnippet) ||
      hint.includes(fixture.hiddenReferenceSolution)
    ) {
      throw new Error("The model hint diverged from the approved progression step.");
    }
    return hintResponseSchema.parse({
      hintIndex: request.hintIndex,
      hint,
      source: "gpt-5.6",
    });
  } catch {
    return prevalidatedHint(
      fixture,
      request,
      "The live hint did not pass its safety gate; the approved progressive hint was loaded.",
    );
  }
}

function deterministicAssessment(
  fixture: ChallengeFixture,
  request: AssessRequest,
  testResult: ExecutionResponse["testResult"],
  changedLines: number,
): AssessmentResult {
  const passed = testResult.status === "passed";
  const disciplined = changedLines <= fixture.maxChangedLines;
  const verified = passed && disciplined;
  const reasoningText = `${request.hypothesisHistory.join(" ")} ${request.explanation}`.toLowerCase();
  const matchedSignalGroups = fixture.explanationSignals.filter((alternatives) =>
    alternatives.some((signal) => reasoningText.includes(signal.toLowerCase())),
  ).length;
  const causalLanguage = /\b(because|caus(?:e|ed|es|ing)|therefore|so|instead|exclud(?:e|ed|es|ing)|fall(?:s|ing)? through)\b/i.test(
    reasoningText,
  );
  const rootCauseScore = passed
    ? [40, 60, 78, 94][matchedSignalGroups]
    : [25, 35, 45, 55][matchedSignalGroups];
  const reasoningScore = Math.min(
    passed ? 92 : 55,
    35 + matchedSignalGroups * 13 + (causalLanguage ? 10 : 0) + Math.min(6, request.hypothesisHistory.length * 2),
  );
  const conceptUnderstandingScore = passed
    ? [35, 55, 75, 90][matchedSignalGroups]
    : [25, 35, 45, 55][matchedSignalGroups];
  const explanationGrounded = matchedSignalGroups >= 2 && causalLanguage;
  const prevalidated = testResult.executionMode === "prevalidated_fixture";

  return {
    completionStatus: verified ? "verified" : "not_verified",
    rootCauseScore,
    reasoningScore,
    patchDisciplineScore: disciplined ? 96 : 45,
    conceptUnderstandingScore,
    strengths: passed && !disciplined
      ? ["The executed tests passed, but verification remains gated by the approved minimal-change boundary."]
      : passed && explanationGrounded
      ? ["The repair passed and the explanation connected multiple challenge-specific causal signals."]
      : passed
        ? ["The submitted snapshot passed the authoritative deterministic challenge checks."]
      : ["The explanation was recorded and can guide the next debugging iteration."],
    improvementAreas: passed && !disciplined
      ? ["Reduce the repair to the smallest causal change before treating the attempt as verified."]
      : passed && explanationGrounded
      ? ["Continue connecting the observed failure signature to the smallest causal code change."]
      : passed
        ? ["Name the affected condition, boundary or state, and explain causally why the observed test failed."]
      : ["Resolve the remaining failing test before treating the repair as complete."],
    evidenceSummary: passed && !disciplined
      ? `${testResult.passedCount} executed tests passed, but ${changedLines} changed lines exceeded this lab's server-owned minimal-repair boundary.`
      : passed
      ? prevalidated
        ? `The submitted source matched the server-owned repair snapshot associated with ${testResult.passedCount} passing tests and ${changedLines} changed line${changedLines === 1 ? "" : "s"}.`
        : `${testResult.passedCount} Code Interpreter tests passed with ${changedLines} changed line${changedLines === 1 ? "" : "s"}.`
      : prevalidated
        ? `The submitted source did not match the prevalidated repair; the fixture's ${testResult.failedCount}-failure evidence remains authoritative.`
        : `${testResult.failedCount} Code Interpreter test${testResult.failedCount === 1 ? "" : "s"} still failed; verified status is blocked by executed evidence.`,
    nextPracticeRecommendation: `Practice another ${fixture.targetSkill.toLowerCase()} challenge with one fewer hint.`,
  };
}

function applyModelScores(
  assessment: AssessmentResult,
  scores: ModelAssessmentScores,
): AssessmentResult {
  return {
    ...assessment,
    rootCauseScore: scores.rootCauseScore,
    reasoningScore: scores.reasoningScore,
    conceptUnderstandingScore: scores.conceptUnderstandingScore,
  };
}

export async function assessChallengeWorkflow(
  request: AssessRequest,
  options?: LiveOptions,
): Promise<AssessmentResponse> {
  const fixture = getFixture(request.challengeId);
  if (!fixture) {
    throw new RequestError("The challenge identifier is invalid.", "INVALID_CHALLENGE", 404);
  }
  const changedFiles = fixture.allowedFiles.filter((path) => {
    const initial = fixture.mutatedFiles.find((file) => file.path === path)?.content ?? "";
    const submitted = request.files.find((file) => file.path === path)?.content ?? "";
    return initial !== submitted;
  });
  const changedLines = fixture.allowedFiles.reduce((total, path) => {
    const initial = fixture.mutatedFiles.find((file) => file.path === path)?.content ?? "";
    const submitted = request.files.find((file) => file.path === path)?.content ?? "";
    return total + countChangedLines(initial, submitted);
  }, 0);
  const execution = await executeChallengeWorkflow(request, options);
  const live = resolveLiveOptions(options);
  let assessmentSource: AssessmentResponse["assessmentSource"] = "deterministic_fallback";
  let assessment = deterministicAssessment(
    fixture,
    request,
    execution.testResult,
    changedLines,
  );

  if (live.liveAvailable && live.gateway) {
    try {
      const scores = await live.gateway.assess(
        fixture,
        request,
        execution.testResult,
        changedLines,
        changedFiles,
      );
      assessment = applyModelScores(assessment, scores);
      assessmentSource = "gpt-5.6";
    } catch {
      assessmentSource = "deterministic_fallback";
    }
  }

  if (
    execution.testResult.status !== "passed" ||
    changedLines > fixture.maxChangedLines
  ) {
    assessment = { ...assessment, completionStatus: "not_verified" };
  }

  return assessmentResponseSchema.parse({
    assessment,
    testResult: execution.testResult,
    assessmentSource,
    hintsUsed: request.hintsUsed,
    testRuns: request.testRuns,
    changedLines,
    changedFiles,
    elapsedSeconds: request.elapsedSeconds,
    hypothesisRevisions: request.hypothesisHistory.length,
  });
}

/**
 * Section 3.6's "observation and question ... both pass assertNoLeak"
 * invariant applies to every response source, not just the live model
 * path. The deterministic fallback's templates are hand-written and
 * grounded only in already-visible evidence (see
 * `hypothesis-fallback.test.ts`), so this should never actually trip — but
 * nothing previously enforced that in code, so a future template edit
 * could silently reproduce protected text with no test to catch it. Fail
 * to a fixed, hard-coded emergency response rather than risk a leak.
 */
function ensureFallbackSafe(
  response: HypothesisResponse,
  fixture: ChallengeFixture,
): HypothesisResponse {
  const jointText = `${response.observation} ${response.question}`;
  const safe =
    assertNoLeak(response.observation, fixture).passed &&
    assertNoLeak(response.question, fixture).passed &&
    assertNoLeak(jointText, fixture).passed;
  if (safe) return response;

  recordContainmentRejection();
  return hypothesisResponseSchema.parse({
    source: "deterministic_fallback",
    axes: { locus: "unstated", mechanism: "unstated", trigger: "unstated" },
    weakestAxis: "none",
    observation:
      "Structural coaching is temporarily unavailable for this hypothesis. Re-run the tests and compare the failing case with the closest passing ones.",
    question: "Which single input value distinguishes the failing test from the passing ones?",
    movement: "first",
  });
}

/**
 * AI hypothesis coach (design spec section 3, phase 2). Additive and
 * strictly advisory: it never writes progress or completion, which remain
 * owned by the deterministic tests in `assessChallengeWorkflow`.
 *
 * Containment is an output filter, not a prompt-input restriction (spec
 * 3.4). The model only ever sees the answer-blind `CoachContext` built by
 * `buildCoachContext`; its candidate response is then checked with
 * `assertNoLeak` — on the observation and question individually *and* on
 * their concatenation, so a leak split across the two fields can't pass
 * each field's individual check — and, when the gateway implements it, a
 * semantic second-layer classifier grounded in the fixture's hidden answer
 * key. A rejected candidate gets exactly one regeneration under a stricter
 * instruction; a provider error, timeout, or unparsable response instead
 * routes straight to the deterministic fallback (spec 3.5) rather than
 * spending that regeneration budget on a failure that was never a leak. No
 * provider failure ever produces a 5xx for the learner, and a leak — once
 * detected by either layer — never reaches the learner.
 */
export async function evaluateHypothesisWorkflow(
  request: HypothesisRequest,
  options?: LiveOptions,
): Promise<HypothesisResponse> {
  const fixture = getFixture(request.challengeId);
  if (!fixture) {
    throw new RequestError("The challenge identifier is invalid.", "INVALID_CHALLENGE", 404);
  }

  const context = buildCoachContext(fixture, request);
  const live = resolveLiveOptions(options);

  if (live.liveAvailable && live.gateway) {
    const gateway = live.gateway;
    for (let attempt = 0; attempt < MAX_COACH_ATTEMPTS; attempt += 1) {
      let candidate;
      try {
        candidate = await gateway.coachHypothesis(context, attempt > 0);
      } catch {
        // Provider error, timeout, or an unparsable response was never a
        // leak: degrade straight to the deterministic fallback instead of
        // consuming the containment-retry budget on it (spec 3.5).
        break;
      }

      const jointCandidate = `${candidate.observation} ${candidate.question}`;
      const denylistSafe =
        assertNoLeak(candidate.observation, fixture).passed &&
        assertNoLeak(candidate.question, fixture).passed &&
        assertNoLeak(jointCandidate, fixture).passed;
      if (!denylistSafe) {
        recordContainmentRejection();
        continue;
      }

      try {
        const semanticLeak = await gateway.classifyHypothesisLeak?.(candidate, fixture);
        if (semanticLeak) {
          recordContainmentRejection();
          continue;
        }
      } catch {
        // The classifier itself failed: fail closed and treat the
        // candidate as unverified rather than trusting it.
        recordContainmentRejection();
        continue;
      }

      return hypothesisResponseSchema.parse({ ...candidate, source: "gpt-5.6" });
    }
  }

  return ensureFallbackSafe(buildDeterministicFallbackResponse(context), fixture);
}
