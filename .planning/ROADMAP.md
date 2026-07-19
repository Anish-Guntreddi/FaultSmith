# Roadmap: FaultSmith Submission Completion

## Overview

This milestone converts the current guided-learning release candidate into one stable, independently reviewed submission commit, proves the optional GPT-5.6 and Code Interpreter path without sacrificing the prevalidated fixture fallback, verifies that exact commit on an approved public deployment, and closes the remaining human, video, and submission evidence. Canonical scope and finish authority remain in `docs/PRD.md`, `docs/EXECUTION_GOAL.md`, and `docs/ROADMAP.md`; this roadmap is the GSD execution and traceability layer around them.

## Phases

**Phase numbering:** Integer phases are planned milestone work. Any urgent insertion uses a decimal phase and must preserve requirement ownership.

- [x] **Phase 1: Release Integration and Independent Quality Gates** — Integrate one release candidate, install independently visible QA/security gates, self-heal material findings, and bind current documentation to objective evidence.
- [ ] **Phase 01.1: Personalized Learner Accounts, Cloud Progress, and Metrics Dashboard (INSERTED)** — Add a guest-first personal dashboard plus optional Firebase email/password and Google synchronization without making identity or cloud availability a prerequisite.
- [ ] **Phase 2: Credential-Controlled Live OpenAI Proof** — With an explicitly authorized server-only credential, prove current GPT-5.6 and Code Interpreter behavior plus safe fallback recovery.
- [ ] **Phase 3: Approved Public Deployment and Production Verification** — With explicit deployment approval, publish the reviewed commit and verify its security, reliability, and primary workflows in production.
- [ ] **Phase 4: External UAT, Video, and Final Submission** — Validate learner comprehension, repair human-discovered blockers, publish the demo, and complete every external submission artifact.

## Phase Details

### Phase 1: Release Integration and Independent Quality Gates

**Goal:** Produce one stable, reviewable release-candidate SHA with complete GSD traceability, independently named CI gates, separate product/QA/security reviews, repaired material findings, and current evidence documentation.
**Depends on:** Nothing (first phase)
**Requirements:** [DEV-01, DEV-02, DEV-03, CI-01, CI-02, CI-03, CI-04, CI-05, CI-06, QA-01, QA-02, SEC-01, SEC-02, SAFE-01, SAFE-02, DOC-01]
**Success Criteria** (what must be TRUE):
  1. Maintainers can trace every v1 requirement from GSD planning state to the authoritative PRD/execution documents and to commit-specific verification evidence.
  2. Every pull request and `main` push exposes unique green static-analysis, unit/integration, build/security, and browser/accessibility checks; protected-branch requirements match those names and the complete local `npm run quality` gate remains green.
  3. Independent product-completeness, QA/accessibility, and security/adversarial reviews inspect the same SHA, and no accepted blocker/high finding remains unresolved; accepted and rejected findings contain reproducible technical evidence.
  4. The labeled fixture fallback, hidden-answer containment, host-execution prohibition, and deterministic evidence authority still pass regression and adversarial checks after integration.
  5. `docs/BUILD_LOG.md`, `docs/ROADMAP.md`, `docs/THREAT_MODEL.md`, `docs/TESTING.md`, and `docs/COMPLETION_REPORT.md` report current branch/SHA-specific evidence without stale or unsupported completion claims.
**External dependencies:** None. GitHub branch-protection changes require the repository owner's existing administrative access but are already within the authorized repository scope.
**Plans:** 6 plans across 4 waves; complete

### Phase 01.1: Personalized learner accounts, cloud progress, and metrics dashboard (INSERTED)

