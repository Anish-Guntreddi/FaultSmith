# Requirements: FaultSmith Submission Completion

**Defined:** July 18, 2026  
**Core Value:** Learners must practice reading real failure evidence, reasoning about root causes, and proving minimal repairs instead of receiving an answer that bypasses the debugging process.

## v1 Requirements

Requirements for the current release/submission milestone. Existing learner-facing capabilities are recorded as validated in `.planning/PROJECT.md`; these requirements cover the remaining engineering proof and external release evidence.

### Development Orchestration

- [x] **DEV-01**: Maintainers can use a tracked GSD brownfield map, project context, requirements, roadmap, state, and phase plans that link to—not replace—the canonical PRD and execution documents.
- [x] **DEV-02**: The coordinator can run independent product, QA/accessibility, and security/adversarial review streams with non-overlapping ownership and consolidate their evidence against one commit SHA.
- [x] **DEV-03**: Every accepted material review finding records severity, affected surface, reproducible failure path, repair, regression coverage, and rerun evidence; rejected findings record a technical rationale.

### Continuous Integration

- [x] **CI-01**: Every pull request and main-branch push runs an independently named static-analysis gate containing lint and TypeScript checks.
- [x] **CI-02**: Every pull request and main-branch push runs an independently named unit/integration gate containing the mocked/offline Vitest suite.
- [x] **CI-03**: Every pull request and main-branch push runs an independently named build/security gate containing the production build, client leakage scan, dependency audit, and targeted repository safety scans.
- [x] **CI-04**: Every pull request and main-branch push runs an independently named browser/accessibility gate containing the Playwright workflows and Chromium/axe setup.
- [x] **CI-05**: The complete local `npm run quality` command remains green and the new CI jobs call the same package scripts rather than implementing divergent checks.
- [x] **CI-06**: Branch protection requires the unique green CI gates after they have successfully run, without leaving `main` unprotected or blocked by a removed check name.

### Quality and Security Evidence

- [x] **QA-01**: Independent product-completeness review finds no unresolved blocker/high defect in the guided roadmap, advanced catalog, primary demo, fallback disclosure, persistence, or report workflow.
- [x] **QA-02**: Independent QA/accessibility review finds no unresolved blocker/high defect and verifies keyboard use, labels, focus, axe, contrast, reduced motion, responsive recording layout, refresh, reset, retry, duplicate action, and failure recovery.
- [x] **SEC-01**: Independent security/adversarial review finds no unresolved blocker/high defect across untrusted inputs, strict schemas, allowlists, hidden-answer containment, model authority, host execution, output sanitation, errors, rate limiting, secrets, dependencies, and bundles.
- [x] **SEC-02**: The current working tree and reachable Git history contain no real credential or private-key material, and all deliberate fake-token/test matches are documented as false positives.
- [x] **SAFE-01**: The validated fixture fallback remains functional, visibly labeled, and covered by missing-key/provider-failure tests after all orchestration, quality, and documentation changes.
- [x] **SAFE-02**: No new client import, response field, browser storage value, bundle string, command input, repository ingestion path, or runtime agent may weaken hidden-answer containment or deterministic test authority.
- [x] **DOC-01**: `docs/BUILD_LOG.md`, `docs/ROADMAP.md`, `docs/THREAT_MODEL.md`, `docs/TESTING.md`, and `docs/COMPLETION_REPORT.md` contain current branch/SHA-specific evidence and no stale pre-GitHub or unsupported completion claim.

### Live OpenAI Verification

- [ ] **LIVE-01**: With an explicitly configured server-only credential, GPT-5.6 returns a strict schema-valid mutation contract that passes the approved semantic equality and allowlist gates for Expense Approval.
- [ ] **LIVE-02**: The current OpenAI Code Interpreter path captures original-pass, mutated-fail with the intended signature, and repaired-pass evidence without executing learner Python on the application host.
- [ ] **LIVE-03**: Live hint and assessment responses satisfy their strict schemas, never reveal a completed repair, and cannot mark non-passing execution evidence as verified.
- [ ] **LIVE-04**: Missing key, invalid provider output, timeout, expiration, or provider failure still recovers to the real visibly labeled fixture path after the credentialed smoke changes.

### Personalized Learning and Cloud Progress

