# FaultSmith — Devpost Submission Packet

**Hackathon:** OpenAI Build Week
**Track:** Education
**Submission deadline:** July 21, 2026, 5:00 p.m. PT
**Live app:** [faultsmith.netlify.app](https://faultsmith.netlify.app)
**Repository:** [github.com/Anish-Guntreddi/FaultSmith](https://github.com/Anish-Guntreddi/FaultSmith)
**License:** MIT
**Tagline:** AI that breaks your code on purpose so you learn how to fix it.

## Elevator pitch

FaultSmith turns a working Python project into a validated debugging lab instead of another AI code-fixer. It introduces one controlled root cause, proves with pytest that the original passes and the mutation fails, and then makes the learner do the work — read the evidence, hypothesize, request bounded hints, patch, and explain the root cause — before deterministic test execution, never a model, can mark the attempt verified.

## The problem, and who it's for

AI coding tools make it fast to generate working code and slow to learn how to diagnose code that's already broken. Most programming education shows the happy path or hands learners a static, unchanging bug; AI tutoring tools often reveal or implement the fix before the learner has reasoned through the failure. Passing a final test doesn't show whether a learner understood the root cause or used a sound debugging process.

FaultSmith is built for CS learners who can write basic Python but struggle to debug unfamiliar code, interpret test failures, isolate root causes, and explain why a fix works — the skill gap that AI-assisted coding is actively widening. It secondarily serves instructors who want consistent, validated debugging exercises without hand-maintaining broken repository variants.

## What it does

- Opens with a public landing story explaining the problem and the Observe → Hypothesize → Repair → Verify method, then routes into the full application at `/learn`.
- Offers a zero-token, three-phase, nine-lesson **Guided Roadmap** for beginners, plus a direct **Practice by skill** catalog across three curated Python/pytest projects — Expense Approval API, Inventory Reservation Service, and Notification Preference Engine.
- Loads a real, prevalidated challenge fixture by default (no API key needed) or, when a server-side `OPENAI_API_KEY` is configured, an optional live path where GPT-5.6 emits a schema-constrained mutation contract and OpenAI Code Interpreter proves original-pass/mutated-fail behavior before the lab opens.
- Loads one validated bug aligned to the chosen system and skill; the current practice-level control labels the attempt rather than changing fixture content.
- Gives the learner an allowlisted code editor, authoritative test output, a revision-aware hypothesis journal, up to three progressive hints, and — new for this submission — an AI hypothesis coach ("Check my reasoning") that scores a hypothesis on three independent axes (locus, mechanism, trigger) and asks one targeted question, without ever revealing the fix.
- Reruns the learner's exact submitted code snapshot server-side and blocks `verified` status on any failing result, regardless of the explanation or any model score.
- In live mode, uses GPT-5.6 for three bounded rubric scores; server-owned templates provide learner-facing feedback.
- Shows a guest-first **My Progress** dashboard — phase completion, score dimensions, independent-solve rate, and a deterministic next-lesson recommendation with its reason — derived entirely from local browser state, no account required.
- Optionally lets a learner create a verified email/password account or continue with Google (Firebase Authentication + server-mediated Cloud Firestore) to sync the same bounded metrics across devices. Guest mode is always the default; there is no login wall anywhere in the product.

## How it works (architecture in brief)

```
Browser (Next.js 16 / TypeScript client)
  ├─ Guest attempt + curriculum progress → validated localStorage
  ├─ Optional Firebase Auth → email/password or Google ID token
  └─ Same-origin Next.js API routes (strict Zod contracts, rate-limited, no-store)
          ├─ /api/challenges/generate   → GPT-5.6 mutation contract (schema-constrained)
          ├─ /api/challenges/execute    → OpenAI Code Interpreter or deterministic fixture evaluator
          ├─ /api/challenges/hint       → separate schema, one approved step at a time
          ├─ /api/challenges/hypothesis → GPT-5.6 hypothesis coach, answer-blind + output-filtered
          ├─ /api/challenges/assess     → deterministic test authority + bounded GPT-5.6 rubric scores
          └─ /api/progress              → Firebase-ID-token-verified Firestore reads/writes (optional)
```

- **Server-only fixture catalog.** Nine hand-authored single-root-cause fixtures (three per project) hold hidden root causes and reference solutions in `server-only` modules; public DTO construction explicitly strips those fields before anything reaches the browser.
- **Deterministic evidence authority.** Tests decide completion, not the model. The `assess` route reruns the learner's exact submitted files server-side; a failing result can never become `verified`, no matter what GPT-5.6's assessment prose says.
- **Prevalidated fixture fallback.** When no API key is configured (or the live path fails), the app falls back to a real, non-mocked prevalidated challenge and repair path — the whole learning loop works at zero OpenAI cost, and the UI visibly labels the mode.
- **Server-mediated Firestore, default-deny rules.** Every progress route verifies the caller's Firebase ID token server-side; the UID is derived only from that verified token, never from client input. Direct browser access to Firestore is denied by deployed security rules — all reads/writes are mediated by the Next.js server.
- **Hidden-answer containment for the new hypothesis coach.** The coach's prompt receives only observed evidence (mutated source, tests, failure signature, hypothesis history) via a typed `buildCoachContext` projection that strips the hidden root cause, reference solution, mutation patch, and hints. Containment doesn't stop at the prompt: every candidate response is checked against the fixture's actual hidden answer with an output-denylist filter (`assertNoLeak`) before it can reach the learner — one regeneration is attempted on rejection, then a deterministic, evidence-grounded fallback response is served. See `docs/superpowers/specs/2026-07-21-hypothesis-coaching-design.md`.

## What makes it different

- **Deterministic completion, not model opinion.** Most "AI tutor" products let the model decide when a learner is done. FaultSmith's model can score reasoning and deliver hints, but only executed tests (or exact-match fixture verification) can mark a lesson complete — enforced by tests in the codebase, not just described in a PRD.
- **Validated failures, not static bugs or hallucinated ones.** Every fixture is proven to pass unmodified and fail exactly as expected after mutation before it ships; nothing is generated ad hoc and shown unverified.
- **Zero-cost, fully functional demo path.** The prevalidated fallback isn't a degraded mock — it's the same learning loop, same UI, same evidence, with server-owned snapshot verification instead of live execution. A judge with no OpenAI credits sees the real product.
- **Containment as an engineering property, not a prompt instruction.** The hypothesis coach is answer-blind by construction and additionally denies leaked answers at the output layer, so "don't reveal the fix" is enforced by code a reviewer can read and a unit test can assert, not just by asking the model nicely.
- **Independently reviewed, not self-certified.** Multiple phases closed with separate product, QA/accessibility, and security/adversarial review passes against a frozen commit SHA, with findings and remediation recorded in `.planning/phases/` — including a genuine high-severity fix (hidden fixture knowledge was originally reachable from live-assessment model input; it no longer is).

## How Codex and GPT-5.6 were used

Codex was the primary build environment across roughly 99 commits over four days: the application architecture, the fixture domain, the GPT-5.6/Code Interpreter gateway, route security hardening, the automated test suites (unit, Firebase-emulator integration, Playwright/axe), and most documentation. Codex also ran independent self-directed audits and separate product/QA/security review passes that found and closed real defects — including the high-severity live-assessment disclosure path above and a fallback-verification gap where a comment containing the approved snippet could be misreported as a passing repair.

GPT-5.6 is the runtime AI inside the shipped product, used through four separated, schema-constrained prompts rather than one monolithic prompt: mutation-contract emission, validation interpretation, progressive hint delivery, and bounded rubric scoring — plus, as of today, the answer-blind, output-filtered hypothesis coach. In every role, GPT-5.6's output is checked against deterministic evidence or an exact server-approved contract before it can reach the learner.

See the [README's "Built with Codex"](../README.md#built-with-codex--how-we-collaborated-with-codex) section for the detailed, evidence-cited account of what Codex built, what a human decided, and where a secondary AI design collaborator contributed alongside Codex.

## Testing instructions for judges

No account and no API key are required.

1. Open **[faultsmith.netlify.app](https://faultsmith.netlify.app)** and click into the app (`/learn`).
2. Pick **Guided Roadmap → Lesson 1**, or any card under **Practice by skill**. This loads a real prevalidated fixture at zero OpenAI cost — the fixture path is free and always available.
3. **Observe** the failing pytest evidence shown in the workspace.
4. **Hypothesize**: write an initial hypothesis, then try **Check my reasoning** to see the new hypothesis-coaching feature respond on the locus/mechanism/trigger axes without revealing the fix.
5. **Repair**: edit only the allowlisted file(s) and rerun tests.
6. **Verify**: submit the patch with a root-cause explanation — the report will show `verified` only if the tests actually pass.
7. Optional: open **My Progress** to see the guest-mode dashboard (no account), or expand the account panel to try optional email/password or Google sign-in for cross-device sync — never required.

If a funded `OPENAI_API_KEY` is configured server-side, Practice-by-skill generation additionally exercises the live GPT-5.6 + Code Interpreter path; the guest/fixture path above is unaffected either way.

## PLACEHOLDERS — must be filled in by the human before final submission

The following fields are intentionally **not** filled in here. Do not treat any value elsewhere in the repository as a substitute — none has been generated.

- **YouTube video URL:** `[NOT YET RECORDED/PUBLISHED]` — the public, under-three-minute demo video required by the submission rules.
- **Primary Codex `/feedback` Session ID:** `019f73a1-3483-7ca3-a4ed-75ac831925a5` — captured from the "Complete FaultSmith" Codex build thread (via `/feedback` run inside the active thread). Paste into the Devpost submission form. Verify the exact format the form expects.
- **Five-external-tester UAT result:** `[NOT YET RUN]` — per `docs/UAT_PROTOCOL.md`, at least five external testers completing the scripted experience with at least four of five understanding the product's purpose unaided. Optional context for the submission narrative but not required to open the app.

Everything else in this document is drawn directly from the repository's build log, planning records, and design specs as of this commit — no metrics, review outcomes, or test counts in this packet were invented.
