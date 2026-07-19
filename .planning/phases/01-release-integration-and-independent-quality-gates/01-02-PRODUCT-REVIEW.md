# Plan 01-02 — Independent Product-Completeness Review

**Reviewed implementation SHA:** `506dae90ce3832f4096f5f95a52c996c5335f9f1`  
**Manifest:** `01-01-BASELINE.md`  
**Review date:** July 18, 2026  
**Reviewer role:** Independent product-completeness stream; no product, test, canonical-document, or GSD-state edits  
**Release-gate result:** **Not signed off — 0 blockers and 1 unresolved high finding**

## Scope and method

The review used a unique detached temporary Git worktree at the manifest SHA, not the later planning/review `HEAD`. It traced the locked PRD, persistent execution goal, guided-learning amendment, canonical roadmap/completion claims, curriculum and direct catalog, fixture projection and verifier, client stages and persistence, generation/execution/hint/assessment workflows, route/E2E evidence, and demo/submission copy. The temporary worktree received a clean `npm ci`; its production server was stopped after the bounded API comparison.

The review intentionally distinguishes three evidence classes:

1. **Prevalidated fixture evidence:** nine real server-owned labs. The non-executing verifier accepts only the approved repair snapshot, is visibly labeled, and does not claim learner Python ran on the Next.js host.
2. **Mocked live-policy evidence:** offline tests prove strict contracts, retry/fallback policy, Code Interpreter-only host boundary, and deterministic authority, but do not prove current provider behavior.
3. **Credentialed live evidence:** not available at this SHA. GPT-5.6 and Code Interpreter claims remain implementation claims pending the controlled Phase 2 smoke.

No hidden root cause, repair text, future hint, rubric secret, or reference solution is reproduced in this report.

## Commands and objective evidence

| Command or inspection | Result at the reviewed SHA |
| --- | --- |
| `git rev-parse --verify 506dae90ce3832f4096f5f95a52c996c5335f9f1^{commit}` | Resolved exactly to the manifest SHA. |
| `git worktree add --detach <unique-mktemp-dir> 506dae90ce3832f4096f5f95a52c996c5335f9f1` | Detached review worktree created successfully. |
| `npm ci` | 490 packages installed; 497 audited; zero vulnerabilities reported. |
| `npm run quality` | Passed: ESLint, TypeScript, 7 Vitest files / 45 tests, Next.js 16.2.10 production build / 7 routes, 17-artifact bundle scan, and 6 Playwright tests in 6.4 seconds. |
| `npm audit --audit-level=moderate` | Passed; zero vulnerabilities. |
| `npm run security:source` | Passed; 98 working-tree files and 19 reachable commits inspected. |
| Three prevalidated generation requests for the same project/skill at beginner, intermediate, and advanced | All returned HTTP 200 with the same challenge ID, title, editable-file path/content length, source, and initial failure; only the `difficulty` label changed. |
| Source trace of `startGuidedStep` → `forgeChallenge(false, ...)` → `generateChallengeWorkflow` | Guided lessons set `preferLive: false`; the workflow returns the prevalidated challenge before constructing or calling an OpenAI gateway. |
| Source trace of `selectFixture` → `planMutation` → `assertPlanMatchesFixture` | Live mode selects one fixture before the model call, supplies the complete approved contract to the model, and rejects any plan that differs in ID, project, skill, difficulty, allowlist, tests, or patch. |
| `git diff --name-only 506dae90ce3832f4096f5f95a52c996c5335f9f1..HEAD -- src tests scripts package.json .github` from the main repository | Empty at review start; later planning/report commits did not change the inspected product surface. |

## Requirement and Definition-of-Finished trace

### Phase 1 requirements supported by this plan

| Requirement | Review disposition | Evidence / remaining action |
| --- | --- | --- |
| DEV-02 | Met for this stream | Independent SHA-bound report, isolated worktree, exclusive report ownership, and no product self-certification. Full requirement also depends on sibling QA/security reviews and coordinator consolidation. |
| DEV-03 | Findings supplied; coordinator action required | Every finding below includes severity, files, failure path, impact, mitigation, and evidence. Accepted repairs/rejections and rerun evidence must be added by Plan 05. |
| QA-01 | **Not met yet** | Guided, catalog, fallback, persistence, and report workflows are implemented and green, but PR-001 is an unresolved high submission/demo-accuracy defect. |
| SAFE-01 | Met at the baseline | Missing-key/direct fallback and explicit guided prevalidated launch pass E2E; fixture source/evidence labels are visible; all nine project-skill combinations have one fixture. |
| SAFE-02 | Met at the baseline | Curriculum metadata contains only public IDs/guidance; strict progress omits learner prose/code; hidden-field DTO/bundle tests and deterministic-evidence regressions pass. |

