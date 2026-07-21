import "server-only";

import { z } from "zod";

import { hypothesisResponseSchema } from "@/lib/contracts";

/**
 * The subset of `hypothesisResponseSchema` the model is asked to produce.
 * `source` is deliberately excluded: only the workflow (never the model)
 * decides whether a response counts as `"gpt-5.6"`, after it has survived
 * `assertNoLeak` (design spec section 3.4). Every other field — including
 * the code-fence and diff-marker bans on `observation`/`question` — is
 * inherited unchanged, so a candidate that satisfies this schema already
 * satisfies the learner-facing text constraints of the full response.
 */
export const modelHypothesisCoachSchema = hypothesisResponseSchema.omit({ source: true });
export type ModelHypothesisCoachResponse = z.infer<typeof modelHypothesisCoachSchema>;
