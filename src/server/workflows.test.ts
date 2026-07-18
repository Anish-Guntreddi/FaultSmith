import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type {
  AssessRequest,
  AssessmentResult,
  GenerateChallengeRequest,
  TestResult,
} from "@/lib/contracts";
import type { MutationPlan } from "@/server/mutation-contract";
import type { ValidationInterpretation } from "@/server/validation-contract";
import type { AIGateway } from "./ai-gateway";
import { runFixtureTests } from "./fixture-runner";
import { challengeFixtures, type ChallengeFixture } from "./fixtures";
import {
  assessChallengeWorkflow,
  executeChallengeWorkflow,
  generateChallengeWorkflow,
  revealHintWorkflow,
} from "./workflows";

function planFor(fixture: ChallengeFixture, request: GenerateChallengeRequest): MutationPlan {
  return {
    challengeId: fixture.challengeId,
    projectId: fixture.projectId,
    title: fixture.title,
    targetSkill: fixture.targetSkill,
    difficulty: request.difficulty,
    learningObjective: fixture.learningObjective,
    learnerBrief: fixture.learnerBrief,
    allowedFiles: fixture.allowedFiles,
    mutationPatch: fixture.mutationPatch,
    expectedFailureTests: fixture.expectedFailureTests,
    expectedFailureSignature: fixture.expectedFailureSignature,
    hiddenRootCause: fixture.hiddenRootCause,
    hiddenReferenceSolution: fixture.hiddenReferenceSolution,
    hints: fixture.hints,
    rubric: fixture.rubric,
  };
}

const verifiedAssessment: AssessmentResult = {
  completionStatus: "verified",
  rootCauseScore: 90,
  reasoningScore: 88,
  patchDisciplineScore: 96,
  conceptUnderstandingScore: 89,
  strengths: ["Clear causal explanation."],
  improvementAreas: ["Add one more observation."],
  evidenceSummary: "The model says this is verified.",
  nextPracticeRecommendation: "Try a harder boundary challenge.",
};

class MockGateway implements AIGateway {
  planCalls = 0;
  constructor(
    private readonly behavior: {
      failPlan?: boolean;
      originalResult?: TestResult;
      mutatedResult?: TestResult;
      executionResult?: TestResult;
      assessment?: AssessmentResult;
      hint?: string;
      validationInterpretation?: ValidationInterpretation;
    } = {},
  ) {}

  async planMutation(fixture: ChallengeFixture, request: GenerateChallengeRequest) {
    this.planCalls += 1;
    if (this.behavior.failPlan) throw new Error("malformed model output");
    return planFor(fixture, request);
  }

  async runTests(
    fixture: ChallengeFixture,
    files: ChallengeFixture["originalFiles"],
    expectedFailure: boolean,
  ) {
    if (this.behavior.executionResult) return this.behavior.executionResult;
    if (expectedFailure && this.behavior.mutatedResult) return this.behavior.mutatedResult;
    if (!expectedFailure && this.behavior.originalResult) return this.behavior.originalResult;
    return {
      ...runFixtureTests(fixture, files),
      executionMode: "code_interpreter" as const,
    };
  }

  async assess() {
    return this.behavior.assessment ?? verifiedAssessment;
  }

  async revealHint(fixture: ChallengeFixture, request: { hintIndex: number }) {
    return this.behavior.hint ?? fixture.hints[request.hintIndex];
  }

  async interpretValidation(
    _fixture: ChallengeFixture,
    original: TestResult,
    mutated: TestResult,
  ) {
    return (
      this.behavior.validationInterpretation ?? {
        originalPassed: original.status === "passed" && original.failedCount === 0,
        mutationFailed: mutated.status === "failed" && mutated.failedCount > 0,
        matchedExpectedFailure: mutated.matchedExpectedFailure,
        releaseRecommended:
          original.status === "passed" &&
          original.failedCount === 0 &&
          mutated.status === "failed" &&
          mutated.failedCount > 0 &&
          mutated.matchedExpectedFailure,
        validationFeedback: "Evidence satisfies the deterministic release gate.",
      }
    );
  }
}

const generationRequest: GenerateChallengeRequest = {
  projectId: "expense-approval",
  targetSkill: "Boundary conditions",
  difficulty: "intermediate",
  preferLive: true,
};

function assessmentRequest(
  files: ChallengeFixture["originalFiles"],
  executionMode: AssessRequest["executionMode"] = "prevalidated_fixture",
): AssessRequest {
  return {
    challengeId: "expense-boundary-v1",
    files,
    executionMode,
    hypothesis: "The exact threshold is excluded by the current comparison.",
    hypothesisHistory: [
      "The failure may be caused by the approval threshold comparison.",
      "The exact threshold is excluded by the current comparison.",
    ],
    explanation: "The greater-than operator excludes 500; making the boundary inclusive restores the policy.",
    hintsUsed: 1,
    testRuns: 2,
    elapsedSeconds: 90,
  };
}