### Guided-learning amendment acceptance

| Acceptance area | Disposition | Objective evidence |
| --- | --- | --- |
| Default roadmap and direct catalog | Pass | Guided is the initial mode; Practice by skill is keyboard reachable and retains project, skill, difficulty, and live/prevalidated controls. |
| Nine ordered lessons and fixture mapping | Pass | Three phases / nine unique IDs and project-skill pairs; fixture test requires exactly one approved fixture per lesson. |
| Zero-token guided launch | Pass | Guided launch forces `preferLive: false`; UI says `Prevalidated lab · no API credits required`; the server returns before any gateway call. |
| Verified-only progress and deterministic recommendation | Pass | Progress writes only after `completionStatus === "verified"`; failed-patch E2E leaves no progress; weak completion reinforces and strong completion advances without a model call. |
| Refresh, tamper handling, accessibility, and narrow layout | Pass | Report/lesson restoration, strict progress parsing, axe/keyboard checks, and 390 × 844 overflow checks pass. |
| Existing catalog/live-plus-fallback/security boundaries | Pass with claim qualification | Direct selection and fallback work; live behavior remains mocked/implemented rather than credential-verified. PR-001/PR-002 constrain how capability may be described. |

### Persistent Definition of Finished / PRD readiness

| Criteria | Disposition at the reviewed SHA |
| --- | --- |
| Primary Expense Approval selection → workspace → report; correct/incorrect authority; persistence | Verified locally by the primary E2E and route/workflow tests. |
| Hidden-answer containment, allowlists, host-execution prohibition, fixture fallback, secondary systems | Verified locally through strict schemas, server-only fixtures, bundle/source scans, nine fixture lifecycles, and Inventory/Notification workspace E2E. |
| GPT-5.6 mutation, live original/mutated/repaired execution, live hint, and live assessment | Implemented and mocked only; credentialed proof remains explicitly blocked for Phase 2. The actual mutation-planner authority is narrower than current submission language (PR-001). |
| Lint, types, unit/integration, production build, bundle/source security, browser/accessibility | Verified independently at the manifest SHA by the commands above. |
| Documentation contains no stale or misleading claim | **Not met:** PR-001 and PR-003. |
| Deployment, five-person UAT, public video, final links, `/feedback` ID | External and still pending; local evidence does not substitute for them. |

## Product-value review

### Beginner grounding

The beginner experience is real and coherent. A learner lands on an ordered evidence-first path rather than an empty prompt box. Each lesson provides a concept guide, three-step investigation loop, success signal, estimated time, sequential status, hypothesis gate, progressive hints, exact-snapshot repair evidence, explanation assessment, bounded progress, and a deterministic recommendation. This directly supports the stated goal of making learners read failures and form hypotheses before asking AI for a repair. Weak verified work is allowed to unlock the next lesson, as the approved amendment specifies, but the recommendation points back to reinforcement; the report also says the result is skill evidence, not certification.

### Advanced/direct value

Practice by skill is a functioning direct-control catalog with three systems, all nine approved skills, three selectable labels, and explicit live-plus-fallback/prevalidated modes. It reaches real labs and the complete primary report workflow. Its defensible MVP value is **curated direct selection plus an optional constrained live validation/feedback path**. It is not currently adaptive challenge creation: project and skill select one fixed fixture, and changing the difficulty does not change challenge content. Open-ended prompts, new generated cases, repository ingestion, and runtime swarms remain correctly deferred.

### Demo and submission defensibility

The prevalidated demo is defensible when narrated as a server-owned, previously validated fixture with deterministic snapshot comparison. Workspace/report labels make that distinction well, and the fallback demonstrates the complete learning interaction without claiming fresh Python execution. The current timed script is not defensible unchanged: it starts the zero-token guided path and immediately says GPT-5.6 produced a contract, although that request deliberately bypasses OpenAI. Live Code Interpreter and GPT assessment should be described only after a credentialed smoke, and any recorded fallback run must keep the current visible fixture labels.

## Findings

