import { z } from "zod";

import {
  parseLearningProgress,
  recordLearningCompletion,
  type LearningProgress,
} from "./learning-paths";
import {
  attemptOverallScore,
  attemptSummarySchema,
  emptyLearnerProfile,
  parseAttemptHistory,
  PROGRESS_PROFILE_VERSION,
  type AttemptSummary,
  type LearnerProfile,
} from "./progress-contracts";

/**
 * Tolerant container check for a v2 profile. Entries are validated
 * individually afterwards so a single tampered record never destroys the rest
 * of the profile, matching the established v1 parsing behavior.
 */
const profileContainerSchema = z
  .object({
    version: z.literal(PROGRESS_PROFILE_VERSION),
    completions: z.array(z.unknown()).max(50),
    attempts: z.array(z.unknown()).max(200),
  })
  .strict();

/**
 * Migrate existing v1 learning progress into a v2 profile deterministically.
 * The per-lesson completion records carry over verbatim; no attempt history is
 * fabricated for lessons completed before attempt summaries existed.
 */
export function migrateLearningProgressV1(value: unknown): LearnerProfile {
  return {
    version: PROGRESS_PROFILE_VERSION,
    completions: parseLearningProgress(value).completions,
    attempts: [],
  };
}

/**
 * Assemble a profile from the two untrusted local stores: the v1 roadmap
 * progress value and the attempt-summary history value.
 */
export function buildLearnerProfile(progressValue: unknown, attemptHistoryValue: unknown): LearnerProfile {
  return {
    version: PROGRESS_PROFILE_VERSION,
    completions: parseLearningProgress(progressValue).completions,
    attempts: parseAttemptHistory(attemptHistoryValue),
  };
}

/**
 * Parse an untrusted profile value. Accepts a v2 profile, migrates a v1
 * progress container, and returns the empty profile for anything else —
 * including v2 containers with unknown keys, which are treated as tampered.
 */
export function parseLearnerProfile(value: unknown): LearnerProfile {
  const container = profileContainerSchema.safeParse(value);
  if (container.success) {
    return buildLearnerProfile(
      { version: 1, completions: container.data.completions },
      container.data.attempts,
    );
  }
  const migrated = migrateLearningProgressV1(value);
  if (migrated.completions.length > 0) return migrated;
  return emptyLearnerProfile;
}

/**
 * Append an attempt to a history with idempotency-identifier replacement and
 * bounded retention: a record with an existing attemptId replaces the old one,
 * and only the most recent {@link MAX_STORED_ATTEMPTS} attempts are kept.
 */
export function recordAttemptSummary(history: unknown, attempt: unknown): AttemptSummary[] {
  const existing = parseAttemptHistory(history);
  const parsed = attemptSummarySchema.safeParse(attempt);
  if (!parsed.success) return existing;
  const replaced = existing.filter((item) => item.attemptId !== parsed.data.attemptId);
  return parseAttemptHistory([...replaced, parsed.data]);
}

/**
 * Record an attempt on a profile. The attempt history always captures the
 * bounded summary; the monotonic per-lesson completion record advances only
 * for verified guided attempts, so a failing run can never claim roadmap
 * progress.
 */
export function recordProfileAttempt(profile: LearnerProfile, attempt: unknown): LearnerProfile {
  const parsed = attemptSummarySchema.safeParse(attempt);
  const base = parseLearnerProfile(profile);
  if (!parsed.success) return base;

  const attempts = recordAttemptSummary(base.attempts, parsed.data);
  let completions = base.completions;
  if (parsed.data.status === "verified" && parsed.data.lessonId !== null) {
    completions = recordLearningCompletion(
      { version: 1, completions },
      {
        stepId: parsed.data.lessonId,
        completedAt: parsed.data.completedAt,
        overallScore: attemptOverallScore(parsed.data),
        hintsUsed: parsed.data.hintsUsed,
        testRuns: parsed.data.testRuns,
      },
    ).completions;
  }
  return { version: PROGRESS_PROFILE_VERSION, completions, attempts };
}

/**
 * Merge two untrusted profiles deterministically and symmetrically.
 * Per-lesson completion records merge monotonically — a lesson completed in
 * either profile stays completed, and the latest record per lesson wins.
 * Attempts union by idempotency identifier with the newest record preferred,
 * capped at the most recent {@link MAX_STORED_ATTEMPTS}.
 */
export function mergeLearnerProfiles(localValue: unknown, remoteValue: unknown): LearnerProfile {
  const local = parseLearnerProfile(localValue);
  const remote = parseLearnerProfile(remoteValue);

  const mergedProgress: LearningProgress = parseLearningProgress({
    version: 1,
    completions: [...local.completions, ...remote.completions],
  });

  return {
    version: PROGRESS_PROFILE_VERSION,
    completions: mergedProgress.completions,
    attempts: parseAttemptHistory([...local.attempts, ...remote.attempts]),
  };
}