**Goal:** Deliver an explainable personal-progress dashboard in guest mode and optional verified email/password or Google-authenticated cross-device synchronization through a bounded server-mediated Firestore boundary, while Firebase absence or failure preserves the complete existing local experience.
**Requirements:** [PERS-01, PERS-02, AUTH-01, AUTH-02, AUTH-03, AUTH-04, CLOUD-01, CLOUD-02, PRIV-01, SEC-03, QA-03, DEP-05]
**Depends on:** Phase 1
**Success Criteria** (what must be TRUE):
  1. A guest can complete and review personalized roadmap metrics without Firebase, an account, or an OpenAI credential; the existing fallback and local persistence remain authoritative and green.
  2. A learner may stay guest, use a verified email/password account, or continue with Google; either account path restores the same bounded metrics model across clean browser sessions while every server request verifies identity and no user can access another user's data.
  3. Only deterministic verified assessments complete lessons; cloud writes are strict, idempotent, capped, private, and exclude source, prose, answers, provider data, tokens, credentials, names, and duplicate identity data.
  4. Firebase absence, failure, quota exhaustion, unverified email, verification/reset abuse, provider collision, sign-in cancellation, sign-out, and configuration-off rollback preserve local progress and never block a challenge or report.
  5. Emulator, route, E2E/accessibility, security, build, dependency, fallback, production, and independent review gates pass on one SHA; credentialed Netlify preview remains approval-gated and cloud mode may be disabled without a code rollback.
**External dependency gate:** The credential-free implementation and emulator tests can run without user secrets. Real cross-device proof requires the user to create/configure a Firebase Spark project, email/password provider/policy/action URLs, and Google provider privately. Netlify preview remains a separate explicit deployment approval gate.
**Plans:** 2/6 plans executed

Plans:
- [ ] 01.1-01 — strict progress/history contracts, deterministic metrics, and guest dashboard
- [ ] 01.1-02 — Firebase/runtime/emulator/CI/security-scanner foundation and lazy email/password + Google Auth client
- [ ] 01.1-03 — verified identity DAL, server-only Firestore persistence, progress APIs, and assessment binding
- [ ] 01.1-04 — sync/import/delete/degraded UX, exact CSP, and browser/accessibility hardening
- [ ] 01.1-05 — independent product/QA/security review, self-heal, docs, and exact-SHA offline freeze
- [ ] 01.1-06 — real Firebase and separately approval-gated Netlify preview evidence or cloud-off rollback

### Phase 2: Credential-Controlled Live OpenAI Proof

**Goal:** Demonstrate that the exact reviewed release candidate works with the current GPT-5.6 Responses API and OpenAI Code Interpreter while deterministic gates and the real fixture fallback remain authoritative.
**Depends on:** Phase 01.1 for final live proof; Plans 01–05 already produced reusable offline tooling on the Phase 1 baseline
**Requirements:** [LIVE-01, LIVE-02, LIVE-03, LIVE-04]
**Success Criteria** (what must be TRUE):
  1. With an authorized server-only key, Expense Approval receives a strict schema-valid, semantically approved, allowlisted GPT-5.6 mutation contract.
  2. Code Interpreter records original-pass, intended mutated-fail/signature-match, and repaired-pass evidence without learner Python executing on the application host.
  3. Live hints and assessment satisfy their strict schemas, do not reveal a completed repair, and cannot verify non-passing deterministic evidence.
  4. Missing key, malformed provider output, timeout, expiration, and provider failure still recover to a visibly labeled real fixture challenge, with sanitized evidence bound to the tested SHA.
**External dependency gate:** Requires the user to explicitly configure/authorize use of a valid server-only `OPENAI_API_KEY`. If absent, only this phase's live proof remains blocked; the fallback and all offline gates stay usable.
**Plans:** 6 plans across 4 waves; 5 complete, Plan 06 credential-gated

### Phase 3: Approved Public Deployment and Production Verification

