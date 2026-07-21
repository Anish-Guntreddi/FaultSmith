import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { HypothesisRequest } from "@/lib/contracts";
import { buildCoachContext } from "./hypothesis-context";
import { challengeFixtures } from "./fixtures";

const FORBIDDEN_KEYS = ["hiddenRootCause", "hiddenReferenceSolution", "mutationPatch", "hints"];

function requestFor(fixture: (typeof challengeFixtures)[number]): HypothesisRequest {
  return {
    challengeId: fixture.challengeId,
    hypothesis: "The comparison excludes the boundary value.",
    hypothesisHistory: ["An earlier, vaguer guess."],
  };
}

describe("buildCoachContext", () => {
  it.each(challengeFixtures.map((fixture) => [fixture.challengeId, fixture] as const))(
    "%s: never carries a forbidden field",
    (_challengeId, fixture) => {
      const context = buildCoachContext(fixture, requestFor(fixture));

      for (const key of FORBIDDEN_KEYS) {
        expect(context).not.toHaveProperty(key);
      }
      expect(Object.keys(context).sort()).toEqual(
        [
          "expectedFailureSignature",
          "hypothesis",
          "hypothesisHistory",
          "mutatedSource",
          "testsSource",
        ].sort(),
      );

      const serialized = JSON.stringify(context);
      expect(serialized).not.toContain(fixture.hiddenRootCause);
      expect(serialized).not.toContain(fixture.hiddenReferenceSolution);
      expect(serialized).not.toContain(fixture.mutationPatch);
      for (const hint of fixture.hints) {
        expect(serialized).not.toContain(hint);
      }
    },
  );

  it("carries the observed mutated source, tests, and failure signature", () => {
    const fixture = challengeFixtures[0];
    const context = buildCoachContext(fixture, requestFor(fixture));

    expect(context.mutatedSource).toContain(fixture.brokenSnippet);
    expect(context.testsSource).toContain(fixture.expectedFailureTests[0]);
    expect(context.expectedFailureSignature).toBe(fixture.expectedFailureSignature);
  });

  it("passes the hypothesis and hypothesis history through unchanged", () => {
    const fixture = challengeFixtures[0];
    const request = requestFor(fixture);
    const context = buildCoachContext(fixture, request);

    expect(context.hypothesis).toBe(request.hypothesis);
    expect(context.hypothesisHistory).toEqual(request.hypothesisHistory);
  });
});
