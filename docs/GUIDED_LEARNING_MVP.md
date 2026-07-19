# Guided Learning MVP

**Approved scope change:** July 18, 2026

**Target:** OpenAI Build Week submission on July 21, 2026

**Status:** Ready for implementation

**Product boundary:** Preserve the validated fixture fallback and every existing security invariant.

> **July 19 follow-on amendment:** Optional email/password accounts, Google sign-in, cross-device progress, and a personal metrics dashboard were promoted into a separate configuration-gated phase. Guest/local behavior in this document remains the required fallback and acceptance baseline. See `docs/PERSONALIZED_LEARNING_PRD.md`.

## Problem

Students and early-career engineers increasingly reach for AI-generated fixes before they can reproduce a failure, parse evidence, form a hypothesis, or explain a root cause. Open-ended prompting can amplify that dependency because prompt quality becomes a prerequisite for learning and the model can remove the productive struggle that builds debugging skill.

FaultSmith should teach an evidence-first debugging process before offering adaptive AI assistance. Beginners need an organized route through foundational concepts; experienced learners still need a fast skill catalog and the existing constrained live-generation path.

## Product decision

Ship a hybrid learning entry point with two modes:

1. **Guided roadmap:** nine ordered lessons backed by the existing nine prevalidated challenges. Each lesson provides a short concept guide, a repeatable investigation checklist, a clear success signal, deterministic progress, and a next-step recommendation. Guided lessons default to prevalidated mode so they require no API credits.
2. **Practice by skill:** preserve the existing project, skill, difficulty, and validation-mode catalog unchanged for learners who want direct control or the live GPT-5.6 path.

Open-ended natural-language challenge requests and arbitrary repository ingestion remain deferred. Optional accounts and cross-device progress are governed by the later personalized-learning amendment; they cannot weaken this phase's public guest path, deterministic authority, or local fallback.

## Curriculum

### Phase 1 — Read the evidence

1. Boundary conditions — Expense Approval
2. Boolean logic — Notification Preferences
3. Defensive validation — Inventory Reservation

### Phase 2 — Reason about behavior

4. Business-rule interpretation — Expense Approval
5. Fallback behavior — Notification Preferences
6. Idempotency — Inventory Reservation

### Phase 3 — Defend real systems

7. Authorization logic — Expense Approval
8. State transitions — Inventory Reservation
9. Data validation — Notification Preferences

Each lesson maps to exactly one existing server-owned fixture. No root cause, repair, future hint, hidden signature, or reference answer may enter curriculum metadata or browser progress.

## User experience

- The configure screen opens on the Guided roadmap and clearly offers Practice by skill as the second mode.
- The roadmap displays completed lesson count, three phases, lesson status, estimated time, and the recommended lesson.
- Selecting a lesson shows its concept guide, investigation checklist, success signal, and zero-token prevalidated policy.
- Starting a guided lesson preconfigures project, skill, difficulty, and prevalidated validation without requiring the learner to prompt an AI.
- Existing workspace behavior remains unchanged: inspect evidence, record a hypothesis, request progressive hints, edit, run tests, explain, and submit.
- A verified report records bounded local progress and recommends the next lesson. A failed report never records completion.
- Refresh restores the active guided lesson and completed report. Choosing another system clears only the active attempt, not curriculum progress.
- Practice by skill retains the existing live-plus-fallback and prevalidated choices.

## Progress and recommendation contract

Browser-local progress contains only:

- schema version;
- valid lesson IDs;
- completion timestamp;
- bounded overall score;
- hints used;
- test-run count.

It contains no source code, hypothesis, explanation, hidden answer, API data, prompt, or provider identifier. Invalid, duplicate, oversized, or unknown persisted entries are discarded by a strict schema.

Recommendation policy is deterministic:

- recommend the first incomplete unlocked lesson;
- after a weak verified attempt (score below 80 or more than one hint), recommend reinforcing that lesson while still unlocking the next lesson;
- after all lessons are complete, recommend skill-catalog practice at a higher difficulty.

## API and token policy

- Guided lessons default to the prevalidated fixture path and make no OpenAI request.
- The existing Practice by skill mode remains the entry point for live GPT-5.6 and Code Interpreter generation.
- Deterministic progress and recommendations do not call a model.
- Existing live hint and assessment behavior remains unchanged for generated challenges.
- No new API endpoint, prompt field, or execution permission is introduced in this phase.

## Acceptance criteria

1. Guided roadmap is the visible default and Practice by skill remains reachable.
2. All nine lessons have unique IDs and map to the existing nine project-skill combinations.
3. The first lesson can launch the validated Expense Approval boundary fixture without an API credential.
4. Guided launch explicitly states that it uses a prevalidated zero-token lab.
5. Only a verified assessment records lesson completion.
6. Failed, abandoned, or merely passing-without-submission attempts do not record completion.
7. Completion and active lesson restore after refresh.
8. Tampered or unknown local progress is ignored safely.
9. The report displays roadmap progress and a deterministic next recommendation.
10. Existing catalog, live-plus-fallback, fixture fallback, hint separation, authoritative tests, and hidden-answer boundaries remain green.
11. Guided selection and progress UI are keyboard reachable, axe-clean, and usable at 390 × 844 without horizontal overflow.
12. Unit, E2E, lint, typecheck, build, bundle leakage, audit, and primary demo gates pass.

## Implementation plan

### Wave 1 — Curriculum domain

- Add a client-safe curriculum registry with three phases and nine ordered lessons.
- Add strict progress parsing, completion recording, lesson status, and deterministic recommendation helpers.
- Add unit tests for registry completeness, fixture mapping metadata, tamper recovery, completion replacement, and recommendations.

### Wave 2 — Product integration

- Add Guided roadmap and Practice by skill entry modes.
- Add lesson detail, concept guide, investigation checklist, success signal, and zero-token disclosure.
- Start guided lessons through the existing generation route using `preferLive: false`.
- Persist the active lesson with the public attempt and record progress only after verified assessment.
- Extend the report with guided progress and continue-roadmap behavior.

### Wave 3 — Verification and submission narrative

- Add E2E coverage for guided launch, verified completion, report recommendation, refresh restoration, failed-attempt non-completion, accessibility, and narrow layout.
- Run adversarial local-storage and fallback-boundary tests.
- Update README, PRD, ROADMAP, BUILD_LOG, THREAT_MODEL, TESTING, DEMO_SCRIPT, SUBMISSION, and COMPLETION_REPORT.
- Run the complete quality gate and a manual recording-resolution rehearsal.

## Explicitly deferred

- Natural-language custom challenge prompting
- Arbitrary repository upload or ingestion
- Learner-defined dependencies, commands, tests, or container identifiers
- Model-generated curriculum sequencing
- Accounts, cohorts, instructor dashboards, or cloud progress
- Additional fixture content beyond the validated nine

These are strong post-submission directions, but adding them before live credential and deployment verification would weaken the current evidence and security posture.
