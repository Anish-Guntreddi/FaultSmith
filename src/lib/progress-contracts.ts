import { z } from "zod";

import { projects } from "./catalog";
import {
  difficultySchema,
  projectIdSchema,
  type AssessmentResponse,
  type Difficulty,
  type ProjectId,
} from "./contracts";
import {
  getLearningStep,
  learningCompletionSchema,
  learningStepIdSchema,
  learningSteps,
  type LearningCompletion,
  type LearningStepId,
} from "./learning-paths";

export const PROGRESS_PROFILE_VERSION = 2 as const;
export const MAX_STORED_ATTEMPTS = 50;

/**
 * Completion timestamps are bounded to the year 2100 so tampered local state
 * cannot smuggle absurd values into merges or metrics.
 */
export const MAX_COMPLETION_TIMESTAMP = 4_102_444_800_000;

/** Attempt histories longer than this are treated as tampered input; only the first entries are inspected. */
const MAX_RAW_HISTORY_ENTRIES = 200;

/**
 * The only skills a stored attempt may claim. This list mirrors the lesson
 * registry and the curated project catalog; anything else is rejected.
 */
export const approvedSkills = [
  "Boundary conditions",
  "Boolean logic",
  "Defensive validation",
  "Business-rule interpretation",
  "Fallback behavior",
  "Idempotency",
  "Authorization logic",
  "State transitions",
  "Data validation",
] as const;

export const approvedSkillSchema = z.enum(approvedSkills);
export type ApprovedSkill = z.infer<typeof approvedSkillSchema>;

export const attemptDurationBuckets = [
  "under_5_minutes",
  "5_to_15_minutes",
  "15_to_30_minutes",
  "over_30_minutes",
] as const;
export const attemptDurationBucketSchema = z.enum(attemptDurationBuckets);
export type AttemptDurationBucket = z.infer<typeof attemptDurationBucketSchema>;

export function toDurationBucket(elapsedSeconds: number): AttemptDurationBucket {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 300) return "under_5_minutes";
  if (elapsedSeconds < 900) return "5_to_15_minutes";
  if (elapsedSeconds < 1_800) return "15_to_30_minutes";
  return "over_30_minutes";
}

export const durationBucketLabels: Record<AttemptDurationBucket, string> = {
  under_5_minutes: "Under 5 min",
  "5_to_15_minutes": "5–15 min",
  "15_to_30_minutes": "15–30 min",
  over_30_minutes: "Over 30 min",
};

/** Lowercase idempotency identifier; long enough to avoid collisions, short enough to stay bounded. */
export const attemptIdSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]{7,63}$/, "Attempt identifiers must be bounded lowercase identifiers.");

const scoreSchema = z.number().int().min(0).max(100);

/**
 * The strict, privacy-minimal attempt summary. It carries no source code,
 * hypothesis, explanation, hint text, test output, provider data, identity
 * token, or credential field — only approved identifiers and bounded numbers.
 */
export const attemptSummarySchema = z
  .object({
    attemptId: attemptIdSchema,
    lessonId: learningStepIdSchema.nullable(),
    projectId: projectIdSchema,
    skill: approvedSkillSchema,
    difficulty: difficultySchema,
    challengeSource: z.enum(["generated", "prevalidated"]),
    status: z.enum(["verified", "not_verified"]),
    rootCauseScore: scoreSchema,
    reasoningScore: scoreSchema,
    patchDisciplineScore: scoreSchema,
    conceptUnderstandingScore: scoreSchema,
    hintsUsed: z.number().int().min(0).max(3),
    testRuns: z.number().int().min(0).max(100),
    changedLines: z.number().int().min(0).max(10_000),
    durationBucket: attemptDurationBucketSchema,
    completedAt: z.number().int().min(0).max(MAX_COMPLETION_TIMESTAMP),
    provenance: z.enum(["server_verified", "local_import"]),
  })
  .strict()
  .superRefine((attempt, ctx) => {
    if (attempt.lessonId !== null) {
      const step = getLearningStep(attempt.lessonId);
      if (
        !step
        || step.projectId !== attempt.projectId
        || step.targetSkill !== attempt.skill
        || step.difficulty !== attempt.difficulty
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Guided attempts must match the lesson registry combination exactly.",
        });
      }
      return;
    }
    const project = projects.find((candidate) => candidate.id === attempt.projectId);
    if (!project || !project.skills.includes(attempt.skill)) {
      ctx.addIssue({
        code: "custom",
        message: "Catalog attempts must use a skill approved for the selected project.",
      });
    }
  });
