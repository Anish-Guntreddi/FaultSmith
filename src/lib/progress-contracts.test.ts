import { describe, expect, it } from "vitest";

import type { AssessmentResponse } from "./contracts";
import { learningSteps } from "./learning-paths";
import {
  approvedSkills,
  attemptSummarySchema,
  deriveAttemptSummary,
  MAX_COMPLETION_TIMESTAMP,
  parseAttemptHistory,
  toDurationBucket,
  type AttemptSummary,
} from "./progress-contracts";

const guidedAttempt: AttemptSummary = {
  attemptId: "attempt-0000-0001",
  lessonId: "evidence-boundaries",
  projectId: "expense-approval",
  skill: "Boundary conditions",
  difficulty: "beginner",
  challengeSource: "prevalidated",
  status: "verified",
  rootCauseScore: 90,
  reasoningScore: 85,
  patchDisciplineScore: 95,
  conceptUnderstandingScore: 88,
  hintsUsed: 0,
  testRuns: 3,
  changedLines: 2,
  durationBucket: "under_5_minutes",
  completedAt: 1_000,
  provenance: "server_verified",
};

function attempt(overrides: Record<string, unknown> = {}) {
  return { ...guidedAttempt, ...overrides };
}

describe("attempt summary contract", () => {
  it("mirrors the approved skills of the lesson registry exactly", () => {
    expect(new Set(approvedSkills)).toEqual(new Set(learningSteps.map((step) => step.targetSkill)));
  });

  it("accepts a bounded guided attempt and a catalog attempt without a lesson", () => {
    expect(attemptSummarySchema.safeParse(guidedAttempt).success).toBe(true);
    expect(
      attemptSummarySchema.safeParse(
        attempt({ lessonId: null, difficulty: "advanced", attemptId: "catalog-attempt-1" }),
      ).success,
    ).toBe(true);
  });

  it("rejects unknown keys and malicious learner-content fields", () => {
    for (const tampered of [
      attempt({ hypothesis: "private learner prose" }),
      attempt({ explanation: "private root cause text" }),
      attempt({ sourceCode: "def approve(): ..." }),
      attempt({ idToken: "eyJhbGciOi" }),
      attempt({ apiKey: "sk-test" }),
    ]) {
      expect(attemptSummarySchema.safeParse(tampered).success).toBe(false);
    }
  });

  it("rejects unknown lessons, unknown skills, and combinations outside the registry", () => {
    expect(attemptSummarySchema.safeParse(attempt({ lessonId: "unknown-lesson" })).success).toBe(false);
    expect(attemptSummarySchema.safeParse(attempt({ skill: "Prompt engineering" })).success).toBe(false);
    expect(attemptSummarySchema.safeParse(attempt({ projectId: "inventory" })).success).toBe(false);
    expect(attemptSummarySchema.safeParse(attempt({ difficulty: "advanced" })).success).toBe(false);
    expect(
      attemptSummarySchema.safeParse(
        attempt({ lessonId: null, projectId: "inventory", skill: "Boolean logic" }),
      ).success,
    ).toBe(false);
  });

  it("rejects over-range, oversized, and non-integer values", () => {
    for (const invalid of [
      attempt({ rootCauseScore: 101 }),
      attempt({ reasoningScore: -1 }),
      attempt({ patchDisciplineScore: 88.5 }),
      attempt({ hintsUsed: 4 }),
      attempt({ testRuns: 101 }),
      attempt({ changedLines: 10_001 }),
      attempt({ completedAt: MAX_COMPLETION_TIMESTAMP + 1 }),
      attempt({ completedAt: -1 }),
      attempt({ durationBucket: "instant" }),
      attempt({ status: "certified" }),
      attempt({ provenance: "self_reported" }),
      attempt({ attemptId: "SHOUTING-ID" }),
      attempt({ attemptId: "short" }),
      attempt({ attemptId: "../etc/passwd" }),
    ]) {
      expect(attemptSummarySchema.safeParse(invalid).success).toBe(false);
    }
  });
});

describe("duration buckets", () => {
  it("assigns deterministic bounded buckets", () => {
    expect(toDurationBucket(0)).toBe("under_5_minutes");
    expect(toDurationBucket(299)).toBe("under_5_minutes");
    expect(toDurationBucket(300)).toBe("5_to_15_minutes");
    expect(toDurationBucket(899)).toBe("5_to_15_minutes");
    expect(toDurationBucket(900)).toBe("15_to_30_minutes");
    expect(toDurationBucket(1_799)).toBe("15_to_30_minutes");
    expect(toDurationBucket(1_800)).toBe("over_30_minutes");
    expect(toDurationBucket(86_400)).toBe("over_30_minutes");
    expect(toDurationBucket(Number.NaN)).toBe("under_5_minutes");
    expect(toDurationBucket(-5)).toBe("under_5_minutes");
  });
});

