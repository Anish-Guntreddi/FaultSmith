import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type {
  AssessRequest,
  GenerateChallengeRequest,
  TestResult,
} from "@/lib/contracts";
import type { ModelHypothesisCoachResponse } from "@/server/hypothesis-coach-contract";
import type { CoachContext } from "@/server/hypothesis-context";
import type { MutationPlan } from "@/server/mutation-contract";
import type { ValidationInterpretation } from "@/server/validation-contract";
import {
  buildAssessmentInput,
  modelAssessmentScoresSchema,
  type AIGateway,
  type ModelAssessmentScores,
} from "./ai-gateway";
import { runFixtureTests } from "./fixture-runner";
import { challengeFixtures, type ChallengeFixture } from "./fixtures";
import {
  assessChallengeWorkflow,
  evaluateHypothesisWorkflow,
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

const modelScores: ModelAssessmentScores = {
  rootCauseScore: 90,
  reasoningScore: 88,
  conceptUnderstandingScore: 89,
};

class MockGateway implements AIGateway {
  planCalls = 0;
  constructor(
    private readonly behavior: {
      failPlan?: boolean;
      originalResult?: TestResult;
      mutatedResult?: TestResult;
      executionResult?: TestResult;
      assessment?: ModelAssessmentScores;
      hint?: string;
      validationInterpretation?: ValidationInterpretation;
      coachFail?: boolean;
      coachResponse?: ModelHypothesisCoachResponse;
      classifyLeak?: boolean;
    } = {},
  ) {}

  classifyLeakCalls = 0;

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
    return this.behavior.assessment ?? modelScores;
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

  async coachHypothesis(context: CoachContext, stricter: boolean) {
    void context;
    void stricter;
    if (this.behavior.coachFail) throw new Error("coach provider unavailable");
    return (
      this.behavior.coachResponse ?? {
        axes: { locus: "partial", mechanism: "unstated", trigger: "unstated" },
        weakestAxis: "mechanism" as const,
        observation: "The mutated source still contains the comparison you named.",
        question: "What specific comparison or condition causes the wrong behavior?",
        movement: "first" as const,
      }
    );
  }

  async classifyHypothesisLeak(
    candidate: { observation: string; question: string },
    fixture: ChallengeFixture,
  ) {
    void candidate;
    void fixture;
    this.classifyLeakCalls += 1;
    return this.behavior.classifyLeak ?? false;
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
        gateway: new MockGateway({ assessment: modelScores }),
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

  it("keeps all live assessment prose server-owned even if a gateway returns extra hidden text", async () => {
    const fixture = challengeFixtures[0];
    const hiddenText = fixture.hiddenReferenceSolution;
    const maliciousGateway = new MockGateway({
      assessment: {
        ...modelScores,
        strengths: [hiddenText],
        improvementAreas: [fixture.hiddenRootCause],
        evidenceSummary: fixture.fixedSnippet,
        nextPracticeRecommendation: fixture.hints[2],
      } as ModelAssessmentScores,
    });
    const response = await assessChallengeWorkflow(
      assessmentRequest(fixture.originalFiles, "code_interpreter"),
      { liveAvailable: true, gateway: maliciousGateway },
    );
    const serialized = JSON.stringify(response);

    expect(response.assessmentSource).toBe("gpt-5.6");
    expect(response.assessment.completionStatus).toBe("verified");
    expect(response.assessment.rootCauseScore).toBe(modelScores.rootCauseScore);
    expect(serialized).not.toContain(hiddenText);
    expect(serialized).not.toContain(fixture.hiddenRootCause);
    expect(serialized).not.toContain(fixture.fixedSnippet);
    expect(serialized).not.toContain(fixture.hints[2]);
  });

  it("withholds hidden fixture knowledge from score-only live assessment input", () => {
    const fixture = challengeFixtures[0];
    const request = assessmentRequest(fixture.originalFiles, "code_interpreter");
    const modelInput = buildAssessmentInput(
      fixture,
      request,
      runFixtureTests(fixture, fixture.originalFiles),
      1,
      fixture.allowedFiles,
    );
    const serialized = JSON.stringify(modelInput);

    expect(serialized).not.toContain(fixture.hiddenRootCause);
    expect(serialized).not.toContain(fixture.hiddenReferenceSolution);
    expect(serialized).not.toContain(fixture.fixedSnippet);
    expect(serialized).not.toContain(fixture.hints[2]);
    expect(modelAssessmentScoresSchema.safeParse({
      ...modelScores,
      strengths: [fixture.hiddenRootCause],
    }).success).toBe(false);
  });

  it("withholds live verification when a passing repair exceeds the minimal-change boundary", async () => {
    const fixture = challengeFixtures[0];
    const broadFiles = fixture.mutatedFiles.map((file) => ({
      ...file,
      content: `${fixture.originalFiles[0].content}\n# broad rewrite\n# unrelated line`,
    }));
    const passing: TestResult = {
      status: "passed",
      passedCount: fixture.passedCount,
      failedCount: 0,
      durationMs: 80,
      sanitizedOutput: `${fixture.passedCount} passed`,
      matchedExpectedFailure: false,
      executionMode: "code_interpreter",
    };
    const response = await assessChallengeWorkflow(
      assessmentRequest(broadFiles, "code_interpreter"),
      {
        liveAvailable: true,
        gateway: new MockGateway({ executionResult: passing }),
      },
    );

    expect(response.testResult.status).toBe("passed");
    expect(response.changedLines).toBeGreaterThan(fixture.maxChangedLines);
    expect(response.assessment.completionStatus).toBe("not_verified");
    expect(response.assessment.patchDisciplineScore).toBe(45);
    expect(response.assessment.evidenceSummary).toContain("minimal-repair boundary");
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

const hypothesisRequest = (fixture: ChallengeFixture) => ({
  challengeId: fixture.challengeId,
  hypothesis: "The comparison excludes the exact boundary value.",
  hypothesisHistory: ["An earlier, vaguer guess about the threshold."],
});

describe("evaluateHypothesisWorkflow", () => {
  it("uses the deterministic fallback when the API key is missing", async () => {
    const fixture = challengeFixtures[0];
    const response = await evaluateHypothesisWorkflow(hypothesisRequest(fixture), {
      liveAvailable: false,
    });

    expect(response.source).toBe("deterministic_fallback");
    expect(response.axes.locus).not.toBe("aligned");
    expect(response.axes.locus).not.toBe("off");
  });

  it("returns a live response validated against the strict response schema", async () => {
    const fixture = challengeFixtures[0];
    const response = await evaluateHypothesisWorkflow(hypothesisRequest(fixture), {
      liveAvailable: true,
      gateway: new MockGateway(),
    });

    expect(response.source).toBe("gpt-5.6");
    expect(response.weakestAxis).toBe("mechanism");
  });

  it("degrades to the deterministic fallback on a provider error, never throwing", async () => {
    const fixture = challengeFixtures[0];
    const response = await evaluateHypothesisWorkflow(hypothesisRequest(fixture), {
      liveAvailable: true,
      gateway: new MockGateway({ coachFail: true }),
    });

    expect(response.source).toBe("deterministic_fallback");
  });

  it("regenerates once under a stricter instruction when a leak is detected, then succeeds", async () => {
    const fixture = challengeFixtures[0];
    let calls = 0;
    const gateway = new MockGateway();
    gateway.coachHypothesis = async (_context, stricter) => {
      calls += 1;
      if (!stricter) {
        return {
          axes: { locus: "aligned", mechanism: "unstated", trigger: "unstated" },
          weakestAxis: "mechanism",
          observation: `The repair is: ${fixture.fixedSnippet}`,
          question: "Does that match your hypothesis?",
          movement: "first",
        };
      }
      return {
        axes: { locus: "aligned", mechanism: "partial", trigger: "unstated" },
        weakestAxis: "trigger",
        observation: "The failing test rejects the exact boundary value.",
        question: "Which input value sits right at that boundary?",
        movement: "first",
      };
    };

    const response = await evaluateHypothesisWorkflow(hypothesisRequest(fixture), {
      liveAvailable: true,
      gateway,
    });

    expect(calls).toBe(2);
    expect(response.source).toBe("gpt-5.6");
    expect(response.weakestAxis).toBe("trigger");
    expect(JSON.stringify(response)).not.toContain(fixture.fixedSnippet);
  });

  it("degrades to the deterministic fallback when both attempts leak protected content", async () => {
    const fixture = challengeFixtures[0];
    const gateway = new MockGateway();
    gateway.coachHypothesis = async () => ({
      axes: { locus: "aligned", mechanism: "unstated", trigger: "unstated" },
      weakestAxis: "mechanism" as const,
      observation: `The repair is: ${fixture.fixedSnippet}`,
      question: "Does that match your hypothesis?",
      movement: "first" as const,
    });

    const response = await evaluateHypothesisWorkflow(hypothesisRequest(fixture), {
      liveAvailable: true,
      gateway,
    });

    expect(response.source).toBe("deterministic_fallback");
    expect(JSON.stringify(response)).not.toContain(fixture.fixedSnippet);
  });

  it("never carries hidden fixture material even when the model attempts to leak it", async () => {
    const fixture = challengeFixtures[0];
    const gateway = new MockGateway();
    gateway.coachHypothesis = async () => ({
      axes: { locus: "aligned", mechanism: "aligned", trigger: "aligned" },
      weakestAxis: "none" as const,
      observation: fixture.hiddenRootCause,
      question: "Does that match your hypothesis?",
      movement: "first" as const,
    });

    const response = await evaluateHypothesisWorkflow(hypothesisRequest(fixture), {
      liveAvailable: true,
      gateway,
    });

    expect(response.source).toBe("deterministic_fallback");
    const serialized = JSON.stringify(response);
    expect(serialized).not.toContain(fixture.hiddenRootCause);
    expect(serialized).not.toContain(fixture.hiddenReferenceSolution);
  });

  it("catches a leak split across the observation and question fields (security remediation)", async () => {
    // inventory-idempotency-v1's fixedSnippet ("return stock") has no
    // operators and is short enough to split cleanly: "return" in the
    // observation and "stock" in the question each individually pass
    // assertNoLeak (neither reproduces the full protected line, and
    // neither has enough non-trivial tokens to trip the reference-solution
    // rule on its own), but concatenated with the single space the UI
    // renders them with, they reconstruct the exact protected line.
    const fixture = challengeFixtures.find(
      (item) => item.challengeId === "inventory-idempotency-v1",
    );
    expect(fixture).toBeDefined();
    expect(fixture!.fixedSnippet.trim()).toBe("return stock");

    const gateway = new MockGateway();
    gateway.coachHypothesis = async (_context, stricter) => {
      if (!stricter) {
        return {
          axes: { locus: "aligned", mechanism: "unstated", trigger: "unstated" },
          weakestAxis: "mechanism",
          observation: "Consider what the branch should do: return",
          question: "stock — does that match your hypothesis?",
          movement: "first",
        };
      }
      return {
        axes: { locus: "aligned", mechanism: "partial", trigger: "unstated" },
        weakestAxis: "trigger",
        observation: "The second call with the same request ID still changes the count.",
        question: "What should happen on a repeated request ID?",
        movement: "first",
      };
    };

    const response = await evaluateHypothesisWorkflow(hypothesisRequest(fixture!), {
      liveAvailable: true,
      gateway,
    });

    // If the split bypass were still open, this would return the leaked
    // first-attempt candidate as a live "gpt-5.6" response; instead the
    // joint check rejects it and the stricter regeneration takes over.
    expect(response.source).toBe("gpt-5.6");
    const serialized = JSON.stringify(response);
    expect(serialized).not.toContain("Consider what the branch should do");
  });

  it("consults the gateway's semantic leak classifier when the substring denylist passes, and regenerates on a flagged leak", async () => {
    const fixture = challengeFixtures[0];
    const gateway = new MockGateway({ classifyLeak: true });
    gateway.coachHypothesis = async (_context, stricter) => ({
      axes: { locus: "aligned", mechanism: "partial", trigger: "unstated" },
      weakestAxis: "trigger" as const,
      observation: stricter
        ? "The failing test rejects the exact boundary value."
        : "A paraphrase that survives the denylist but the classifier still flags.",
      question: "Which input value sits right at that boundary?",
      movement: "first" as const,
    });

    const response = await evaluateHypothesisWorkflow(hypothesisRequest(fixture), {
      liveAvailable: true,
      gateway,
    });

    // The classifier keeps flagging every attempt in this test, so the
    // workflow exhausts MAX_COACH_ATTEMPTS and degrades to the fallback —
    // proving the classifier's "leaks" verdict is actually honored rather
    // than only the denylist mattering.
    expect(gateway.classifyLeakCalls).toBeGreaterThan(0);
    expect(response.source).toBe("deterministic_fallback");
  });

  it("does not call the classifier when the denylist already rejected the candidate", async () => {
    const fixture = challengeFixtures[0];
    const gateway = new MockGateway({ classifyLeak: false });
    gateway.coachHypothesis = async () => ({
      axes: { locus: "aligned", mechanism: "unstated", trigger: "unstated" },
      weakestAxis: "mechanism" as const,
      observation: `The repair is: ${fixture.fixedSnippet}`,
      question: "Does that match your hypothesis?",
      movement: "first" as const,
    });

    await evaluateHypothesisWorkflow(hypothesisRequest(fixture), {
      liveAvailable: true,
      gateway,
    });

    expect(gateway.classifyLeakCalls).toBe(0);
  });

  it("fails closed and regenerates when the semantic classifier itself errors", async () => {
    const fixture = challengeFixtures[0];
    const gateway = new MockGateway();
    let classifyCalls = 0;
    gateway.classifyHypothesisLeak = async () => {
      classifyCalls += 1;
      throw new Error("classifier provider unavailable");
    };
    gateway.coachHypothesis = async (_context, stricter) => ({
      axes: { locus: "aligned", mechanism: "partial", trigger: "unstated" },
      weakestAxis: "trigger" as const,
      observation: stricter
        ? "The failing test rejects the exact boundary value."
        : "An otherwise clean observation the classifier never got to verify.",
      question: "Which input value sits right at that boundary?",
      movement: "first" as const,
    });

    const response = await evaluateHypothesisWorkflow(hypothesisRequest(fixture), {
      liveAvailable: true,
      gateway,
    });

    // A classifier failure must never be treated as an implicit pass —
    // it should fail closed exactly like a detected leak, not like an
    // unrelated provider error that skips straight to the fallback.
    expect(classifyCalls).toBeGreaterThan(0);
    expect(response.source).toBe("deterministic_fallback");
  });

  it("degrades to the fallback immediately on a provider error without spending the containment-retry budget", async () => {
    const fixture = challengeFixtures[0];
    const gateway = new MockGateway({ coachFail: true });
    let calls = 0;
    const originalCoach = gateway.coachHypothesis.bind(gateway);
    gateway.coachHypothesis = async (context, stricter) => {
      calls += 1;
      return originalCoach(context, stricter);
    };

    const response = await evaluateHypothesisWorkflow(hypothesisRequest(fixture), {
      liveAvailable: true,
      gateway,
    });

    expect(response.source).toBe("deterministic_fallback");
    // A provider error was never a leak, so it should not consume the
    // stricter-regeneration attempt — the gateway is called exactly once.
    expect(calls).toBe(1);
  });
});
