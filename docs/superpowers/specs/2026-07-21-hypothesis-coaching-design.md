# Hypothesis Coaching — Design Spec

**Date:** July 21, 2026
**Status:** Approved for same-day implementation
**Author:** Fable orchestrator
**Constraint:** Submission deadline 17:00 PT today. Every change is **additive**; the existing assess contract, frozen evidence, and live production deploy must remain valid at all times.

## 1. Problem

Hypothesis evaluation in fixture mode is substring keyword matching. Each fixture carries `explanationSignals`; the scorer counts matched groups with `includes()` plus a causal-language regex, then indexes lookup tables (`[40, 60, 78, 94][matchedSignalGroups]`).

Two failure modes:

- **Gameable.** Typing "boolean and condition because" scores like a deep explanation.
- **Brittle.** A correct hypothesis phrased in unanticipated synonyms scores like a wrong one.

Neither measures comprehension. Debugging hypotheses live in grey areas — a learner is routinely right about *where* and wrong about *why* — and a rule engine cannot produce the feedback that teaches: "you've located the right function but misidentified the mechanism."

## 2. Decision

Add an **AI hypothesis coach** as a new, optional, additive capability. It reasons over evidence, returns multi-axis feedback, and never reveals the repair.

### 2.1 What it is not

- It does **not** gate completion. Deterministic tests remain the sole completion authority.
- It does **not** modify the assess contract, assessment scoring, or any existing route.
- It does **not** replace the deterministic scorer, which becomes the labeled reduced-fidelity fallback.

## 3. Architecture

### 3.1 New route

`POST /api/challenges/hypothesis` — modeled exactly on `src/app/api/challenges/hint/route.ts`:
rate-limited (`checkRateLimit(request, "hypothesis")`), `readJsonBody`, Zod-validated request, Zod-validated response, `Cache-Control: no-store`, `safeErrorResponse`, `maxDuration = 30`.

### 3.2 Three-axis evaluation model

A hypothesis can be independently right or wrong on three axes. Scoring one blended number destroys the signal that makes feedback actionable.

| Axis | Question | Example failure |
|---|---|---|
| **locus** | Which code is responsible? | Blames the caller, not the predicate |
| **mechanism** | Why does it misbehave? | Right function, wrong reason ("ordering" vs "operator") |
| **trigger** | Which inputs expose it? | Cannot say which value crosses the boundary |

Each axis returns `aligned | partial | off | unstated`. Feedback names the weakest axis and asks one Socratic question targeting it.

### 3.3 Answer-blind prompt

The model receives **only**: `mutatedSource`, `testsSource`, `expectedFailureSignature` (observed evidence), the current hypothesis, and `hypothesisHistory`.

It must **never** receive `hiddenRootCause`, `hiddenReferenceSolution`, `mutationPatch`, or `hints`.

A typed projection `buildCoachContext(fixture, request)` performs this strip. A unit test asserts the forbidden fields are absent from its output, so containment is enforced by CI rather than by author discipline.

Note: answer-blindness is **not** the containment mechanism. A capable model derives the root cause from buggy source plus a failing test — that capability is precisely what enables grey-area evaluation. Answer-blindness reduces surface; §3.4 provides containment.

### 3.4 Containment: output filter, not prompt omission

The fixture's hidden answer is used as an **output denylist**, never as prompt input.

`assertNoLeak(candidate, fixture)` rejects a response when it contains, normalized (case-folded, whitespace-collapsed, punctuation-stripped):

- any line of `hiddenReferenceSolution` of ≥ 3 non-trivial tokens;
- either side of `mutationPatch` (`fixedSnippet`, `brokenSnippet`);
- a ≥ 6-token contiguous span of `hiddenRootCause`.

On rejection: one regeneration under a stricter instruction; on second rejection, degrade to the deterministic fallback response. **A leak must never reach the learner.** Rejections increment a counter exposed only as an aggregate boolean in health output — never the content.

Additionally the response schema forbids code fences and diff markers (`^[+-]`) in learner-facing strings.

### 3.5 Fallback contract

When `hasOpenAIKey()` is false, the provider errors, times out, or the containment filter rejects twice:
return a deterministic structural response with `source: "deterministic_fallback"` and a visible label.

The deterministic fallback performs **grounding checks only** (identifier presence in source, comparison/condition reference, falsifiable prediction, revision-narrowing across history). It never claims axis alignment it cannot determine; unknown axes return `unstated`.

### 3.6 Contracts

```ts
// src/lib/contracts.ts (additive)
hypothesisRequestSchema = {
  challengeId: string,
  hypothesis: string (1..2000),
  hypothesisHistory: string[] (max 10, each ≤ 2000),
}

hypothesisResponseSchema = {
  source: "gpt-5.6" | "deterministic_fallback",
  axes: { locus, mechanism, trigger: "aligned"|"partial"|"off"|"unstated" },
  weakestAxis: "locus" | "mechanism" | "trigger" | "none",
  observation: string (≤ 400),   // what the evidence shows, no fix
  question: string (≤ 200),      // one Socratic question
  movement: "narrowed" | "restated" | "first" ,  // trajectory vs history
}
```

No field may contain the repair. `observation` and `question` are the only free-text fields and both pass `assertNoLeak`.

### 3.7 UI

In the investigation workspace hypothesis area: a secondary **"Check my reasoning"** button (never primary — submission remains the primary action). Renders the three axes with glyph+label (color never sole signal), the observation, the question, and a visible source label when the response is the deterministic fallback.

Disabled while empty or in-flight; announced politely to assistive tech; honors reduced motion.

## 4. Hard constraints

- Additive only: no change to `assess`, `execute`, `generate`, `hint` behavior or contracts.
- Tests remain the sole completion authority; coaching never writes progress or completion.
- No new npm packages, fonts, CDNs, or CSP origins.
- WCAG AA contrast, visible focus, color never sole signal, `prefers-reduced-motion` honored.
- Server-only secrets; nothing added to client bundles; existing scanners must stay green.
- `.env.local` is never read, printed, moved, or committed. `security:source` is not run while it exists.
- Existing 325 unit tests, 23 emulator tests, and 24 Playwright/axe specs must remain green.

## 5. Phases

| Phase | Deliverable | Gate |
|---|---|---|
| 1 | Contracts, `buildCoachContext`, `assertNoLeak`, deterministic fallback evaluator + unit tests | fast gates |
| 2 | AI coach workflow + `/api/challenges/hypothesis` route + route tests | fast gates |
| 3 | Workspace UI affordance + E2E coverage | full gate |
| 4 | Security review, QA review, Codex review, remediation | full gate + reviews |

Each phase is independently revertible. If any gate fails and time is short, abandon at that phase — production is unaffected.

## 6. Out of scope

RAG or vector retrieval (9 fixtures; the lesson ID is a deterministic lookup — retrieval adds nondeterminism and dependency weight for no gain), assess-contract changes, scoring changes, re-freezing prior evidence.
