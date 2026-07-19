import {
  getLearningRecommendation,
  getLearningStep,
  learningPhases,
  learningSteps,
  type LearningStep,
} from "./learning-paths";
import {
  attemptOverallScore,
  type ApprovedSkill,
  type AttemptSummary,
  type LearnerProfile,
} from "./progress-contracts";

export type PhaseProgress = {
  phaseId: LearningStep["phaseId"];
  order: number;
  title: string;
  completedLessons: number;
  totalLessons: number;
  complete: boolean;
};

/** Roadmap completion per curriculum phase, derived from the same lesson registry the roadmap uses. */
export function getPhaseProgress(profile: LearnerProfile): PhaseProgress[] {
  const completed = new Set(profile.completions.map((completion) => completion.stepId));
  return learningPhases.map((phase) => {
    const completedLessons = phase.steps.filter((step) => completed.has(step.id)).length;
    return {
      phaseId: phase.id,
      order: phase.order,
      title: phase.title,
      completedLessons,
      totalLessons: phase.steps.length,
      complete: completedLessons === phase.steps.length,
    };
  });
}

export function getCompletedLessonCount(profile: LearnerProfile) {
  return profile.completions.length;
}

export const TOTAL_LESSON_COUNT = learningSteps.length;

/** Only attempts the server verified count as certified score evidence. */
export function getVerifiedAttempts(profile: LearnerProfile): AttemptSummary[] {
  return profile.attempts.filter(
    (attempt) => attempt.status === "verified" && attempt.provenance === "server_verified",
  );
}

export type VerifiedScoreAverages = {
  rootCause: number;
  reasoning: number;
  patchDiscipline: number;
  conceptUnderstanding: number;
  overall: number;
  sampleSize: number;
};

/**
 * Average verified score dimensions. Returns null when no verified attempt
 * evidence exists so the UI can show an honest empty state instead of a zero.
 */
export function getVerifiedScoreAverages(profile: LearnerProfile): VerifiedScoreAverages | null {
  const verified = getVerifiedAttempts(profile);
  if (verified.length === 0) return null;
  const average = (select: (attempt: AttemptSummary) => number) =>
    Math.round(verified.reduce((sum, attempt) => sum + select(attempt), 0) / verified.length);
  return {
    rootCause: average((attempt) => attempt.rootCauseScore),
    reasoning: average((attempt) => attempt.reasoningScore),
    patchDiscipline: average((attempt) => attempt.patchDisciplineScore),
    conceptUnderstanding: average((attempt) => attempt.conceptUnderstandingScore),
    overall: average(attemptOverallScore),
    sampleSize: verified.length,
  };
}

export type IndependentSolveEvidence = {
  independentSolves: number;
  verifiedAttempts: number;
  rate: number;
};

/** Share of verified repairs completed without any hints. Null without verified evidence. */
export function getIndependentSolveRate(profile: LearnerProfile): IndependentSolveEvidence | null {
  const verified = getVerifiedAttempts(profile);
  if (verified.length === 0) return null;
  const independentSolves = verified.filter((attempt) => attempt.hintsUsed === 0).length;
  return {
    independentSolves,
    verifiedAttempts: verified.length,
    rate: Math.round((independentSolves / verified.length) * 100),
  };
}

export type TestRunEvidence = {
  attemptsWithEvidence: number;
  totalTestRuns: number;
  averageTestRuns: number;
};

/**
 * Test-run counts are descriptive process evidence only. They never appear in
 * any score computation and iterating on tests is never treated as a penalty.
 */
export function getTestRunEvidence(profile: LearnerProfile): TestRunEvidence | null {
  if (profile.attempts.length === 0) return null;
  const totalTestRuns = profile.attempts.reduce((sum, attempt) => sum + attempt.testRuns, 0);
  return {
    attemptsWithEvidence: profile.attempts.length,
    totalTestRuns,
    averageTestRuns: Math.round((totalTestRuns / profile.attempts.length) * 10) / 10,
  };
}

export type SkillEvidence = {
  skill: ApprovedSkill;
  averageScore: number;
  attemptCount: number;
};

function skillRegistryOrder(skill: string) {
  const index = learningSteps.findIndex((step) => step.targetSkill === skill);
  return index === -1 ? learningSteps.length : index;
}

/**
 * The skill with the strongest verified evidence: highest average overall
 * score, ties broken by more attempts, then by lesson-registry order.
 */
export function getStrongestPracticedSkill(profile: LearnerProfile): SkillEvidence | null {
  const verified = getVerifiedAttempts(profile);
  if (verified.length === 0) return null;

  const bySkill = new Map<ApprovedSkill, AttemptSummary[]>();
  for (const attempt of verified) {
    bySkill.set(attempt.skill, [...(bySkill.get(attempt.skill) ?? []), attempt]);
  }

  let strongest: SkillEvidence | null = null;
  for (const [skill, attempts] of bySkill) {
    const averageScore = Math.round(
      attempts.reduce((sum, attempt) => sum + attemptOverallScore(attempt), 0) / attempts.length,
    );
    const candidate: SkillEvidence = { skill, averageScore, attemptCount: attempts.length };
    if (
      !strongest
      || candidate.averageScore > strongest.averageScore
      || (candidate.averageScore === strongest.averageScore
        && candidate.attemptCount > strongest.attemptCount)
      || (candidate.averageScore === strongest.averageScore
        && candidate.attemptCount === strongest.attemptCount
        && skillRegistryOrder(candidate.skill) < skillRegistryOrder(strongest.skill))
    ) {
      strongest = candidate;
    }
  }
  return strongest;
}

export type ReinforcementPriority = {
  lessonId: LearningStep["id"];
  title: string;
  skill: string;
  reason: string;
};

/**
 * The completed lesson most worth revisiting: lowest recorded score, ties
 * broken by heavier hint use, then by lesson order. Null when every completed
 * lesson shows strong, low-hint evidence.
 */
export function getReinforcementPriority(profile: LearnerProfile): ReinforcementPriority | null {
  const candidates = profile.completions.filter(
    (completion) => completion.overallScore < 80 || completion.hintsUsed > 1,
  );
  if (candidates.length === 0) return null;

  const weakest = [...candidates].sort((left, right) => {
    if (left.overallScore !== right.overallScore) return left.overallScore - right.overallScore;
    if (left.hintsUsed !== right.hintsUsed) return right.hintsUsed - left.hintsUsed;
    return (getLearningStep(left.stepId)?.order ?? 99) - (getLearningStep(right.stepId)?.order ?? 99);
  })[0];

  const step = getLearningStep(weakest.stepId);
  if (!step) return null;
  return {
    lessonId: step.id,
    title: step.title,
    skill: step.targetSkill,
    reason:
      weakest.overallScore < 80
        ? `Verified at ${weakest.overallScore}/100 — revisit this lesson to strengthen the evidence.`
        : `Verified with ${weakest.hintsUsed} hints — practice it again with less support.`,
  };
}

/** Most recent attempts first, capped for display. */
export function getRecentAttempts(profile: LearnerProfile, limit = 5): AttemptSummary[] {
  return [...profile.attempts]
    .sort((left, right) => {
      if (left.completedAt !== right.completedAt) return right.completedAt - left.completedAt;
      return left.attemptId < right.attemptId ? 1 : left.attemptId > right.attemptId ? -1 : 0;
    })
    .slice(0, limit);
}

/**
 * The existing next-lesson/reinforce/catalog recommendation, driven by the
 * same monotonic completion record the roadmap uses.
 */
export function getProfileRecommendation(profile: LearnerProfile) {
  return getLearningRecommendation({ version: 1, completions: profile.completions });
}
