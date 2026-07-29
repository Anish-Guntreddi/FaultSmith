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
  | "root_cause_span"
  | "operator_disclosure";

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
 * words never fuse), and collapse whitespace.
 *
 * This is the prose normalizer: it deliberately treats comparison operator
 * characters as ordinary punctuation (stripped to whitespace), because it
 * is only ever compared against other prose (the candidate itself,
 * `hiddenRootCause`, and lines of `hiddenReferenceSolution`) where the
 * literal operator symbol is not the signal — the surrounding words are.
 * `normalizeCode` below is the operator-aware counterpart used for the
 * mutation-patch check, where the operator symbol *is* the signal. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Operator-aware normalizer used only for the mutation-patch containment
 * check (`containsMutationSide`). `fixedSnippet` and `brokenSnippet` in
 * every boundary/comparison fixture in this codebase differ by exactly one
 * comparison operator (e.g. `>=` vs `>`); the prose `normalize` above
 * strips both to the same run of whitespace, so
 * `normalize(fixedSnippet) === normalize(brokenSnippet)` for those
 * fixtures and the two mutation-patch rules silently degenerate into a
 * single, weaker check. Mapping each operator to a distinct placeholder
 * token before stripping the remaining punctuation keeps the two sides
 * distinguishable, so a candidate that reproduces one side's exact wording
 * (including its operator) is still caught, and reproducing the *other*
 * side's wording no longer produces a false match against this one.
 */
function normalizeCode(text: string): string {
  let working = text;
  // Longest operators first so `>=`/`<=` are consumed before the bare
  // `>`/`<` rules would otherwise match their trailing character.
  working = working.replace(/>=/g, " opgte ");
  working = working.replace(/<=/g, " oplte ");
  working = working.replace(/==/g, " opeq ");
  working = working.replace(/!=/g, " opneq ");
  working = working.replace(/>/g, " opgt ");
  working = working.replace(/</g, " oplt ");
  return normalize(working);
}

function tokenize(text: string): string[] {
  const normalized = normalize(text);
  return normalized.length ? normalized.split(" ") : [];
}

function nonTrivialTokenCount(tokens: string[]): number {
  return tokens.filter((token) => token.length > 1 && !STOPWORDS.has(token)).length;
}

function hasCodeFence(text: string): boolean {
  return text.includes("```") || text.includes("~~~");
}

/** Matches a line that begins with `+` or `-` followed by whitespace, the
 * unified-diff hunk marker shape. Requiring the following whitespace keeps
 * ordinary prose that happens to start a line with a signed number (e.g.
 * "-5 is not a valid quantity here", directly relevant to fixtures about
 * negative numbers) from tripping this rule while still catching real diff
 * output, which always separates the marker from the code by a space. */
function hasDiffMarker(text: string): boolean {
  return /^[+-][ \t]/m.test(text);
}

