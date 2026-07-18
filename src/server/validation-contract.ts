import "server-only";

import { z } from "zod";

export const validationInterpretationSchema = z
  .object({
    originalPassed: z.boolean(),
    mutationFailed: z.boolean(),
    matchedExpectedFailure: z.boolean(),
    releaseRecommended: z.boolean(),
    validationFeedback: z.string().min(1).max(240),
  })
  .strict();

export type ValidationInterpretation = z.infer<typeof validationInterpretationSchema>;