describe("OpenAI-backed workflows with mocked provider calls", () => {
  it("uses the real prevalidated fallback when the API key is missing", async () => {
    const challenge = await generateChallengeWorkflow(generationRequest, {
      liveAvailable: false,
    });

    expect(challenge.source).toBe("prevalidated");
    expect(challenge.fallbackReason).toContain("no API credential");
    expect(challenge.initialTestResult.status).toBe("failed");
  });

  it("accepts a schema-valid approved plan only after original-pass and mutated-fail", async () => {
    const challenge = await generateChallengeWorkflow(generationRequest, {
      liveAvailable: true,
      gateway: new MockGateway(),
    });

    expect(challenge.source).toBe("generated");
    expect(challenge.initialTestResult.status).toBe("failed");
    expect(challenge.initialTestResult.matchedExpectedFailure).toBe(true);
    expect(challenge.initialTestResult.executionMode).toBe("code_interpreter");
    expect(challenge).not.toHaveProperty("hiddenRootCause");
  });

  it("caps malformed model recovery at two attempts and then falls back", async () => {
    const gateway = new MockGateway({ failPlan: true });
    const challenge = await generateChallengeWorkflow(generationRequest, {
      liveAvailable: true,
      gateway,
    });

    expect(gateway.planCalls).toBe(2);
    expect(challenge.source).toBe("prevalidated");
    expect(challenge.fallbackReason).toContain("after two attempts");
  });

  it("rejects a mutation that does not fail with the expected signature", async () => {
    const noFailure: TestResult = {
      status: "passed",
      passedCount: 6,
      failedCount: 0,
      durationMs: 100,
      sanitizedOutput: "6 passed",
      matchedExpectedFailure: false,
      executionMode: "code_interpreter",
    };
    const challenge = await generateChallengeWorkflow(generationRequest, {
      liveAvailable: true,
      gateway: new MockGateway({ mutatedResult: noFailure }),
    });

    expect(challenge.source).toBe("prevalidated");
  });

  it("lets validation interpretation veto release but never promote invalid evidence", async () => {
    const gateway = new MockGateway({
      validationInterpretation: {
        originalPassed: true,
        mutationFailed: true,
        matchedExpectedFailure: true,
        releaseRecommended: false,
        validationFeedback: "The evidence needs another validation pass.",
      },
    });
    const challenge = await generateChallengeWorkflow(generationRequest, {
      liveAvailable: true,
      gateway,
    });

    expect(gateway.planCalls).toBe(2);
    expect(challenge.source).toBe("prevalidated");
    expect(challenge.fallbackReason).toContain("after two attempts");

    const invalidMutation: TestResult = {
      status: "passed",
      passedCount: 6,
      failedCount: 0,
      durationMs: 100,
      sanitizedOutput: "6 passed",
      matchedExpectedFailure: false,
      executionMode: "code_interpreter",
    };
    const permissiveGateway = new MockGateway({
      mutatedResult: invalidMutation,
      validationInterpretation: {
        originalPassed: true,
        mutationFailed: true,
        matchedExpectedFailure: true,
        releaseRecommended: true,
        validationFeedback: "Release recommended.",
      },
    });
    const rejected = await generateChallengeWorkflow(generationRequest, {
      liveAvailable: true,
      gateway: permissiveGateway,
    });

    expect(rejected.source).toBe("prevalidated");
  });

  it("rejects schema-valid plans that expand the allowlist or mutation scope", async () => {
    const gateway = new MockGateway();
    gateway.planMutation = async (fixture, request) => ({
      ...planFor(fixture, request),
      allowedFiles: [...fixture.allowedFiles, "tests/test_expense_approval.py"],
      mutationPatch: `${fixture.mutationPatch}; plus a second root cause`,
    });
    const challenge = await generateChallengeWorkflow(generationRequest, {
      liveAvailable: true,
      gateway,
    });

    expect(gateway.planCalls).toBe(0);
    expect(challenge.source).toBe("prevalidated");
    expect(challenge.fallbackReason).toContain("after two attempts");
  });

  it("recovers from a missing key and Code Interpreter timeout with an explicit fallback label", async () => {
    const fixture = challengeFixtures[0];
    const missingKey = await executeChallengeWorkflow(
      {
        challengeId: fixture.challengeId,
        files: fixture.originalFiles,
        executionMode: "code_interpreter",
      },
      { liveAvailable: false },
    );
    expect(missingKey.fallbackUsed).toBe(true);
    expect(missingKey.recoveredFrom).toBe("missing_key");
    expect(missingKey.testResult.status).toBe("passed");

    const timeout: TestResult = {
      status: "timeout",
      passedCount: 0,
      failedCount: 0,
      durationMs: 20_000,
      sanitizedOutput: "timed out",
      matchedExpectedFailure: false,
      executionMode: "code_interpreter",
    };
    const recovered = await executeChallengeWorkflow(
      {
        challengeId: fixture.challengeId,
        files: fixture.originalFiles,
        executionMode: "code_interpreter",
      },
      { liveAvailable: true, gateway: new MockGateway({ executionResult: timeout }) },
    );
    expect(recovered.fallbackUsed).toBe(true);
    expect(recovered.recoveredFrom).toBe("timeout");
    expect(recovered.recoveryNotice).toContain("timed out");

    const expired: TestResult = {
      ...timeout,
      status: "error",
      sanitizedOutput: "expired container identifier",
    };
    const expiredRecovery = await executeChallengeWorkflow(
      {
        challengeId: fixture.challengeId,
        files: fixture.originalFiles,
        executionMode: "code_interpreter",
      },
      { liveAvailable: true, gateway: new MockGateway({ executionResult: expired }) },
    );
    expect(expiredRecovery.fallbackUsed).toBe(true);
    expect(expiredRecovery.recoveredFrom).toBe("error");
    expect(expiredRecovery.recoveryNotice).not.toContain("identifier");
  });

  it("delivers only an approved progressive hint and recovers from unsafe live output", async () => {
    const fixture = challengeFixtures[0];
    const request = {
      challengeId: fixture.challengeId,
      hintIndex: 0,
      hypothesis: "The exact policy boundary may be excluded by the comparison.",
      preferLive: true,
    } as const;
    const live = await revealHintWorkflow(request, {
      liveAvailable: true,
      gateway: new MockGateway(),
    });
    expect(live.source).toBe("gpt-5.6");
    expect(live.hint).toBe(fixture.hints[0]);

    const recovered = await revealHintWorkflow(request, {
      liveAvailable: true,
      gateway: new MockGateway({ hint: fixture.hiddenReferenceSolution }),
    });
    expect(recovered.source).toBe("prevalidated");
    expect(recovered.hint).toBe(fixture.hints[0]);
    expect(recovered.recoveryNotice).toContain("safety gate");
  });

  it("never lets a model verify a failing submission", async () => {
    const fixture = challengeFixtures[0];
    const response = await assessChallengeWorkflow(
      assessmentRequest(fixture.mutatedFiles, "code_interpreter"),
      {
        liveAvailable: true,
        gateway: new MockGateway({ assessment: verifiedAssessment }),
      },
    );

    expect(response.testResult.status).toBe("failed");
    expect(response.assessment.completionStatus).toBe("not_verified");
    expect(response.hypothesisRevisions).toBe(2);
    expect(response.elapsedSeconds).toBe(90);
    expect(response.changedFiles).toEqual([]);
    for (const score of [
      response.assessment.rootCauseScore,
      response.assessment.reasoningScore,
      response.assessment.patchDisciplineScore,
      response.assessment.conceptUnderstandingScore,
    ]) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it("does not award high fallback reasoning scores for verbose irrelevant prose", async () => {
    const fixture = challengeFixtures[0];
    const irrelevant = await assessChallengeWorkflow(
      {
        ...assessmentRequest(fixture.originalFiles),
        hypothesis: "I suspect an unrelated formatting concern in the module layout.",
        hypothesisHistory: [
          "I suspect an unrelated formatting concern in the module layout.",
        ],
        explanation:
          "This is a deliberately long but irrelevant explanation about naming style, whitespace, module organization, and documentation presentation that never identifies the causal condition.",
      },
      { liveAvailable: false },
    );
    const grounded = await assessChallengeWorkflow(
      assessmentRequest(fixture.originalFiles),
      { liveAvailable: false },
    );

    expect(irrelevant.testResult.status).toBe("passed");
    expect(irrelevant.assessment.completionStatus).toBe("verified");
    expect(irrelevant.changedFiles).toEqual([fixture.allowedFiles[0]]);
    expect(irrelevant.assessment.rootCauseScore).toBeLessThanOrEqual(40);
    expect(irrelevant.assessment.improvementAreas[0]).toContain("causally");
    expect(grounded.assessment.rootCauseScore).toBeGreaterThan(
      irrelevant.assessment.rootCauseScore,
    );
  });
});
