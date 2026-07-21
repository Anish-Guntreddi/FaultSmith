import "server-only";

import type { ChallengeFixture } from "./fixtures";

/**
 * Which containment rule rejected a candidate string. Callers may log or
 * count this id; the matched content itself is never part of the result,
 * so a leak that gets caught can never be re-surfaced through logging or
 * health output (design spec section 3.4: "Rejections increment a counter
 * exposed only as an aggregate boolean in health output — never the
 * content.").
 */
export type ContainmentRuleId =
  | "code_fence"
  | "diff_marker"
  | "mutation_patch_fixed"
  | "mutation_patch_broken"
  | "reference_solution_line"
  | "root_cause_span";

export interface ContainmentResult {
  passed: boolean;
  rule: ContainmentRuleId | null;
}

const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "to", "of", "in", "on", "and", "or", "but", "this", "that", "these",
  "those", "it", "its", "by", "for", "with", "as", "at", "if", "else",
  "then", "not", "no", "none", "true", "false", "from", "import",
]);

const ROOT_CAUSE_SPAN_LENGTH = 6;
const REFERENCE_LINE_MIN_NON_TRIVIAL_TOKENS = 3;

/** Case-fold, strip punctuation (replacing it with a space so adjacent
 * words never fuse), and collapse whitespace. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  const normalized = normalize(text);
  return normalized.length ? normalized.split(" ") : [];
}

function nonTrivialTokenCount(tokens: string[]): number {
  return tokens.filter((token) => token.length > 1 && !STOPWORDS.has(token)).length;
}

function hasCodeFence(text: string): boolean {
  return text.includes("```");
}

/** Matches a line that begins with `+` or `-`, the unified-diff hunk markers. */
function hasDiffMarker(text: string): boolean {
  return /^[+-]/m.test(text);
}

function containsMutationSide(candidateNormalized: string, snippet: string): boolean {
  const normalizedSnippet = normalize(snippet);
  return normalizedSnippet.length > 0 && candidateNormalized.includes(normalizedSnippet);
}

function containsReferenceSolutionLine(
  candidateNormalized: string,
  hiddenReferenceSolution: string,
): boolean {
  for (const line of hiddenReferenceSolution.split("\n")) {
    const tokens = tokenize(line);
    if (nonTrivialTokenCount(tokens) < REFERENCE_LINE_MIN_NON_TRIVIAL_TOKENS) continue;
    const normalizedLine = tokens.join(" ");
    if (normalizedLine.length && candidateNormalized.includes(normalizedLine)) return true;
  }
  return false;
}

function containsRootCauseSpan(candidateNormalized: string, hiddenRootCause: string): boolean {
  const tokens = tokenize(hiddenRootCause);
  if (tokens.length < ROOT_CAUSE_SPAN_LENGTH) return false;
  for (let start = 0; start + ROOT_CAUSE_SPAN_LENGTH <= tokens.length; start += 1) {
    const span = tokens.slice(start, start + ROOT_CAUSE_SPAN_LENGTH).join(" ");
    if (candidateNormalized.includes(span)) return true;
  }
  return false;
}

/**
 * Output-filter containment (design spec section 3.4). The fixture's hidden
 * answer is used only as a denylist here — never as prompt input. Rejects a
 * candidate learner-facing string when, normalized, it contains:
 *
 *  - either side of the mutation patch (`fixedSnippet`, `brokenSnippet`);
 *  - any line of `hiddenReferenceSolution` with >= 3 non-trivial tokens;
 *  - a >= 6-token contiguous span of `hiddenRootCause`;
 *
 * or when the raw candidate contains a code fence or a unified-diff marker.
 */
export function assertNoLeak(candidate: string, fixture: ChallengeFixture): ContainmentResult {
  if (hasCodeFence(candidate)) return { passed: false, rule: "code_fence" };
  if (hasDiffMarker(candidate)) return { passed: false, rule: "diff_marker" };

  const candidateNormalized = normalize(candidate);

  if (containsMutationSide(candidateNormalized, fixture.fixedSnippet)) {
    return { passed: false, rule: "mutation_patch_fixed" };
  }
  if (containsMutationSide(candidateNormalized, fixture.brokenSnippet)) {
    return { passed: false, rule: "mutation_patch_broken" };
  }
  if (containsReferenceSolutionLine(candidateNormalized, fixture.hiddenReferenceSolution)) {
    return { passed: false, rule: "reference_solution_line" };
  }
  if (containsRootCauseSpan(candidateNormalized, fixture.hiddenRootCause)) {
    return { passed: false, rule: "root_cause_span" };
  }

  return { passed: true, rule: null };
}