**Goal:** Publish the reviewed commit at a stable public URL and prove the production environment preserves FaultSmith's access, secret, abuse-control, security-header, fallback, live, and recording-layout requirements.
**Depends on:** Phase 2
**Requirements:** [DEP-01, DEP-02, DEP-03, DEP-04]
**Success Criteria** (what must be TRUE):
  1. An unauthenticated judge can open the exact reviewed commit at a stable public HTTPS URL and reach its public health endpoint.
  2. Production keeps `OPENAI_API_KEY` server-only, preserves the 30-second route/20-second Code Interpreter timeout ordering, and applies provider/edge abuse controls in addition to the application limiter.
  3. Security headers, cache behavior, fixture fallback, live path, Expense Approval, the guided roadmap, report refresh, and 1440×900/390×844 layouts pass sanitized production smoke checks.
  4. The tested commit SHA, public URL, environment, timestamp, rate-control configuration, and smoke evidence are recorded without credentials or provider internals.
**External dependency gate:** Requires explicit user approval for deployment plus access to the selected hosting account and its environment configuration. No public deployment is performed implicitly.
**Plans:** TBD during phase planning

### Phase 4: External UAT, Video, and Final Submission

**Goal:** Establish human comprehension and usability evidence, publish an accurate under-three-minute demonstration, and verify every application, repository, video, attribution, and submission link as an unauthenticated judge.
**Depends on:** Phase 3
**Requirements:** [UAT-01, UAT-02, SUB-01, SUB-02, SUB-03]
**Success Criteria** (what must be TRUE):
  1. Five external testers complete the scripted experience and at least four understand FaultSmith's purpose without additional explanation.
  2. Every reproduced blocker/high tester finding is repaired, receives regression coverage where automatable, and is retested before recording.
  3. A public, clear, accurately narrated video under three minutes demonstrates only consistently verified behavior and distinguishes live execution from prevalidated fixture evidence.
  4. All submission placeholders are replaced, the primary Codex `/feedback` Session ID is recorded, and the public application, repository, video, attribution, license, and judging links pass an unauthenticated final audit and remain available through judging.
**External dependency gate:** Requires five external testers, the user's video recording/publication participation, and the primary Codex `/feedback` Session ID. Competition-form ownership decisions remain with the user.
**Plans:** TBD during phase planning

## Requirement Coverage

| Phase | Requirements | Count |
|-------|--------------|------:|
| 1. Release Integration and Independent Quality Gates | DEV-01–03, CI-01–06, QA-01–02, SEC-01–02, SAFE-01–02, DOC-01 | 16 |
| 01.1 Personalized Learner Accounts, Cloud Progress, and Metrics Dashboard | 2/6 | In Progress|  | 2. Credential-Controlled Live OpenAI Proof | LIVE-01–04 | 4 |
| 3. Approved Public Deployment and Production Verification | DEP-01–04 | 4 |
| 4. External UAT, Video, and Final Submission | UAT-01–02, SUB-01–03 | 5 |
| **Total** | **Every v1 requirement mapped exactly once** | **41** |

## Progress

**Execution order:** Phase 1 → Phase 01.1 → finish Phase 2 live proof → Phase 3 → Phase 4. Phase 2 Plans 01–05 are reusable completed preparation; its final paid proof must run on the post-01.1 candidate. Tester recruitment and recording preparation may begin early, but Phase 4 evidence must use the stable production candidate from Phase 3. Any blocker/high repair returns through its affected gates and independent recheck before downstream evidence is accepted.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Release Integration and Independent Quality Gates | 6/6 | Complete | 2026-07-18 |
| 01.1 Personalized Learner Accounts, Cloud Progress, and Metrics Dashboard | 0/6 | Planned — ready for execution | - |
| 2. Credential-Controlled Live OpenAI Proof | 5/6 | Offline checkpoint complete — credential gate | - |
| 3. Approved Public Deployment and Production Verification | 0/TBD | Not started — approval gate | - |
| 4. External UAT, Video, and Final Submission | 0/TBD | Not started — external evidence | - |

---
*Roadmap created: July 18, 2026; expanded July 19, 2026 to 41 v1 requirements*
*Canonical authority: `docs/PRD.md`, `docs/EXECUTION_GOAL.md`, and `docs/ROADMAP.md`*
