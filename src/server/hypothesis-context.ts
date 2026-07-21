import "server-only";

import type { HypothesisRequest } from "@/lib/contracts";
import type { ChallengeFixture } from "./fixtures";

/**
 * Answer-blind projection handed to the hypothesis coach model (design spec
 * section 3.3). Its shape is the containment boundary: because this is a
 * literal object type with exactly these five keys, an object literal
 * returned as `CoachContext` cannot carry `hiddenRootCause`,
 * `hiddenReferenceSolution`, `mutationPatch`, or `hints` — the TypeScript
 * excess-property check on `buildCoachContext`'s return statement rejects
 * any such field at compile time. Containment itself is still enforced by
 * `assertNoLeak` on the model's output (spec 3.4); this projection only
 * shrinks the surface the model reasons over.
 */
export interface CoachContext {
  mutatedSource: string;
  testsSource: string;
  expectedFailureSignature: string;
  hypothesis: string;
  hypothesisHistory: string[];
}

/**
 * Builds the answer-blind context for the hypothesis coach. Only observed
 * evidence (the mutated source the learner can already see, the test file,
 * and the failure signature) plus the learner's own hypothesis text is
 * included. Nothing from the fixture's hidden answer key is read.
 */
export function buildCoachContext(
  fixture: ChallengeFixture,
  request: HypothesisRequest,
): CoachContext {
  const mutatedSource = fixture.visibleFiles
    .filter((file) => file.editable)
    .map((file) => file.content)
    .join("\n\n");
  const testsSource = fixture.visibleFiles
    .filter((file) => file.path.startsWith("tests/"))
    .map((file) => file.content)
    .join("\n\n");

  return {
    mutatedSource,
    testsSource,
    expectedFailureSignature: fixture.expectedFailureSignature,
    hypothesis: request.hypothesis,
    hypothesisHistory: request.hypothesisHistory,
  };
}
