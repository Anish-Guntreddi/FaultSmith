import "server-only";

import {
  hypothesisResponseSchema,
  type HypothesisAxisStatus,
  type HypothesisResponse,
} from "@/lib/contracts";
import type { CoachContext } from "./hypothesis-context";

/**
 * The four purely structural signals the deterministic fallback is allowed
 * to compute (design spec section 3.5): grounding, specificity,
 * falsifiability, and revision movement. Nothing here inspects the
 * fixture's hidden answer key — it only looks at the learner's hypothesis
 * text, the observed mutated source, and the hypothesis history.
 */
export interface StructuralSignals {
  /** Does the hypothesis name an identifier that is actually present in the mutated source? */
  grounded: boolean;
  /** Does the hypothesis name a comparison, condition, or branch? */
  specific: boolean;
  /** Does the hypothesis predict behavior a test could confirm or refute? */
  falsifiable: boolean;
  /** Trajectory of this hypothesis relative to the prior revision(s). */
  movement: "narrowed" | "restated" | "first";
}

const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "to", "of", "in", "on", "and", "or", "but", "this", "that", "these",
  "those", "it", "its", "by", "for", "with", "as", "at", "if", "else",
  "then", "not", "no", "none", "true", "false", "from", "import",
]);

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

function nonTrivialTokens(text: string): string[] {
  return tokenize(text).filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function isGrounded(hypothesis: string, mutatedSource: string): boolean {
  const hypothesisTokens = nonTrivialTokens(hypothesis);
  if (hypothesisTokens.length === 0) return false;
  const sourceTokens = new Set(tokenize(mutatedSource));
  return hypothesisTokens.some((token) => sourceTokens.has(token));
}

const SPECIFICITY_PATTERNS: RegExp[] = [
  />=|<=|==|!=|>|</,
  /\b(if|elif|else|branch|condition|guard|comparison|boundary|threshold|inclusive|exclusive|equals?|equality|greater|less than|predicate|operator)\b/i,
];

function isSpecific(hypothesis: string): boolean {
  return SPECIFICITY_PATTERNS.some((pattern) => pattern.test(hypothesis));
}

const FALSIFIABILITY_PATTERNS: RegExp[] = [
  /\b(should|would|expect(s|ed)?|instead of|results? in|returns?|raises?|produces?|causes?|leads? to|when .* then|if .* then)\b/i,
  /\d+/,
];

function isFalsifiable(hypothesis: string): boolean {
  return FALSIFIABILITY_PATTERNS.some((pattern) => pattern.test(hypothesis));
}

/**
 * Narrowing = the new hypothesis keeps most of the prior revision's
 * substantive vocabulary while adding new, more specific terms. Anything
 * else (different wording covering roughly the same or less ground) is a
 * restatement. This is a coarse lexical heuristic, not a semantic judgment
 * — consistent with the fallback never claiming more than it can determine
 * structurally.
 */
function isNarrowed(previous: string, current: string): boolean {
  const previousTokens = new Set(nonTrivialTokens(previous));
  const currentTokens = new Set(nonTrivialTokens(current));
  if (previousTokens.size === 0) return currentTokens.size > 0;

  const added = [...currentTokens].filter((token) => !previousTokens.has(token));
  const retained = [...currentTokens].filter((token) => previousTokens.has(token));
  const retentionRatio = retained.length / previousTokens.size;

  return added.length > 0 && retentionRatio >= 0.5;
}

function determineMovement(
  hypothesis: string,
  hypothesisHistory: string[],
): "narrowed" | "restated" | "first" {
  const currentNormalized = hypothesis.trim();
  const priorRevisions = hypothesisHistory.filter(
    (entry) => entry.trim() !== currentNormalized,
  );
  if (priorRevisions.length === 0) return "first";

  const previous = priorRevisions[priorRevisions.length - 1];
  return isNarrowed(previous, hypothesis) ? "narrowed" : "restated";
}

/**
 * Deterministic structural evaluator (design spec section 3.5). Computes
 * only grounding, specificity, falsifiability, and revision movement — it
 * never reasons about whether the hypothesis is actually correct.
 */
export function evaluateHypothesisStructurally(context: CoachContext): StructuralSignals {
  return {
    grounded: isGrounded(context.hypothesis, context.mutatedSource),
    specific: isSpecific(context.hypothesis),
    falsifiable: isFalsifiable(context.hypothesis),
    movement: determineMovement(context.hypothesis, context.hypothesisHistory),
  };
}

/**
 * Maps a boolean structural signal to an axis status. The fallback only
 * ever returns `partial` (some structural evidence found) or `unstated`
 * (no evidence either way) for axes it maps from these signals — it never
 * emits `aligned` or `off`, both of which would require a correctness
 * judgment the deterministic checker cannot make. This is what "unknown
 * axes MUST return unstated — never fabricate alignment" means in
 * practice.
 */
function axisFromSignal(signalPresent: boolean): HypothesisAxisStatus {
  return signalPresent ? "partial" : "unstated";
}

const AXIS_PRIORITY: Array<"locus" | "mechanism" | "trigger"> = ["locus", "mechanism", "trigger"];

function pickWeakestAxis(axes: {
  locus: HypothesisAxisStatus;
  mechanism: HypothesisAxisStatus;
  trigger: HypothesisAxisStatus;
}): "locus" | "mechanism" | "trigger" | "none" {
  return AXIS_PRIORITY.find((axis) => axes[axis] === "unstated") ?? "none";
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

function buildObservation(signals: StructuralSignals, context: CoachContext): string {
  const notes = [
    signals.grounded
      ? "grounded in the mutated source"
      : "not yet grounded in anything from the mutated source",
    signals.specific
      ? "names a specific comparison, condition, or branch"
      : "does not yet name a specific comparison, condition, or branch",
    signals.falsifiable
      ? "makes a prediction a test could confirm or refute"
      : "does not yet make a prediction a test could confirm or refute",
  ];
  return truncate(
    `Structural check only (no reasoning model available): your hypothesis is ${notes.join(", ")}. Observed evidence: ${context.expectedFailureSignature}.`,
    400,
  );
}

const AXIS_QUESTIONS: Record<"locus" | "mechanism" | "trigger", string> = {
  locus: "Which exact line or identifier in the mutated source do you believe is responsible?",
  mechanism: "What specific comparison, condition, or branch causes the wrong behavior?",
  trigger: "Which input value exposes the bug, and what should happen at that value?",
};
const NONE_QUESTION =
  "Can you restate your hypothesis with a specific input and the behavior you expect at it?";

function buildQuestion(weakestAxis: "locus" | "mechanism" | "trigger" | "none"): string {
  return truncate(
    weakestAxis === "none" ? NONE_QUESTION : AXIS_QUESTIONS[weakestAxis],
    200,
  );
}

/**
 * Builds the full deterministic fallback response (design spec section
 * 3.5). Used when `hasOpenAIKey()` is false, the provider errors or times
 * out, or the containment filter rejects the model's output twice.
 */
export function buildDeterministicFallbackResponse(context: CoachContext): HypothesisResponse {
  const signals = evaluateHypothesisStructurally(context);
  const axes = {
    locus: axisFromSignal(signals.grounded),
    mechanism: axisFromSignal(signals.specific),
    trigger: axisFromSignal(signals.falsifiable),
  };
  const weakestAxis = pickWeakestAxis(axes);

  return hypothesisResponseSchema.parse({
    source: "deterministic_fallback",
    axes,
    weakestAxis,
    observation: buildObservation(signals, context),
    question: buildQuestion(weakestAxis),
    movement: signals.movement,
  });
}