| ID | Severity | Affected files | Reproduction / failure path | Impact | Mitigation | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| PR-001 | **High** | `src/components/faultsmith-app.tsx:383-396`; `src/server/workflows.ts:40-58,83-108`; `src/server/ai-gateway.ts:86-128`; `docs/DEMO_SCRIPT.md:21-29`; `docs/SUBMISSION.md:17,27,43-48,59`; `README.md:6,31-34` | Start Lesson 1 from the default roadmap. The client calls generation with `preferLive: false`; the workflow returns a fixture before any gateway call. In direct live mode, the server selects the fixture first, sends the complete approved contract to GPT-5.6, and accepts only an exact match. The model neither chooses among mutations nor creates the shipped source change. | The timed narration attributes model activity to a request that makes no model call, while the submission says GPT-5.6 selects a mutation and describes advanced practice as adaptive. This is a material judging/provenance risk and violates the no-misleading-features finish criterion. | Before recording/submission, choose one truthful boundary and re-review it: (a) safest for this milestone—state that guided mode is wholly prevalidated and that live GPT-5.6 emits/checks a tightly constrained approved contract, interprets validation, delivers an approved hint, and assesses reasoning; remove `selects`, `designs`, and `adaptive challenge` wording; or (b) after explicit scope/credential review, implement a genuinely bounded choice among multiple approved contracts and prove it live. Do not narrate GPT activity during a guided fixture launch. | Direct source trace above; `guided-roadmap.tsx:112` says no credits; three guided/direct E2E paths pass without a key; controlled API requests showed prevalidated source. No live credential evidence exists. |
| PR-002 | Medium | `src/server/fixtures.ts:637-645`; `src/server/challenge-service.ts:16-21,42-55`; `src/server/workflows.ts:83-108`; `src/components/faultsmith-app.tsx:712-724`; `docs/SUBMISSION.md:27-30,59`; `README.md:6` | Submit the same project and target skill with `beginner`, `intermediate`, and `advanced`. The server returns the same challenge ID and same editable snapshot; `withRequestedDifficulty` changes only the response label. Live equality also binds all three requests to that same fixture. | The catalog control works mechanically but does not vary scaffolding, mutation complexity, test evidence, hints, or assessment. Calling it adaptive or saying the bug is aligned to difficulty overstates the implemented advanced capability. | For the submission build, describe difficulty as learner-selected labeling only or remove the adaptive claim. If difficulty is retained as a product claim, add a bounded, validated effect (for example level-specific scaffolding/hint policy) with tests and live/fallback parity; adding 18 new fixtures belongs to a new approved content scope. | The bounded production-API comparison returned identical challenge identity/content metadata for all three values; source inspection shows only object spread of `difficulty`. |
| PR-003 | Medium | `docs/COMPLETION_REPORT.md:28,52`; `docs/TESTING.md:17-31`; `docs/ROADMAP.md:12`; `docs/BUILD_LOG.md:131`; `docs/THREAT_MODEL.md:79` | Compare canonical evidence with the manifest-SHA commands. The docs report 40 tests across 6 files and say Git history scanning is inapplicable because the workspace is not a repository; the reviewed SHA runs 45 tests across 7 files and the source gate inspects reachable history. | The runtime is green, but stale release evidence fails DOC-01 and makes reviewers reconcile contradictory counts/repository status manually. | In Plan 05, update canonical evidence once with the stable reviewed SHA, 45/7 unit evidence, four CI jobs, bundle/source scan counts, accepted/rejected independent findings, and current Git/history status. Preserve all live/deployment qualifications. | Independent command output: 7/45, 17 bundle artifacts, 98 working-tree files and 19 reachable commits; baseline manifest records the same 45-test state. |
| PR-004 | Informational / accepted boundary | `src/server/fixture-runner.ts:59-94`; `src/components/faultsmith-app.tsx:754-875`; `docs/THREAT_MODEL.md:64-68` | Submit a semantically plausible but non-identical repair in prevalidated mode. It remains failed because the fallback compares against the one server-owned approved repair snapshot rather than executing learner Python. | This limits creative alternative repairs, but it prevents false verification and is substantially more honest than pretending the fixture path ran Python. The direct live path is the intended route for executable alternatives. | Retain for the MVP. Keep the current `Prevalidated fixture`, `deterministic verifier`, and snapshot-comparison labels; do not call fixture output freshly executed tests. | Incorrect/broad/comment/syntax/dead-code regressions pass; workspace/report E2E asserts the non-executing disclosure. |

## Conclusion

- **Blocker findings:** 0
- **High findings:** 1 (`PR-001`)
- **Medium findings:** 2 (`PR-002`, `PR-003`)
- **Low findings:** 0
- **Informational accepted boundaries:** 1 (`PR-004`)

The reviewed SHA is a strong, locally green guided-learning release candidate with a real beginner roadmap, functioning direct catalog, honest fixture verifier, complete primary workflow, persistence, reports, and broad automated evidence. It is **not yet eligible for independent product sign-off under QA-01** because the high-severity GPT/demo attribution mismatch is unresolved. The coordinator should repair or technically reject PR-001, rerun the affected doc/demo and product gates, and request independent re-review before declaring that no blocker/high product defect remains. PR-002 and PR-003 should be corrected before the submission text and recording are frozen.
