import { describe, expect, it } from "vitest";

import { projects } from "./catalog";
import {
  emptyLearningProgress,
  getLearningRecommendation,
  isLearningStepUnlocked,
  learningCompletionSchema,
  learningPhases,
  learningSteps,
  parseLearningProgress,
  recordLearningCompletion,
} from "./learning-paths";

describe("guided learning registry", () => {
  it("maps three phases and all nine unique project-skill combinations", () => {
    expect(learningPhases).toHaveLength(3);
    expect(learningSteps).toHaveLength(9);
    expect(new Set(learningSteps.map((step) => step.id))).toHaveLength(9);
    expect(new Set(learningSteps.map((step) => `${step.projectId}:${step.targetSkill}`))).toHaveLength(9);
    expect(learningSteps.map((step) => step.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);

    for (const step of learningSteps) {
      const project = projects.find((candidate) => candidate.id === step.projectId);
      expect(project?.skills).toContain(step.targetSkill);
      expect(step.investigationChecklist).toHaveLength(3);
      expect(step.conceptGuide.length).toBeGreaterThan(60);
    }
  });

  it("discards unknown, malformed, duplicate, and learner-text-shaped progress", () => {
    const parsed = parseLearningProgress({
      version: 1,
      completions: [
        { stepId: "unknown-step", completedAt: 1, overallScore: 100, hintsUsed: 0, testRuns: 1 },
        { stepId: "evidence-boundaries", completedAt: 2, overallScore: 72, hintsUsed: 2, testRuns: 3 },
        { stepId: "evidence-boundaries", completedAt: 3, overallScore: 88, hintsUsed: 1, testRuns: 2 },
        { stepId: "evidence-booleans", completedAt: 4, overallScore: 101, hintsUsed: 0, testRuns: 1 },
        { stepId: "evidence-validation", completedAt: 5, overallScore: 90, hintsUsed: 0, testRuns: 1, hypothesis: "private learner prose" },
      ],
    });

    expect(parsed.completions).toEqual([
      { stepId: "evidence-boundaries", completedAt: 3, overallScore: 88, hintsUsed: 1, testRuns: 2 },
    ]);
    expect(JSON.stringify(parsed)).not.toContain("hypothesis");
  });

  it("exposes a strict completion schema for reuse by cloud-ready progress contracts", () => {
    const valid = { stepId: "evidence-boundaries", completedAt: 5, overallScore: 90, hintsUsed: 0, testRuns: 1 };
    expect(learningCompletionSchema.safeParse(valid).success).toBe(true);
    expect(learningCompletionSchema.safeParse({ ...valid, hypothesis: "prose" }).success).toBe(false);
    expect(learningCompletionSchema.safeParse({ ...valid, overallScore: 101 }).success).toBe(false);
  });

  it("unlocks sequentially and recommends reinforcement or the next lesson", () => {
    expect(isLearningStepUnlocked(emptyLearningProgress, "evidence-boundaries")).toBe(true);
    expect(isLearningStepUnlocked(emptyLearningProgress, "evidence-booleans")).toBe(false);
    expect(getLearningRecommendation(emptyLearningProgress).step?.id).toBe("evidence-boundaries");

    const weakCompletion = recordLearningCompletion(emptyLearningProgress, {
      stepId: "evidence-boundaries",
      completedAt: 10,
      overallScore: 79,
      hintsUsed: 2,
      testRuns: 3,
    });
    expect(isLearningStepUnlocked(weakCompletion, "evidence-booleans")).toBe(true);
    expect(getLearningRecommendation(weakCompletion)).toMatchObject({
      kind: "reinforce",
      step: { id: "evidence-boundaries" },
    });

    const strongCompletion = recordLearningCompletion(weakCompletion, {
      stepId: "evidence-boundaries",
      completedAt: 11,
      overallScore: 90,
      hintsUsed: 1,
      testRuns: 2,
    });
    expect(strongCompletion.completions).toHaveLength(1);
    expect(getLearningRecommendation(strongCompletion)).toMatchObject({
      kind: "next",
      step: { id: "evidence-booleans" },
    });
  });
});
