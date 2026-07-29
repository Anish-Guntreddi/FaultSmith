import { describe, expect, it } from "vitest";

import { learningSteps } from "./learning-paths";
import { emptyLearnerProfile, type AttemptSummary, type LearnerProfile } from "./progress-contracts";
import {
  getIndependentSolveRate,
  getPhaseProgress,
  getProfileRecommendation,
  getRecentAttempts,
  getReinforcementPriority,
  getStrongestPracticedSkill,
  getTestRunEvidence,
  getVerifiedAttempts,
  getVerifiedScoreAverages,
  TOTAL_LESSON_COUNT,
} from "./progress-metrics";

const baseAttempt: AttemptSummary = {
  attemptId: "attempt-0000-0001",
  lessonId: "evidence-boundaries",
  projectId: "expense-approval",
  skill: "Boundary conditions",
  difficulty: "beginner",
  challengeSource: "prevalidated",
  status: "verified",
  rootCauseScore: 90,
  reasoningScore: 80,
  patchDisciplineScore: 90,
  conceptUnderstandingScore: 80,
  hintsUsed: 0,
  testRuns: 3,
  changedLines: 2,
  durationBucket: "under_5_minutes",
  completedAt: 1_000,
  provenance: "server_verified",
};

function attempt(overrides: Partial<AttemptSummary> = {}): AttemptSummary {
  return { ...baseAttempt, ...overrides };
}

function profile(overrides: Partial<LearnerProfile> = {}): LearnerProfile {
  return { ...emptyLearnerProfile, ...overrides };
}

describe("empty state", () => {
  it("reports honest nulls instead of zero scores", () => {
    expect(TOTAL_LESSON_COUNT).toBe(9);
    expect(getVerifiedScoreAverages(emptyLearnerProfile)).toBeNull();
    expect(getIndependentSolveRate(emptyLearnerProfile)).toBeNull();
    expect(getTestRunEvidence(emptyLearnerProfile)).toBeNull();
    expect(getStrongestPracticedSkill(emptyLearnerProfile)).toBeNull();
    expect(getReinforcementPriority(emptyLearnerProfile)).toBeNull();
    expect(getRecentAttempts(emptyLearnerProfile)).toEqual([]);
    expect(getPhaseProgress(emptyLearnerProfile)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ order: 1, completedLessons: 0, totalLessons: 3, complete: false }),
      ]),
    );
    expect(getProfileRecommendation(emptyLearnerProfile)).toMatchObject({
      kind: "next",
      step: { id: "evidence-boundaries" },
    });
  });
});

describe("unverified-only state", () => {
  const failing = profile({
    attempts: [
      attempt({ status: "not_verified", rootCauseScore: 30, testRuns: 12 }),
      attempt({ attemptId: "attempt-0000-0002", status: "not_verified", completedAt: 2_000 }),
    ],
  });

  it("shows process evidence but never certified score averages", () => {
    expect(getVerifiedAttempts(failing)).toEqual([]);
    expect(getVerifiedScoreAverages(failing)).toBeNull();
    expect(getIndependentSolveRate(failing)).toBeNull();
    expect(getStrongestPracticedSkill(failing)).toBeNull();
    expect(getTestRunEvidence(failing)).toEqual({
      attemptsWithEvidence: 2,
      totalTestRuns: 15,
      averageTestRuns: 7.5,
    });
    expect(getRecentAttempts(failing)).toHaveLength(2);
  });

  it("excludes locally imported records from verified evidence", () => {
    const imported = profile({ attempts: [attempt({ provenance: "local_import" })] });
    expect(getVerifiedAttempts(imported)).toEqual([]);
    expect(getVerifiedScoreAverages(imported)).toBeNull();
  });
});

describe("verified score averages and independent solves", () => {
  const verified = profile({
    attempts: [
      attempt({ rootCauseScore: 90, reasoningScore: 80, patchDisciplineScore: 90, conceptUnderstandingScore: 80, hintsUsed: 0 }),
      attempt({
        attemptId: "attempt-0000-0002",
        completedAt: 2_000,
        rootCauseScore: 70,
        reasoningScore: 60,
        patchDisciplineScore: 70,
        conceptUnderstandingScore: 60,
        hintsUsed: 2,
      }),
      attempt({ attemptId: "attempt-0000-0003", completedAt: 3_000, status: "not_verified", rootCauseScore: 10 }),
    ],
  });

  it("averages only verified attempts", () => {
    expect(getVerifiedScoreAverages(verified)).toEqual({
      rootCause: 80,
      reasoning: 70,
      patchDiscipline: 80,
      conceptUnderstanding: 70,
      overall: 75,
      sampleSize: 2,
    });
  });

  it("computes the independent solve rate from hint-free verified repairs", () => {
    expect(getIndependentSolveRate(verified)).toEqual({
      independentSolves: 1,
      verifiedAttempts: 2,
      rate: 50,
    });
  });
});