- [x] **PERS-01**: Guest learner can open a My Progress dashboard that derives bounded completion, score, hint, test-run, phase, skill, and recent-attempt metrics from validated local state without Firebase or OpenAI.
- [x] **PERS-02**: Learner receives a transparent deterministic reinforcement or next-lesson recommendation whose displayed reason is derived from verified evidence and never penalizes experimentation or claims certification.
- [x] **AUTH-01**: Learner can continue as a guest, create or log in to an email/password account, or continue with Google; either signed-in method uses the same bounded metrics model, sign-out returns to guest mode, and no core workflow has a login wall.
- [x] **AUTH-02**: Every cloud-progress request verifies a Firebase ID token server-side, derives identity only from the verified UID, rejects invalid/expired/wrong-project/oversized tokens, and never changes unauthenticated challenge-route behavior.
- [x] **AUTH-03**: Firebase owns password storage, policy enforcement, email verification, and password reset; unverified password identities cannot access cloud progress, FaultSmith never persists or logs password material, and account-facing responses resist email enumeration and resend abuse.
- [x] **AUTH-04**: Email/password and Google provider collisions never silently create, merge, overwrite, or delete progress; any optional link requires an authenticated recent session, preserves one Firebase UID, and ships only after emulator and real-provider proof.
- [x] **CLOUD-01**: A verified assessment can idempotently persist one bounded attempt summary and approved lesson completion through a server-only Firestore repository; failing or unsubmitted evidence cannot create completion.
- [x] **CLOUD-02**: Local and cloud progress merge monotonically with explicit evidence provenance, capped history, bounded retries, and a visible local-only fallback when Firebase is absent, degraded, or out of quota.
- [x] **PRIV-01**: Cloud records, logs, DTOs, bundles, and evidence exclude source code, learner prose, hints, hidden answers, raw test output, prompts, provider IDs, passwords, tokens, credentials, names, and duplicated email; learner can delete their cloud learning data.
- [x] **SEC-03**: Cross-user access, client-supplied UID/path authority, direct browser Firestore access, credential leakage, unsafe CSP expansion, unbounded sync, and multi-instance abuse are denied by contracts, token verification, rules, server mediation, scans, and deployment controls.
- [x] **QA-03**: Firebase Auth/Firestore emulator integration, route adversarial coverage, guest/email-password/Google/degraded E2E, accessibility, responsive layout, build, bundle/source security, dependency audit, fallback smoke, and the complete existing quality gate pass on one reviewed SHA.
- [ ] **DEP-05**: After explicit approval, a Netlify Deploy Preview of the reviewed SHA proves guest access, verified email/password sync, Google sync, cross-session restoration, free-tier monitoring, rate controls, safe logs, security headers, and configuration-off rollback before production promotion.

### Public Deployment

- [ ] **DEP-01**: With explicit deployment approval, a judge can open the exact reviewed commit at a stable public HTTPS URL without an account or preview authentication.
- [ ] **DEP-02**: The public deployment keeps `OPENAI_API_KEY` server-only, supports the 30-second route/20-second Code Interpreter timeout ordering, and applies platform/edge abuse controls in addition to the application limiter.
- [ ] **DEP-03**: Public health, security headers, cache behavior, fixture fallback, live path, primary Expense Approval workflow, guided roadmap, report refresh, and 1440×900/390×844 layouts pass production smoke checks.
- [ ] **DEP-04**: The deployed commit SHA, public URL, environment, timestamp, rate-control configuration, and sanitized smoke evidence are recorded without exposing credentials or provider internals.

### External Validation and Submission

- [ ] **UAT-01**: At least five external testers complete the scripted experience and results record whether at least four understand FaultSmith's purpose without extra explanation.
- [ ] **UAT-02**: Every blocker/high usability finding from the tester pass is repaired, regression tested where automatable, and retested before recording.
- [ ] **SUB-01**: The public demonstration video is clear, under three minutes, uses only consistently verified features, accurately distinguishes live from prevalidated evidence, and remains available through judging.
- [ ] **SUB-02**: The final submission replaces every URL/video/result placeholder and includes the primary Codex `/feedback` Session ID corresponding to the task where most core functionality was built.
- [ ] **SUB-03**: The public application, repository, video, submission text, attribution, license, and judging links are rechecked as unauthenticated viewers and remain available through the judging period.

## v2 Requirements

Deferred until the submission milestone is complete and a new requirements/PRD cycle approves the expanded trust model.

