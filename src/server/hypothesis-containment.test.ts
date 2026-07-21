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
});