describe("test count is descriptive, never a penalty", () => {
  const lowRuns = profile({ attempts: [attempt({ testRuns: 2 })] });
  const highRuns = profile({ attempts: [attempt({ testRuns: 95 })] });

  it("never changes any score-derived metric when only test runs differ", () => {
    expect(getVerifiedScoreAverages(highRuns)).toEqual(getVerifiedScoreAverages(lowRuns));
    expect(getIndependentSolveRate(highRuns)).toEqual(getIndependentSolveRate(lowRuns));
    expect(getStrongestPracticedSkill(highRuns)).toEqual(getStrongestPracticedSkill(lowRuns));
  });

  it("reports test runs as descriptive process evidence", () => {
    expect(getTestRunEvidence(highRuns)).toEqual({
      attemptsWithEvidence: 1,
      totalTestRuns: 95,
      averageTestRuns: 95,
    });
  });
});

describe("strongest practiced skill", () => {
  it("picks the highest verified average with deterministic tie-breaks", () => {
    const mixed = profile({
      attempts: [
        attempt({ rootCauseScore: 60, reasoningScore: 60, patchDisciplineScore: 60, conceptUnderstandingScore: 60 }),
        attempt({
          attemptId: "attempt-0000-0002",
          completedAt: 2_000,
          lessonId: "evidence-booleans",
          projectId: "notifications",
          skill: "Boolean logic",
          rootCauseScore: 95,
          reasoningScore: 95,
          patchDisciplineScore: 95,
          conceptUnderstandingScore: 95,
        }),
      ],
    });
    expect(getStrongestPracticedSkill(mixed)).toEqual({
      skill: "Boolean logic",
      averageScore: 95,
      attemptCount: 1,
    });

    const tied = profile({
      attempts: [
        attempt(),
        attempt({
          attemptId: "attempt-0000-0002",
          completedAt: 2_000,
          lessonId: "evidence-booleans",
          projectId: "notifications",
          skill: "Boolean logic",
        }),
      ],
    });
    expect(getStrongestPracticedSkill(tied)?.skill).toBe("Boundary conditions");
  });
});

describe("reinforcement priority", () => {
  it("targets the weakest completed lesson and stays quiet when evidence is strong", () => {
    const strong = profile({
      completions: [
        { stepId: "evidence-boundaries", completedAt: 10, overallScore: 92, hintsUsed: 0, testRuns: 4 },
      ],
    });
    expect(getReinforcementPriority(strong)).toBeNull();

    const weak = profile({
      completions: [
        { stepId: "evidence-boundaries", completedAt: 10, overallScore: 72, hintsUsed: 1, testRuns: 4 },
        { stepId: "evidence-booleans", completedAt: 20, overallScore: 65, hintsUsed: 2, testRuns: 4 },
        { stepId: "evidence-validation", completedAt: 30, overallScore: 95, hintsUsed: 3, testRuns: 4 },
      ],
    });
    expect(getReinforcementPriority(weak)).toMatchObject({
      lessonId: "evidence-booleans",
      skill: "Boolean logic",
    });
    expect(getReinforcementPriority(weak)?.reason).toContain("65/100");
  });
});

describe("phase progress and recommendation", () => {
  const firstPhaseSteps = learningSteps.filter((step) => step.phaseId === "read-evidence");

  it("marks a phase complete only when all of its lessons are verified", () => {
    const partial = profile({
      completions: firstPhaseSteps.slice(0, 2).map((step, index) => ({
        stepId: step.id,
        completedAt: index + 1,
        overallScore: 90,
        hintsUsed: 0,
        testRuns: 1,
      })),
    });
    expect(getPhaseProgress(partial)[0]).toMatchObject({ completedLessons: 2, complete: false });

    const full = profile({
      completions: firstPhaseSteps.map((step, index) => ({
        stepId: step.id,
        completedAt: index + 1,
        overallScore: 90,
        hintsUsed: 0,
        testRuns: 1,
      })),
    });
    expect(getPhaseProgress(full)[0]).toMatchObject({ completedLessons: 3, complete: true });
    expect(getProfileRecommendation(full)).toMatchObject({ kind: "next", step: { id: "behavior-rules" } });
  });

  it("recommends the catalog once the roadmap is complete", () => {
    const done = profile({
      completions: learningSteps.map((step, index) => ({
        stepId: step.id,
        completedAt: index + 1,
        overallScore: 95,
        hintsUsed: 0,
        testRuns: 1,
      })),
    });
    expect(getProfileRecommendation(done)).toMatchObject({ kind: "catalog", step: null });
  });

  it("orders recent attempts newest first", () => {
    const history = profile({
      attempts: [
        attempt({ completedAt: 1_000 }),
        attempt({ attemptId: "attempt-0000-0002", completedAt: 3_000 }),
        attempt({ attemptId: "attempt-0000-0003", completedAt: 2_000 }),
      ],
    });
    expect(getRecentAttempts(history, 2).map((item) => item.completedAt)).toEqual([3_000, 2_000]);
  });
});
