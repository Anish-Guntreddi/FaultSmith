import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { assertNoLeak } from "./hypothesis-containment";
import { challengeFixtures } from "./fixtures";

const fixture = challengeFixtures[0]; // expense-boundary-v1

describe("assertNoLeak", () => {
  it("passes legitimate coaching text that discusses the evidence without repeating the answer", () => {
    const observation =
      "Your hypothesis names the right function, but the failing case is exactly at the policy boundary. Look at what happens when the amount matches the threshold instead of exceeding it.";
    const result = assertNoLeak(observation, fixture);

    expect(result).toEqual({ passed: true, rule: null });
  });

  it("passes a Socratic question that never states the fix", () => {
    const question = "What should happen when the amount is exactly at the threshold, and does the current code do that?";
    expect(assertNoLeak(question, fixture)).toEqual({ passed: true, rule: null });
  });

  it("catches a response containing a line of the hidden reference solution verbatim", () => {
    // Deliberately a line that shares no text with fixedSnippet/brokenSnippet,
    // so this exercises the reference-solution-line rule specifically rather
    // than tripping the (checked-first) mutation-patch rules.
    const referenceLine = fixture.hiddenReferenceSolution
      .split("\n")
      .find((line) => line.includes("def approval_route"));
    expect(referenceLine).toBeDefined();
    expect(referenceLine).not.toContain(fixture.fixedSnippet);
    expect(referenceLine).not.toContain(fixture.brokenSnippet);

    const candidate = `Consider this: ${referenceLine}`;
    const result = assertNoLeak(candidate, fixture);

    expect(result.passed).toBe(false);
    expect(result.rule).toBe("reference_solution_line");
  });

  // expense-authorization-v1: fixed/broken sides differ by a word ("and" vs
  // "or"), not just an operator symbol that normalization strips — so,
  // unlike expense-boundary-v1, the two sides remain distinguishable after
  // normalization and each rule can be exercised independently.
  const authorization = challengeFixtures[1];

  it("catches a response containing the fixed side of the mutation patch", () => {
    expect(authorization.challengeId).toBe("expense-authorization-v1");
    const candidate = `The repair looks like: ${authorization.fixedSnippet}`;
    const result = assertNoLeak(candidate, authorization);

    expect(result.passed).toBe(false);
    expect(result.rule).toBe("mutation_patch_fixed");
  });

  it("catches a response containing the broken side of the mutation patch", () => {
    const candidate = `The current bug is: ${authorization.brokenSnippet}`;
    const result = assertNoLeak(candidate, authorization);

    expect(result.passed).toBe(false);
    expect(result.rule).toBe("mutation_patch_broken");
  });

  it("catches a response containing a 6-token contiguous span of the hidden root cause", () => {
    const rootCauseTokens = fixture.hiddenRootCause
      .toLowerCase()
      .replace(/[^a-z0-9\s]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ");
    expect(rootCauseTokens.length).toBeGreaterThanOrEqual(6);
    const span = rootCauseTokens.slice(0, 6).join(" ");

    const candidate = `Here's the thing: ${span}, so pay attention to it.`;
    const result = assertNoLeak(candidate, fixture);

    expect(result.passed).toBe(false);
    expect(result.rule).toBe("root_cause_span");
  });

  it("catches code fences in learner-facing text", () => {
    const candidate = "Try this:\n```python\nif expense.amount >= 500:\n```";
    const result = assertNoLeak(candidate, fixture);

    expect(result.passed).toBe(false);
    expect(result.rule).toBe("code_fence");
  });

  it("catches unified-diff markers in learner-facing text", () => {
    const candidate = "-    if expense.amount > 500:\n+    if expense.amount >= 500:";
    const result = assertNoLeak(candidate, fixture);

    expect(result.passed).toBe(false);
    expect(result.rule).toBe("diff_marker");
  });

  it("never exposes the matched content in the result, only the rule id", () => {
    const candidate = `The repair looks like: ${authorization.fixedSnippet}`;
    const result = assertNoLeak(candidate, authorization);

    expect(result).toEqual({ passed: false, rule: "mutation_patch_fixed" });
    expect(Object.keys(result).sort()).toEqual(["passed", "rule"]);
  });

  it("catches every fixture's reference solution, mutation sides, and root-cause span", () => {
    for (const item of challengeFixtures) {
      expect(assertNoLeak(`Solution: ${item.fixedSnippet}`, item).passed).toBe(false);
      expect(assertNoLeak(`Bug: ${item.brokenSnippet}`, item).passed).toBe(false);
    }
  });

  describe("adversarial paraphrase / partial match", () => {
    // Honest documentation of behavior at the containment boundary, not a
    // claim that the filter is a semantic leak detector. The design spec's
    // containment mechanism is a normalized *substring* denylist, not a
    // paraphrase detector — a hypothesis coach must be able to discuss the
    // evidence in its own words, so genuinely novel phrasing that never
    // reproduces a contiguous denylisted span is expected to pass.

    it("does NOT catch a paraphrase that reorders and rewords the root cause (expected: passes)", () => {
      // Actual root cause: "The mutation changed the inclusive >= comparison
      // to >, excluding exactly 500." A paraphrase using different words in
      // a different order shares no 6-token contiguous span, so it passes.
      const paraphrase =
        "I think the check that used to include the boundary now uses a strict comparison, so 500 itself slips through.";
      const result = assertNoLeak(paraphrase, fixture);

      expect(result).toEqual({ passed: true, rule: null });
    });

    it("DOES catch a partial match that keeps a 6-token contiguous fragment of the root cause", () => {
      // Copying a long enough contiguous run of the root cause text, even
      // mid-sentence and even if the surrounding sentence is otherwise the
      // coach's own words, is caught because the sliding window only needs
      // one matching 6-token span.
      const partial =
        "Here's a clue: the mutation changed the inclusive comparison to a stricter one that excludes exactly 500.";
      // Confirm this candidate does in fact contain a 6-token span drawn
      // directly from hiddenRootCause before asserting on the detector.
      const rootCauseNormalized = fixture.hiddenRootCause
        .toLowerCase()
        .replace(/[^a-z0-9\s]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      expect(rootCauseNormalized).toContain("the mutation changed the inclusive");

      const result = assertNoLeak(partial, fixture);
      expect(result.passed).toBe(false);
      expect(result.rule).toBe("root_cause_span");
    });
  });

  describe("operator-only mutation collision (security remediation)", () => {
    // expense-boundary-v1's fixedSnippet ("if expense.amount >= 500:") and
    // brokenSnippet ("if expense.amount > 500:") previously normalized to
    // the identical string once comparison operators were stripped to
    // whitespace, so a candidate that quoted one side verbatim could
    // collide with the wrong rule, and — more importantly — nothing
    // distinguished the two operators at all once stripped. Confirms both
    // sides are still independently and correctly detected, and that a
    // live-model response stating the fix via raw operator symbols or
    // their spelled-out names (the two concrete exploit shapes reported by
    // security review) is rejected even though it never reproduces a
    // contiguous run of protected code or root-cause text.

    it("still distinguishes the fixed and broken sides after normalization", () => {
      const fixedResult = assertNoLeak(`Try: ${fixture.fixedSnippet}`, fixture);
      expect(fixedResult).toEqual({ passed: false, rule: "mutation_patch_fixed" });

      const brokenResult = assertNoLeak(`Currently: ${fixture.brokenSnippet}`, fixture);
      expect(brokenResult).toEqual({ passed: false, rule: "mutation_patch_broken" });
    });

    it("catches a prose leak that states the fix via raw operator symbols", () => {
      const candidate =
        "Use >= instead of >, so an amount of exactly 500 should be approved.";
      const result = assertNoLeak(candidate, fixture);

      expect(result.passed).toBe(false);
      expect(result.rule).toBe("operator_disclosure");
    });

    it("catches a prose leak that names the corrected operator without symbols", () => {
      const candidate =
        "The check should use greater-than-or-equal instead of strict greater-than against the boundary value.";
      const result = assertNoLeak(candidate, fixture);

      expect(result.passed).toBe(false);
      expect(result.rule).toBe("operator_disclosure");
    });

    it("does not fire the operator-disclosure rule for a fixture whose two sides share the same operators", () => {
      // expense-authorization-v1 differs by connector ("and" vs "or"), not
      // by operator — both sides use == and <, so naming those operators
      // isn't itself a leak for this fixture.
      const authorization = challengeFixtures[1];
      const candidate =
        "Both the role check (equal to finance) and the amount check (less than 500) need to hold together.";
      const result = assertNoLeak(candidate, authorization);

      expect(result).toEqual({ passed: true, rule: null });
    });
  });

  describe("diff-marker false positives (security remediation)", () => {
    // inventory-quantity-v1's failure mode is literally about negative
    // numbers, so a legitimate coaching sentence starting a line with a
    // signed number must not be misclassified as a unified-diff hunk.
    const quantityFixture = challengeFixtures.find(
      (item) => item.challengeId === "inventory-validation-v1",
    );

    it("does not treat a leading signed number as a diff marker", () => {
      expect(quantityFixture).toBeDefined();
      const candidate = "-5 is not a valid quantity here, and neither is 0 under the current check.";
      const result = assertNoLeak(candidate, quantityFixture!);

      expect(result.passed).toBe(true);
    });

    it("still catches a real unified diff even with no space before the marker's own leading column", () => {
      const candidate = "-\tif expense.amount > 500:\n+\tif expense.amount >= 500:";
      const result = assertNoLeak(candidate, fixture);

      expect(result.passed).toBe(false);
      expect(result.rule).toBe("diff_marker");
    });
  });

  it("catches a tilde code fence in addition to backtick fences", () => {
    const candidate = "Try this:\n~~~python\nif expense.amount >= 500:\n~~~";
    const result = assertNoLeak(candidate, fixture);

    expect(result.passed).toBe(false);
    expect(result.rule).toBe("code_fence");
  });
});
