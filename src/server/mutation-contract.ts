import "server-only";

import { z } from "zod";

import { difficultySchema, fileSnapshotSchema, projectIdSchema } from "@/lib/contracts";

export const mutationPlanSchema = z
  .object({
    challengeId: z.string().min(1).max(100),
    projectId: projectIdSchema,
    title: z.string().min(1).max(120),
    targetSkill: z.string().min(1).max(80),
    difficulty: difficultySchema,
    learningObjective: z.string().min(1).max(300),
    learnerBrief: z.string().min(1).max(600),
    allowedFiles: z.array(fileSnapshotSchema.shape.path).min(1).max(4),
    mutationPatch: z.string().min(1).max(4_000),
    expectedFailureTests: z.array(z.string().min(1).max(160)).min(1).max(12),
    expectedFailureSignature: z.string().min(1).max(500),
    hiddenRootCause: z.string().min(1).max(600),
    hiddenReferenceSolution: z.string().min(1).max(4_000),
    hints: z.tuple([
      z.string().min(1).max(360),
      z.string().min(1).max(360),
      z.string().min(1).max(360),
    ]),
    rubric: z
      .object({
        rootCauseCriteria: z.array(z.string().min(1).max(240)).min(1).max(6),
        conceptCriteria: z.array(z.string().min(1).max(240)).min(1).max(6),
        patchDisciplineCriteria: z.array(z.string().min(1).max(240)).min(1).max(6),
      })
      .strict(),
  })
  .strict();

export type MutationPlan = z.infer<typeof mutationPlanSchema>;
