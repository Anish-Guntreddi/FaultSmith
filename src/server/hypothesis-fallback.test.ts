import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { hypothesisResponseSchema } from "@/lib/contracts";
import {
  buildDeterministicFallbackResponse,
  evaluateHypothesisStructurally,
} from "./hypothesis-fallback";
import type { CoachContext } from "./hypothesis-context";

const mutatedSource = [
  "def approval_route(expense):",
  "    if expense.amount > 500:",
  "        return 'finance_review'",
  "    return 'manager_approval'",
].join("\n");

function contextWith(overrides: Partial<CoachContext>): CoachContext {
  return {
    mutatedSource,
    testsSource: "def test_exact_threshold_requires_finance(): ...",
    expectedFailureSignature: "manager_approval != finance_review at amount=500",
    hypothesis: "",
    hypothesisHistory: [],
    ...overrides,
  };
}

describe("evaluateHypothesisStructurally", () => {
  describe("grounding", () => {
    it("marks a hypothesis grounded when it names an identifier present in the mutated source", () => {
      const context = contextWith({
        hypothesis: "The bug is in approval_route where it checks expense.amount.",
      });
      expect(evaluateHypothesisStructurally(context).grounded).toBe(true);
    });

    it("marks a hypothesis ungrounded when it names nothing found in the mutated source", () => {
      const context = contextWith({
        hypothesis: "I think the database connection pool retries too aggressively.",
      });
      expect(evaluateHypothesisStructurally(context).grounded).toBe(false);
    });

    it("marks an empty hypothesis ungrounded rather than fabricating grounding", () => {
      const context = contextWith({ hypothesis: "   " });
      expect(evaluateHypothesisStructurally(context).grounded).toBe(false);
    });
  });

  describe("specificity", () => {
    it("marks a hypothesis specific when it names a comparison, condition, or branch", () => {
      const context = contextWith({
        hypothesis: "The comparison uses > instead of an inclusive boundary check.",
      });
      expect(evaluateHypothesisStructurally(context).specific).toBe(true);
    });

    it("marks a hypothesis specific when it names a branch keyword", () => {
      const context = contextWith({
        hypothesis: "The if branch does not handle the boundary case correctly.",
      });
      expect(evaluateHypothesisStructurally(context).specific).toBe(true);
    });

    it("marks a vague hypothesis not specific", () => {
      const context = contextWith({
        hypothesis: "Something is wrong with the approval function.",
      });
      expect(evaluateHypothesisStructurally(context).specific).toBe(false);
    });
  });

  describe("falsifiability", () => {
    it("marks a hypothesis falsifiable when it predicts testable behavior", () => {
      const context = contextWith({
        hypothesis: "It should return finance_review when the amount is exactly 500.",
      });
      expect(evaluateHypothesisStructurally(context).falsifiable).toBe(true);
    });

    it("marks a hypothesis falsifiable when it names a concrete value", () => {
      const context = contextWith({ hypothesis: "At amount 500 the route diverges." });
      expect(evaluateHypothesisStructurally(context).falsifiable).toBe(true);
    });

    it("marks an unfalsifiable hypothesis as such when it makes no testable prediction", () => {
      const context = contextWith({
        hypothesis: "There's a bug somewhere in the approval logic.",
      });
      expect(evaluateHypothesisStructurally(context).falsifiable).toBe(false);
    });
  });

  describe("movement", () => {
    it("reports first for an empty history", () => {
      const context = contextWith({
        hypothesis: "The boundary check excludes 500.",
        hypothesisHistory: [],
      });
      expect(evaluateHypothesisStructurally(context).movement).toBe("first");
    });

    it("reports first when history only repeats the current hypothesis", () => {
      const context = contextWith({
        hypothesis: "The boundary check excludes 500.",
        hypothesisHistory: ["The boundary check excludes 500."],
      });
      expect(evaluateHypothesisStructurally(context).movement).toBe("first");
    });

    it("reports narrowed when the revision keeps the prior idea and adds specific detail", () => {
      const context = contextWith({
        hypothesis: "The condition uses the wrong comparison operator at the boundary.",
        hypothesisHistory: ["The condition is wrong."],
      });
      expect(evaluateHypothesisStructurally(context).movement).toBe("narrowed");
    });

    it("reports restated when the revision swaps wording without adding grounded specifics", () => {
      const context = contextWith({
        hypothesis: "The check is incorrect.",
        hypothesisHistory: ["The condition is wrong."],
      });
      expect(evaluateHypothesisStructurally(context).movement).toBe("restated");
    });
  });
});

