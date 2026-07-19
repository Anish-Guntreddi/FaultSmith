import { z } from "zod";

export const difficultySchema = z.enum(["beginner", "intermediate", "advanced"]);
export type Difficulty = z.infer<typeof difficultySchema>;

export const projectIdSchema = z.enum([
  "expense-approval",
  "inventory",
  "notifications",
]);
export type ProjectId = z.infer<typeof projectIdSchema>;

export const fileSnapshotSchema = z
  .object({
    path: z
      .string()
      .min(1)
      .max(120)
      .regex(/^[a-zA-Z0-9_./-]+$/)
      .refine((path) => !path.startsWith("/") && !path.includes(".."), {
        message: "File paths must be project-relative and cannot traverse directories.",
      }),
    content: z.string().max(20_000),
  })
  .strict();
export type FileSnapshot = z.infer<typeof fileSnapshotSchema>;

export const testResultSchema = z
  .object({
    status: z.enum(["passed", "failed", "timeout", "error"]),
    passedCount: z.number().int().min(0).max(200),
    failedCount: z.number().int().min(0).max(200),
    durationMs: z.number().int().min(0).max(120_000),
    sanitizedOutput: z.string().max(8_000),
    matchedExpectedFailure: z.boolean(),
    executionMode: z.enum(["code_interpreter", "prevalidated_fixture"]),
  })
  .strict();
export type TestResult = z.infer<typeof testResultSchema>;

export const executionResponseSchema = z
  .object({
    testResult: testResultSchema,
    fallbackUsed: z.boolean(),
    recoveryNotice: z.string().max(300).optional(),
    recoveredFrom: z.enum(["timeout", "error", "missing_key"]).optional(),
  })
  .strict();
export type ExecutionResponse = z.infer<typeof executionResponseSchema>;

export const assessmentResultSchema = z
  .object({
    completionStatus: z.enum(["verified", "not_verified"]),
    rootCauseScore: z.number().int().min(0).max(100),
    reasoningScore: z.number().int().min(0).max(100),
    patchDisciplineScore: z.number().int().min(0).max(100),
    conceptUnderstandingScore: z.number().int().min(0).max(100),
    strengths: z.array(z.string().min(1).max(220)).max(4),
    improvementAreas: z.array(z.string().min(1).max(220)).max(4),
    evidenceSummary: z.string().min(1).max(600),
    nextPracticeRecommendation: z.string().min(1).max(360),
  })
  .strict();
export type AssessmentResult = z.infer<typeof assessmentResultSchema>;

export const assessmentResponseSchema = z
  .object({
    assessment: assessmentResultSchema,
    testResult: testResultSchema,
    assessmentSource: z.enum(["gpt-5.6", "deterministic_fallback"]),
    hintsUsed: z.number().int().min(0).max(3),
    testRuns: z.number().int().min(0).max(100),
    changedLines: z.number().int().min(0).max(10_000),
    changedFiles: z.array(fileSnapshotSchema.shape.path).max(4),
    elapsedSeconds: z.number().int().min(0).max(86_400),
    hypothesisRevisions: z.number().int().min(1).max(30),
  })
  .strict();
export type AssessmentResponse = z.infer<typeof assessmentResponseSchema>;

export const publicChallengeSchema = z
  .object({
    challengeId: z.string().min(1).max(100),
    projectId: projectIdSchema,
    title: z.string().min(1).max(120),
    targetSkill: z.string().min(1).max(80),
    difficulty: difficultySchema,
    learningObjective: z.string().min(1).max(300),
    learnerBrief: z.string().min(1).max(600),
    files: z
      .array(
        fileSnapshotSchema.extend({
          editable: z.boolean(),
        }),
      )
      .min(1)
      .max(8),
    allowedFiles: z.array(fileSnapshotSchema.shape.path).min(1).max(4),
    expectedFailureTests: z.array(z.string().min(1).max(160)).min(1).max(12),
    initialTestResult: testResultSchema,
    availableHintCount: z.literal(3),
    source: z.enum(["generated", "prevalidated"]),
    fallbackReason: z.string().max(240).optional(),
  })
  .strict();
export type PublicChallenge = z.infer<typeof publicChallengeSchema>;

export const generateChallengeRequestSchema = z
  .object({
    projectId: projectIdSchema,
    targetSkill: z.string().min(1).max(80),
    difficulty: difficultySchema,
    preferLive: z.boolean().default(true),
  })
  .strict();
export type GenerateChallengeRequest = z.infer<typeof generateChallengeRequestSchema>;

export const executeRequestSchema = z
  .object({
    challengeId: z.string().min(1).max(100),
    files: z.array(fileSnapshotSchema).min(1).max(8),
    executionMode: z.enum(["code_interpreter", "prevalidated_fixture"]),
  })
  .strict();
export type ExecuteRequest = z.infer<typeof executeRequestSchema>;

export const hintRequestSchema = z
  .object({
    challengeId: z.string().min(1).max(100),
    hintIndex: z.number().int().min(0).max(2),
    hypothesis: z.string().trim().min(12).max(2_000),
    preferLive: z.boolean(),
  })
  .strict();
export type HintRequest = z.infer<typeof hintRequestSchema>;

export const hintResponseSchema = z
  .object({
    hintIndex: z.number().int().min(0).max(2),
    hint: z.string().min(1).max(360),
    source: z.enum(["gpt-5.6", "prevalidated"]),
    recoveryNotice: z.string().min(1).max(300).optional(),
  })
  .strict();
export type HintResponse = z.infer<typeof hintResponseSchema>;

export const assessRequestSchema = executeRequestSchema
  .extend({
    hypothesis: z.string().trim().min(12).max(2_000),
    hypothesisHistory: z
      .array(z.string().trim().min(12).max(2_000))
      .min(1)
      .max(30),
    explanation: z.string().trim().min(24).max(4_000),
    hintsUsed: z.number().int().min(0).max(3),
    testRuns: z.number().int().min(0).max(100),
    elapsedSeconds: z.number().int().min(0).max(86_400),
  })
  .strict()
  .refine(
    (request) => request.hypothesisHistory.at(-1) === request.hypothesis,
    {
      message: "The latest hypothesis revision must match the submitted hypothesis.",
      path: ["hypothesisHistory"],
    },
  );
export type AssessRequest = z.infer<typeof assessRequestSchema>;

/**
 * Bounded, descriptive cloud synchronization outcome attached to assessment
 * responses. It is informational only: it can never change completion or
 * test authority, which remain owned by the deterministic assessment.
 */
export const cloudSyncStatusSchema = z.enum([
  "cloud_saved",
  "local_only",
  "unauthorized",
  "cloud_unavailable",
]);
export type CloudSyncStatus = z.infer<typeof cloudSyncStatusSchema>;

export const safeErrorSchema = z
  .object({
    error: z.string().min(1).max(240),
    code: z.string().min(1).max(80),
    retryable: z.boolean(),
  })
  .strict();
