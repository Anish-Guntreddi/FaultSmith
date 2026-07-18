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
  type PublicChallenge,
} from "@/lib/contracts";
import type { MutationPlan } from "@/server/mutation-contract";
import { OpenAIGateway, hasOpenAIKey, type AIGateway } from "./ai-gateway";
import { getPrevalidatedChallenge, toPublicChallenge } from "./challenge-service";
import { countChangedLines, runFixtureTests, validateSubmittedFiles } from "./fixture-runner";
import { getFixture, selectFixture, withRequestedDifficulty, type ChallengeFixture } from "./fixtures";
import { RequestError } from "./request-guard";

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
    completionStatus: passed ? "verified" : "not_verified",
    rootCauseScore,
    reasoningScore,
    patchDisciplineScore: disciplined ? 96 : 45,
    conceptUnderstandingScore,
    strengths: passed && explanationGrounded
      ? ["The repair passed and the explanation connected multiple challenge-specific causal signals."]
      : passed
        ? ["The submitted snapshot passed the authoritative deterministic challenge checks."]
      : ["The explanation was recorded and can guide the next debugging iteration."],
    improvementAreas: passed && explanationGrounded
      ? ["Continue connecting the observed failure signature to the smallest causal code change."]
      : passed
        ? ["Name the affected condition, boundary or state, and explain causally why the observed test failed."]
      : ["Resolve the remaining failing test before treating the repair as complete."],
    evidenceSummary: passed
      ? prevalidated
        ? `The submitted source matched the server-owned repair snapshot associated with ${testResult.passedCount} passing tests and ${changedLines} changed line${changedLines === 1 ? "" : "s"}.`
        : `${testResult.passedCount} Code Interpreter tests passed with ${changedLines} changed line${changedLines === 1 ? "" : "s"}.`
      : prevalidated
        ? `The submitted source did not match the prevalidated repair; the fixture's ${testResult.failedCount}-failure evidence remains authoritative.`
        : `${testResult.failedCount} Code Interpreter test${testResult.failedCount === 1 ? "" : "s"} still failed; verified status is blocked by executed evidence.`,
    nextPracticeRecommendation: `Practice another ${fixture.targetSkill.toLowerCase()} challenge with one fewer hint.`,
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
      assessment = await live.gateway.assess(
        fixture,
        request,
        execution.testResult,
        changedLines,
        changedFiles,
      );
      assessmentSource = "gpt-5.6";
    } catch {
      assessmentSource = "deterministic_fallback";
    }
  }

  if (execution.testResult.status !== "passed") {
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