describe("buildDeterministicFallbackResponse", () => {
  it("returns a schema-valid response labeled as the deterministic fallback", () => {
    const context = contextWith({
      hypothesis: "The comparison in approval_route uses > instead of >=, so 500 is excluded.",
      hypothesisHistory: [],
    });
    const response = buildDeterministicFallbackResponse(context);

    expect(response.source).toBe("deterministic_fallback");
    expect(() => hypothesisResponseSchema.parse(response)).not.toThrow();
  });

  it("never claims an axis is aligned or off — only partial or unstated", () => {
    const grounded = buildDeterministicFallbackResponse(
      contextWith({
        hypothesis: "The comparison in approval_route uses > instead of >=, at amount 500.",
      }),
    );
    const ungrounded = buildDeterministicFallbackResponse(
      contextWith({ hypothesis: "The network layer drops packets under load." }),
    );

    for (const response of [grounded, ungrounded]) {
      for (const status of Object.values(response.axes)) {
        expect(["partial", "unstated"]).toContain(status);
      }
    }
  });

  it("marks every axis unstated and names locus as weakest for a fully ungrounded, vague, unfalsifiable hypothesis", () => {
    const response = buildDeterministicFallbackResponse(
      contextWith({ hypothesis: "Not sure, maybe something is off." }),
    );

    expect(response.axes).toEqual({ locus: "unstated", mechanism: "unstated", trigger: "unstated" });
    expect(response.weakestAxis).toBe("locus");
  });

  it("picks mechanism as weakest, ahead of trigger, when only locus is grounded", () => {
    const response = buildDeterministicFallbackResponse(
      contextWith({ hypothesis: "It has something to do with the approval_route function." }),
    );

    expect(response.axes).toEqual({ locus: "partial", mechanism: "unstated", trigger: "unstated" });
    expect(response.weakestAxis).toBe("mechanism");
  });

  it("reports weakestAxis none when grounding, specificity, and falsifiability are all present", () => {
    const response = buildDeterministicFallbackResponse(
      contextWith({
        hypothesis:
          "The comparison in approval_route should return finance_review when amount equals 500, but it currently uses > instead of >=.",
      }),
    );

    expect(response.axes).toEqual({ locus: "partial", mechanism: "partial", trigger: "partial" });
    expect(response.weakestAxis).toBe("none");
  });

  it("passes assertNoLeak-equivalent constraints: no code fences or diff markers in free text", () => {
    const response = buildDeterministicFallbackResponse(
      contextWith({ hypothesis: "The comparison excludes the boundary value." }),
    );

    expect(response.observation).not.toContain("```");
    expect(response.question).not.toContain("```");
    expect(/^[+-]/m.test(response.observation)).toBe(false);
    expect(/^[+-]/m.test(response.question)).toBe(false);
  });

  it("stays within the response schema's length bounds even with a long failure signature", () => {
    const context = contextWith({
      hypothesis: "Not sure yet.",
      expectedFailureSignature: "x".repeat(500),
    });
    const response = buildDeterministicFallbackResponse(context);

    expect(response.observation.length).toBeLessThanOrEqual(400);
    expect(response.question.length).toBeLessThanOrEqual(200);
    expect(() => hypothesisResponseSchema.parse(response)).not.toThrow();
  });
});