### Adaptive Challenge Creation

- **ADAPT-01**: Advanced learner can describe a bounded special-case learning goal and receive a dynamically generated challenge from an approved project/template family.
- **ADAPT-02**: System can create difficulty-adaptive variants based on verified lesson evidence without leaking answers or weakening deterministic validation.
- **ADAPT-03**: Maintainer can add new curated project packs through a documented, lifecycle-tested content contract.

### Product Platform

- **PLAT-02**: Instructor can organize cohorts, assign learning paths, and review aggregated evidence without exposing private code/prose by default.
- **PLAT-03**: FaultSmith can expose stable reusable domain packages after client/server boundaries and versioning are deliberately designed.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Arbitrary public repository upload | Materially expands data handling, prompt-injection, dependency, licensing, and sandbox scope beyond the locked curated MVP |
| Learner-supplied shell commands, packages, container IDs, or unrestricted Python | Conflicts with the server-owned fixed-command/allowlist execution boundary |
| Runtime learner-facing multi-agent swarm | Adds latency and nondeterministic authority; the swarm is approved for development only |
| Automatic paid live calls in normal CI | Creates nondeterminism, credential exposure surface, and uncontrolled spend |
| Unverifiable certification or competitive ranking | Browser-local evidence is practice feedback, not identity-backed certification |
| Mandatory authentication, payments, social features, native mobile apps, or additional languages before submission | Optional email/password and Google sync are narrowly approved; the remaining features do not advance the core evidence-first debugging proof or current judging deliverables |

## Traceability

Each v1 requirement is owned by exactly one roadmap phase. Canonical scope and finish authority remain in `docs/PRD.md`, `docs/EXECUTION_GOAL.md`, and `docs/ROADMAP.md`.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEV-01 | Phase 1 | Complete |
| DEV-02 | Phase 1 | Complete |
| DEV-03 | Phase 1 | Complete |
| CI-01 | Phase 1 | Complete |
| CI-02 | Phase 1 | Complete |
| CI-03 | Phase 1 | Complete |
| CI-04 | Phase 1 | Complete |
| CI-05 | Phase 1 | Complete |
| CI-06 | Phase 1 | Complete |
| QA-01 | Phase 1 | Complete |
| QA-02 | Phase 1 | Complete |
| SEC-01 | Phase 1 | Complete |
| SEC-02 | Phase 1 | Complete |
| SAFE-01 | Phase 1 | Complete |
| SAFE-02 | Phase 1 | Complete |
| DOC-01 | Phase 1 | Complete |
| PERS-01 | Phase 01.1 | Complete |
| PERS-02 | Phase 01.1 | Complete |
| AUTH-01 | Phase 01.1 | Complete |
| AUTH-02 | Phase 01.1 | Complete |
| AUTH-03 | Phase 01.1 | Complete |
| AUTH-04 | Phase 01.1 | Complete |
| CLOUD-01 | Phase 01.1 | Complete |
| CLOUD-02 | Phase 01.1 | Complete |
| PRIV-01 | Phase 01.1 | Complete |
| SEC-03 | Phase 01.1 | Complete |
| QA-03 | Phase 01.1 | Complete |
| DEP-05 | Phase 01.1 | Pending — deployment approval gate |
| LIVE-01 | Phase 2 | Pending — credential gate |
| LIVE-02 | Phase 2 | Pending — credential gate |
| LIVE-03 | Phase 2 | Pending — credential gate |
| LIVE-04 | Phase 2 | Pending — credential gate |
| DEP-01 | Phase 3 | Pending — approval gate |
| DEP-02 | Phase 3 | Pending — approval gate |
| DEP-03 | Phase 3 | Pending — approval gate |
| DEP-04 | Phase 3 | Pending — approval gate |
| UAT-01 | Phase 4 | Pending — external evidence |
| UAT-02 | Phase 4 | Pending — external evidence |
| SUB-01 | Phase 4 | Pending — external evidence |
| SUB-02 | Phase 4 | Pending — external evidence |
| SUB-03 | Phase 4 | Pending — external evidence |

**Coverage:**
- v1 requirements: 41 total
- Mapped to phases: 41
- Unmapped: 0 ✓
- Duplicate phase ownership: 0 ✓

---
*Requirements defined: July 18, 2026*  
*Last updated: July 19, 2026 after the approved personalized-learning insertion*
