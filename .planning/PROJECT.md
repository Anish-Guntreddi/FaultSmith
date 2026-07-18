# FaultSmith

## What This Is

FaultSmith is an evidence-first deliberate debugging practice application for Python learners, especially students and early-career engineers who risk becoming dependent on AI-generated answers without learning how to inspect failures, form hypotheses, or defend a repair. It combines an organized nine-lesson beginner roadmap and curated advanced challenge catalog with GPT-5.6 mutation planning, OpenAI Code Interpreter validation, deterministic test authority, progressive hints, and a real prevalidated fallback.

This is a brownfield Build Week release candidate. Canonical product decisions remain in `docs/PRD.md`; the completion loop and objective gates remain in `docs/EXECUTION_GOAL.md`; the delivery truth remains in `docs/ROADMAP.md` and `docs/COMPLETION_REPORT.md`. This GSD project organizes implementation and verification but does not replace those documents.

## Core Value

Learners must practice reading real failure evidence, reasoning about root causes, and proving minimal repairs instead of receiving an answer that bypasses the debugging process.

## Requirements

### Validated

- ✓ A learner can complete Expense Approval from challenge selection through a verified skill-evidence report using the real prevalidated fallback — existing release candidate.
- ✓ Three curated projects (Expense Approval, Inventory Reconciliation, Notification Preferences) expose nine original-pass, mutated-fail, repaired-pass fixture lifecycles — existing release candidate.
- ✓ A three-phase, nine-lesson guided roadmap is the default beginner experience with zero-token launches, sequential unlocks, bounded progress, reinforcement, and deterministic next-step recommendations — guided-learning branch.
- ✓ Advanced learners can directly select project, debugging skill, and difficulty without using the roadmap — existing release candidate.
- ✓ GPT-5.6 mutation, validation interpretation, hint, and assessment calls use strict schemas and remain subordinate to deterministic execution evidence — implemented with mocked integration evidence.
- ✓ Learner Python has no application-host execution path; live execution is isolated behind the server-only OpenAI Code Interpreter adapter — boundary verified locally.
- ✓ Hidden root causes and reference repairs are stripped from public payloads, browser imports, local storage, and client bundles — unit, route, browser, and bundle evidence.
- ✓ Missing credentials, malformed model output, provider timeout, and expired execution recover to a visibly labeled real fixture challenge — automated evidence.
- ✓ Keyboard, axe, responsive, reduced-motion, production-build, startup, secure-header, dependency-audit, and leakage gates pass locally — current quality evidence.
- ✓ The public GitHub repository, contribution/security policy, Dependabot, branch protection, CI, issue templates, and draft submission documentation exist — repository baseline.

### Active

- [ ] Make GSD the tracked development control plane with a mapped brownfield architecture, atomic phases, parallel independent reviews, requirement traceability, and verification state.
- [ ] Split CI into independently named static, unit/integration, build/security, and browser/accessibility gates while keeping the complete local `npm run quality` command green.
- [ ] Perform independent product-completeness, QA/accessibility, and security/adversarial audits; validate findings, repair every in-scope blocker/high issue, add regressions, and rerun affected gates.
- [ ] Correct repository-era documentation drift and preserve objective, branch-specific evidence in `docs/BUILD_LOG.md`, `docs/ROADMAP.md`, `docs/THREAT_MODEL.md`, `docs/TESTING.md`, and `docs/COMPLETION_REPORT.md`.
- [ ] Run a credential-controlled live GPT-5.6 and Code Interpreter smoke without weakening or removing the validated fixture fallback.
- [ ] With explicit deployment approval, publish an unauthenticated demo and verify the primary workflow, security headers, health endpoint, fallback, and recording layout in production.
- [ ] Collect five external tester results, publish the under-three-minute demo video, and capture the primary Codex `/feedback` Session ID for the final submission.

### Out of Scope