export type AttemptSummary = z.infer<typeof attemptSummarySchema>;

/** Mean of the four verified score dimensions, rounded — never adjusted by test count. */
export function attemptOverallScore(attempt: AttemptSummary) {
  return Math.round(
    (attempt.rootCauseScore
      + attempt.reasoningScore
      + attempt.patchDisciplineScore
      + attempt.conceptUnderstandingScore) / 4,
  );
}

function preferAttempt(next: AttemptSummary, current: AttemptSummary) {
  if (next.completedAt !== current.completedAt) return next.completedAt > current.completedAt;
  if (next.provenance !== current.provenance) return next.provenance === "server_verified";
  return false;
}

function compareAttempts(left: AttemptSummary, right: AttemptSummary) {
  if (left.completedAt !== right.completedAt) return left.completedAt - right.completedAt;
  return left.attemptId < right.attemptId ? -1 : left.attemptId > right.attemptId ? 1 : 0;
}

/**
 * Parse an untrusted attempt-history value. Invalid, tampered, duplicate, and
 * out-of-order records are dropped or normalized deterministically; the result
 * is capped at the most recent {@link MAX_STORED_ATTEMPTS} attempts, ascending
 * by completion time.
 */
export function parseAttemptHistory(value: unknown): AttemptSummary[] {
  if (!Array.isArray(value)) return [];
  const byId = new Map<string, AttemptSummary>();
  for (const candidate of value.slice(0, MAX_RAW_HISTORY_ENTRIES)) {
    const parsed = attemptSummarySchema.safeParse(candidate);
    if (!parsed.success) continue;
    const current = byId.get(parsed.data.attemptId);
    if (!current || preferAttempt(parsed.data, current)) {
      byId.set(parsed.data.attemptId, parsed.data);
    }
  }
  return [...byId.values()].sort(compareAttempts).slice(-MAX_STORED_ATTEMPTS);
}

export type DeriveAttemptInput = {
  attemptId: string;
  lessonId: LearningStepId | null;
  projectId: ProjectId;
  skill: string;
  difficulty: Difficulty;
  challengeSource: "generated" | "prevalidated";
  completedAt: number;
  response: AssessmentResponse;
};

/**
 * Derive the bounded summary from a server assessment response. Only verified
 * numeric evidence and approved identifiers are copied; every prose field in
 * the response is intentionally left behind. Returns null when the combination
 * is not an approved lesson/project/skill pairing.
 */
export function deriveAttemptSummary(input: DeriveAttemptInput): AttemptSummary | null {
  const candidate = {
    attemptId: input.attemptId,
    lessonId: input.lessonId,
    projectId: input.projectId,
    skill: input.skill,
    difficulty: input.difficulty,
    challengeSource: input.challengeSource,
    status: input.response.assessment.completionStatus,
    rootCauseScore: input.response.assessment.rootCauseScore,
    reasoningScore: input.response.assessment.reasoningScore,
    patchDisciplineScore: input.response.assessment.patchDisciplineScore,
    conceptUnderstandingScore: input.response.assessment.conceptUnderstandingScore,
    hintsUsed: input.response.hintsUsed,
    testRuns: input.response.testRuns,
    changedLines: input.response.changedLines,
    durationBucket: toDurationBucket(input.response.elapsedSeconds),
    completedAt: input.completedAt,
    provenance: "server_verified",
  };
  const parsed = attemptSummarySchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

/**
 * The versioned local/cloud learning profile. `completions` is the monotonic
 * per-lesson roadmap record (backwards compatible with v1 progress) and
 * `attempts` is the capped bounded attempt history.
 */
export const learnerProfileSchema = z
  .object({
    version: z.literal(PROGRESS_PROFILE_VERSION),
    completions: z.array(learningCompletionSchema).max(learningSteps.length),
    attempts: z.array(attemptSummarySchema).max(MAX_STORED_ATTEMPTS),
  })
  .strict();
export type LearnerProfile = {
  version: typeof PROGRESS_PROFILE_VERSION;
  completions: LearningCompletion[];
  attempts: AttemptSummary[];
};

export const emptyLearnerProfile: LearnerProfile = {
  version: PROGRESS_PROFILE_VERSION,
  completions: [],
  attempts: [],
};