describe("parseAttemptHistory", () => {
  it("returns empty for non-array and drops tampered records", () => {
    expect(parseAttemptHistory(null)).toEqual([]);
    expect(parseAttemptHistory({ attempts: [] })).toEqual([]);
    expect(
      parseAttemptHistory([
        guidedAttempt,
        attempt({ attemptId: "attempt-0000-0002", hypothesis: "prose" }),
        "garbage",
        attempt({ attemptId: "attempt-0000-0003", rootCauseScore: 400 }),
      ]),
    ).toEqual([guidedAttempt]);
  });

  it("replaces duplicate idempotency identifiers deterministically", () => {
    const older = attempt({ completedAt: 100, testRuns: 1 });
    const newer = attempt({ completedAt: 200, testRuns: 9 });
    expect(parseAttemptHistory([newer, older])).toEqual([newer]);
    expect(parseAttemptHistory([older, newer])).toEqual([newer]);

    const localTie = attempt({ completedAt: 100, provenance: "local_import" });
    const serverTie = attempt({ completedAt: 100, provenance: "server_verified" });
    expect(parseAttemptHistory([localTie, serverTie])).toEqual([serverTie]);
    expect(parseAttemptHistory([serverTie, localTie])).toEqual([serverTie]);
  });

  it("sorts out-of-order records and retains only the 50 most recent", () => {
    const many = Array.from({ length: 55 }, (_, index) =>
      attempt({ attemptId: `attempt-${String(index).padStart(4, "0")}`, completedAt: 5_500 - index }),
    );
    const parsed = parseAttemptHistory(many);
    expect(parsed).toHaveLength(50);
    expect(parsed.map((item) => item.completedAt)).toEqual(
      [...parsed.map((item) => item.completedAt)].sort((a, b) => a - b),
    );
    expect(parsed[0].completedAt).toBe(5_451);
    expect(parsed.at(-1)?.completedAt).toBe(5_500);
  });
});

describe("deriveAttemptSummary", () => {
  const response: AssessmentResponse = {
    assessment: {
      completionStatus: "verified",
      rootCauseScore: 92,
      reasoningScore: 88,
      patchDisciplineScore: 96,
      conceptUnderstandingScore: 90,
      strengths: ["Clear boundary reasoning grounded in the failing test."],
      improvementAreas: ["Compare neighboring cases before editing."],
      evidenceSummary: "The exact-threshold approval was restored with a minimal inclusive comparison.",
      nextPracticeRecommendation: "Practice fallback behavior next.",
    },
    testResult: {
      status: "passed",
      passedCount: 6,
      failedCount: 0,
      durationMs: 47,
      sanitizedOutput: "6 passed in 0.05s",
      matchedExpectedFailure: false,
      executionMode: "prevalidated_fixture",
    },
    assessmentSource: "deterministic_fallback",
    hintsUsed: 1,
    testRuns: 4,
    changedLines: 1,
    changedFiles: ["approvals.py"],
    elapsedSeconds: 400,
    hypothesisRevisions: 2,
  };

  it("copies only bounded verified evidence and approved identifiers", () => {
    const summary = deriveAttemptSummary({
      attemptId: "attempt-derived-1",
      lessonId: "evidence-boundaries",
      projectId: "expense-approval",
      skill: "Boundary conditions",
      difficulty: "beginner",
      challengeSource: "prevalidated",
      completedAt: 12_345,
      response,
    });

    expect(summary).toMatchObject({
      attemptId: "attempt-derived-1",
      lessonId: "evidence-boundaries",
      status: "verified",
      rootCauseScore: 92,
      hintsUsed: 1,
      testRuns: 4,
      changedLines: 1,
      durationBucket: "5_to_15_minutes",
      provenance: "server_verified",
    });

    const serialized = JSON.stringify(summary);
    for (const forbidden of [
      "approvals.py",
      "sanitizedOutput",
      "6 passed",
      "evidenceSummary",
      "strengths",
      "hypothesis",
      "explanation",
      "nextPracticeRecommendation",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("returns null for combinations outside the approved registry", () => {
    expect(
      deriveAttemptSummary({
        attemptId: "attempt-derived-2",
        lessonId: "evidence-boundaries",
        projectId: "inventory",
        skill: "Boundary conditions",
        difficulty: "beginner",
        challengeSource: "prevalidated",
        completedAt: 12_345,
        response,
      }),
    ).toBeNull();
    expect(
      deriveAttemptSummary({
        attemptId: "attempt-derived-3",
        lessonId: null,
        projectId: "expense-approval",
        skill: "Not a real skill",
        difficulty: "beginner",
        challengeSource: "prevalidated",
        completedAt: 12_345,
        response,
      }),
    ).toBeNull();
  });
});