- Natural-language custom challenge prompting before submission — explicitly deferred because it materially widens prompt-injection, validation, cost, and demo reliability scope.
- Arbitrary repository upload or arbitrary Python/shell execution — conflicts with the curated allowlist and sandbox safety model.
- Runtime learner-facing agent swarms — the swarm is a development accelerator; product authority stays with deterministic tests and bounded server policy.
- Accounts, cross-device synchronization, cohorts, instructor dashboards, leaderboards, and certification — not required for the anonymous Build Week MVP.
- Languages beyond Python and projects beyond the three curated applications — depth and proof take priority over breadth before judging.
- A separately importable npm SDK/package — `faultsmith` is intentionally a private full-stack application; extracting a public library is post-submission work.

## Context

- The product was expanded through an approved July 18, 2026 PRD amendment to address a growing educational problem: students can generate code with AI but often cannot parse failures, debug behavior, or maintain what was produced.
- Beginners need organized categories, concept guides, and hardcoded validated exercises that ground them without consuming model tokens. Advanced users retain the live-capable direct catalog for more dynamic practice.
- The guided-learning implementation is committed on `agent/guided-learning-mvp` and is represented by draft GitHub PR #13. The branch currently contains the latest product code and evidence.
- All normal automated tests mock or avoid paid OpenAI calls. The live smoke is separate and explicitly credential controlled.
- The validated fallback is a core reliability and demo feature, not a temporary fake. It compares learner snapshots against server-owned approved fixtures without executing untrusted Python on the Next.js host.
- The remaining globally unfinished criteria depend on a server-only API credential, deployment authorization, five external testers, video publication, or the Codex `/feedback` flow.
- The user wants maximum safe velocity and explicitly authorized GSD plus parallel development agents. Independent workstreams must avoid overlapping edits and cannot self-certify their own security or QA conclusions.

## Constraints

- **Locked product:** Education track, Python learners, curated projects, Expense Approval primary demo, GPT-5.6, Responses API, Code Interpreter, Next.js/TypeScript, anonymous browser-local persistence — material changes require user approval.
- **Execution safety:** No learner Python or learner-supplied command may execute on the application host; client paths, files, IDs, text, counts, sizes, duration, and output remain bounded.
- **Evidence authority:** Original-pass, mutated-fail, signature match, repaired-pass, and final verification are deterministic; a model may veto or explain but never promote failing evidence.
- **Secret handling:** `OPENAI_API_KEY` is server-only, never logged, committed, sent to the client, or exposed through a `NEXT_PUBLIC_` variable.
- **Reliability:** The prevalidated fixture fallback must remain intact and visibly labeled through every product and infrastructure change.
- **Framework:** Next.js 16.2.10 differs from prior conventions; relevant bundled docs under `node_modules/next/dist/docs/` must be read before framework code changes.
- **Testing:** External OpenAI calls stay mocked in the normal suite; live verification is a separate explicit smoke. Lint, typecheck, tests, production build, bundle scan, browser/accessibility tests, audit, and server smoke must remain green.
- **Timeline:** Submission closes July 21, 2026 at 5:00 PM Pacific; prioritize merge, live proof, deployment, testers, and recording over speculative breadth.
- **Authority:** Credentials, deployment, destructive actions, competition ambiguity, or a material PRD change require the user's participation or approval.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use GSD as the development control plane, not a learner-facing runtime dependency | Parallel planning/review accelerates development without adding latency or nondeterministic authority to the product | ✓ Good |
| Use parallel independent product, QA, and security workstreams with a coordinating integrator | Independent reviews reduce blind spots while separated file ownership prevents edit conflicts | — Pending |
| Preserve curated fixtures as the beginner roadmap substrate | Produces reliable, zero-token practice and keeps hidden answers and execution authority server-owned | ✓ Good |
| Keep the direct project/skill catalog as advanced mode | Preserves versatility and the live GPT-5.6 path without forcing novices into open-ended prompting | ✓ Good |
| Defer open-ended prompts and repository ingestion | They materially expand locked scope and security risk during the submission-critical window | ✓ Good |
| Split CI into visible independent gates | Improves failure isolation, parallelism, branch protection, and objective QA/security evidence | — Pending |
| Keep fixture mode explicitly labeled as prevalidated evidence | Avoids misleading claims while maintaining a dependable demo path | ✓ Good |
| Require explicit authorization for live credential use and deployment | Protects secrets, spend, external state, and submission ownership | ✓ Good |

---
*Last updated: July 18, 2026 after GSD brownfield initialization*