function containsMutationSide(
  candidateCodeNormalized: string,
  snippet: string,
): boolean {
  const normalizedSnippet = normalizeCode(snippet);
  return normalizedSnippet.length > 0 && candidateCodeNormalized.includes(normalizedSnippet);
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

type OperatorToken = "opgte" | "opgt" | "oplte" | "oplt" | "opeq" | "opneq";

const OPERATOR_TOKEN_MAP: Record<string, OperatorToken> = {
  ">=": "opgte",
  "<=": "oplte",
  "==": "opeq",
  "!=": "opneq",
  ">": "opgt",
  "<": "oplt",
};

/** Longest alternatives first so `>=`/`<=`/`==`/`!=` are matched whole
 * rather than as their bare `>`/`</=` prefix. */
const RAW_OPERATOR_PATTERN = /(>=|<=|==|!=|>|<)/g;

function extractOperatorTokens(codeText: string): Set<OperatorToken> {
  const tokens = new Set<OperatorToken>();
  for (const match of codeText.matchAll(RAW_OPERATOR_PATTERN)) {
    tokens.add(OPERATOR_TOKEN_MAP[match[0]]);
  }
  return tokens;
}

function sameTokenSet(a: Set<OperatorToken>, b: Set<OperatorToken>): boolean {
  if (a.size !== b.size) return false;
  for (const token of a) {
    if (!b.has(token)) return false;
  }
  return true;
}

/**
 * Which operator tokens are "protected" for this fixture: present in
 * `fixedSnippet` or `brokenSnippet` *and* different between the two sides.
 * When the two sides use the exact same operators (e.g. the
 * expense-authorization fixture, which differs only by `and`/`or`), the
 * operator itself isn't the secret and this returns an empty set so the
 * disclosure rule never fires for that fixture.
 */
function protectedOperatorTokens(fixture: ChallengeFixture): Set<OperatorToken> {
  const fixedOps = extractOperatorTokens(fixture.fixedSnippet);
  const brokenOps = extractOperatorTokens(fixture.brokenSnippet);
  if (fixedOps.size === 0 && brokenOps.size === 0) return new Set();
  if (sameTokenSet(fixedOps, brokenOps)) return new Set();
  return new Set([...fixedOps, ...brokenOps]);
}

/**
 * Detection patterns for each operator token: the raw symbol (excluding
 * matches inside `->`/`=>`/`>=`/`<=` so it doesn't false-positive on
 * unrelated arrow syntax already caught by other rules) plus the small set
 * of unambiguous spelled-out synonyms a coach would use to name the
 * operator in prose without ever typing the symbol. Deliberately excludes
 * very common phrases like "at least" / "at most" that would otherwise
 * over-block ordinary coaching language unrelated to the fix.
 */
// Word separators are matched as `[\s-]+` (not just whitespace) so both
// "greater than or equal" and the equally common hyphenated "greater-than-
// or-equal" phrasing are caught.
const OPERATOR_DISCLOSURE_PATTERNS: Record<OperatorToken, RegExp[]> = {
  opgte: [/>=/, /\bgreater[\s-]+than[\s-]+or[\s-]+equal\b/i, /\bgreater[\s-]+or[\s-]+equal\b/i],
  opgt: [/(?<![-=])>(?!=)/, /\bgreater[\s-]+than\b/i, /\bstrictly[\s-]+greater\b/i],
  oplte: [/<=/, /\bless[\s-]+than[\s-]+or[\s-]+equal\b/i, /\bless[\s-]+or[\s-]+equal\b/i],
  oplt: [/(?<!=)<(?!=)/, /\bless[\s-]+than\b/i, /\bstrictly[\s-]+less\b/i],
  opeq: [/==/, /\bequal[\s-]+to\b/i, /\bequals\b/i],
  opneq: [/!=/, /\bnot[\s-]+equal\b/i],
};

/**
 * Catches the class of leak the substring/span rules above cannot: a coach
 * that states the corrected comparison operator in its own words (or the
 * raw symbol) without ever reproducing a contiguous run of protected code
 * or root-cause text. Deliberately scoped to only the specific operator(s)
 * that actually differ between `fixedSnippet` and `brokenSnippet` for this
 * fixture, so it never fires for fixtures whose mutation isn't an operator
 * swap. Runs on the raw (non-normalized) candidate so spelled-out phrases
 * and symbols are matched directly.
 */
function containsOperatorDisclosure(candidateRaw: string, fixture: ChallengeFixture): boolean {
  const protectedTokens = protectedOperatorTokens(fixture);
  if (protectedTokens.size === 0) return false;
  for (const token of protectedTokens) {
    if (OPERATOR_DISCLOSURE_PATTERNS[token].some((pattern) => pattern.test(candidateRaw))) {
      return true;
    }
  }
  return false;
}

/**
 * Output-filter containment (design spec section 3.4). The fixture's hidden
 * answer is used only as a denylist here — never as prompt input. Rejects a
 * candidate learner-facing string when, normalized, it contains:
 *
 *  - either side of the mutation patch (`fixedSnippet`, `brokenSnippet`),
 *    compared with an operator-aware normalizer so the two sides never
 *    collapse into the same string for operator-only mutations;
 *  - any line of `hiddenReferenceSolution` with >= 3 non-trivial tokens;
 *  - a >= 6-token contiguous span of `hiddenRootCause`;
 *  - the specific comparison operator that changed between the mutation's
 *    two sides, named as a raw symbol or an unambiguous spelled-out
 *    synonym, anywhere in the candidate;
 *
 * or when the raw candidate contains a code fence or a unified-diff marker.
 */
export function assertNoLeak(candidate: string, fixture: ChallengeFixture): ContainmentResult {
  if (hasCodeFence(candidate)) return { passed: false, rule: "code_fence" };
  if (hasDiffMarker(candidate)) return { passed: false, rule: "diff_marker" };

  const candidateNormalized = normalize(candidate);
  const candidateCodeNormalized = normalizeCode(candidate);

  if (containsMutationSide(candidateCodeNormalized, fixture.fixedSnippet)) {
    return { passed: false, rule: "mutation_patch_fixed" };
  }
  if (containsMutationSide(candidateCodeNormalized, fixture.brokenSnippet)) {
    return { passed: false, rule: "mutation_patch_broken" };
  }
  if (containsReferenceSolutionLine(candidateNormalized, fixture.hiddenReferenceSolution)) {
    return { passed: false, rule: "reference_solution_line" };
  }
  if (containsRootCauseSpan(candidateNormalized, fixture.hiddenRootCause)) {
    return { passed: false, rule: "root_cause_span" };
  }
  if (containsOperatorDisclosure(candidate, fixture)) {
    return { passed: false, rule: "operator_disclosure" };
  }

  return { passed: true, rule: null };
}
