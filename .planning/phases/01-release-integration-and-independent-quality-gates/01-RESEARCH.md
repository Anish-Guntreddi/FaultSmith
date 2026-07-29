# Phase 1 Research: Release Integration and Independent Quality Gates

**Phase:** 1  
**Researched:** July 18, 2026  
**Requirements:** DEV-01–03, CI-01–06, QA-01–02, SEC-01–02, SAFE-01–02, DOC-01  
**Confidence:** HIGH for local architecture and CI design; MEDIUM until new GitHub checks and branch protection are observed remotely

## Planning Conclusion

Phase 1 should be six plans in four waves. First split CI and add targeted repository safety checks. Then freeze that committed SHA and run three independent read-heavy reviews in parallel: product completeness, QA/accessibility, and security/adversarial. The coordinator reproduces and repairs accepted findings in one integration plan, adds regressions, and reruns affected gates. Finally, update canonical evidence, run the entire local/production/manual gate, push the branch, observe the four GitHub checks, and atomically replace the old protected-branch `Quality gate` context only after the new names are green.

Do not merge feature breadth into this phase. The current product already has the complete learner-facing MVP: three projects/nine fixtures, guided roadmap, advanced catalog, live-capable server adapter, deterministic authority, persistence, recovery states, reports, and submission docs. The remaining local work is independent proof and orchestration. Credentialed live behavior, deployment, testers, and video stay transparently gated in later phases.

## Current Evidence Baseline

- Branch: `agent/guided-learning-mvp`; product commit `af0e03b`; GSD initialization follows in atomic commits.
- Local aggregate: `npm run quality` → lint, typecheck, 40 Vitest tests, Next.js production build, 17-artifact bundle leakage scan, six Playwright workflows.
- Separate local audit: `npm audit --audit-level=moderate` → zero moderate-or-higher vulnerabilities at the last checkpoint.
- Browser evidence: primary direct catalog, guided success/failure, keyboard/axe, secondary projects, and 390×844 layout.
- Production smoke: root, health, headers, fallback generate/hint/execute/assess and all nine project-skill combinations documented in `docs/TESTING.md`.
- GitHub branch protection currently requires one strict check named `Quality gate`; conversation resolution and linear history are enabled, force pushes/deletions disabled.
- Draft PR #13 is the integration vehicle; its current remote CI uses the old single job.

## Recommended Plan and Wave Structure

| Plan | Wave | Owner | Scope | Requirements |
|------|------|-------|-------|--------------|
| 01-01 CI and source-security gates | 1 | Coordinator/implementation agent | `.github/workflows/ci.yml`, optional package scripts/security scan support, focused validation | CI-01–05, SEC-02, SAFE-01–02 |
| 01-02 Product-completeness review | 2 | Independent product reviewer | Read-only product/runtime/doc audit; writes its own review artifact | DEV-02–03, QA-01, SAFE-01–02 |
| 01-03 QA/accessibility review | 2 | Independent QA reviewer | Automated/manual UX, persistence, responsive, accessibility and failure-state audit | DEV-02–03, QA-02, SAFE-01 |
| 01-04 Security/adversarial review | 2 | Independent security reviewer | Trust-boundary, leakage, authority, input, output, secret/history, dependency audit | DEV-02–03, SEC-01–02, SAFE-02 |
| 01-05 Finding remediation and regressions | 3 | Coordinator | Reproduce, accept/reject technically, implement minimal fixes, add regressions, rerun downstream gates | DEV-03, QA-01–02, SEC-01–02, SAFE-01–02 |
| 01-06 Evidence, publication, and protected checks | 4 | Coordinator | Canonical docs, full validation/manual review, push/PR checks, branch protection transition | DEV-01–03, CI-05–06, QA-01–02, SEC-01–02, SAFE-01–02, DOC-01 |

Plans 01-02 through 01-04 must inspect the same committed Wave 1 SHA and must not edit shared application/canonical documentation. They write separate phase review files only. Plan 01-05 consumes all three reports and owns application/test changes. Plan 01-06 consumes the remediated SHA and owns canonical documentation plus GitHub evidence.

## CI Design

Keep one `.github/workflows/ci.yml` workflow with the existing triggers, read-only contents permission, cancellation concurrency, Node 24, npm cache, and pinned major action refs. Replace the single job with four jobs that have no `needs` dependency so GitHub schedules them in parallel.

### Static analysis

- Unique display name: `Static analysis`.
- Steps: checkout, Node/npm cache, `npm ci`, `npm run lint`, `npm run typecheck`.
- No browser installation, build, or network credential.

### Unit and integration

- Unique display name: `Unit and integration`.
- Steps: checkout, Node/npm cache, `npm ci`, `npm test`.
- Must continue to use injected gateways/missing-key paths so it makes no live OpenAI request.

### Build and security

- Unique display name: `Build and security`.
- Checkout should use `fetch-depth: 0` so reachable-history checks are meaningful.
- Steps: Node/npm cache, `npm ci`, `npm run build`, `npm run security:bundle`, `npm audit --audit-level=moderate`, host-execution scan, secret/history scan.
- Do not add a runtime dependency for scanning. `git` is available after checkout and can scan tracked source/history. Exclude only deliberate fake-token fixtures and documentation that contains regex examples; list those exclusions explicitly.
- The host-execution scan targets application source, not prose or tooling, and fails on `child_process`, `execFile`, `execSync`, `spawnSync`, `spawn(`, or `exec(` outside tests. A finding is a hard failure because learner Python may run only in Code Interpreter.
- The history scan must output commit/file identifiers, not matching credential contents, to avoid re-exposing a discovered secret in logs. A real match blocks publication and requires credential rotation/history response.

### Browser and accessibility

- Unique display name: `Browser and accessibility`.
- Steps: checkout, Node/npm cache, `npm ci`, `npx playwright install --with-deps chromium`, `npm run test:e2e`.
- `playwright.config.ts` already starts the app and enforces CI retries/workers/forbid-only.

### Local source of truth

Do not change the semantics of `npm run quality`; it remains the full sequential local gate. CI may call the underlying scripts in separate jobs. Add a dedicated `security:source` package script only if it provides the same deterministic scan locally and in CI without using an unavailable tool. Prefer a small ESM filesystem scanner if cross-platform local reproducibility matters; if using `git grep` directly in Actions, document the exact equivalent local commands.

## Branch Protection Transition

The protected `main` branch currently requires strict `Quality gate`. Replacing this context before a pushed run produces the four new checks can block merging or temporarily weaken protection.

Safe sequence:

1. Commit all local Phase 1 implementation and evidence changes on the feature branch.
2. Push; wait for `Static analysis`, `Unit and integration`, `Build and security`, and `Browser and accessibility` to appear and pass on the PR SHA.
3. Read branch-protection state and the exact check contexts/app IDs.
4. Update required status checks in one API call with strict mode and all four unique check names, preserving the existing Actions app association when supported.
5. Re-read protection and confirm `Quality gate` is absent only after the four replacements are present.
6. Confirm PR mergeability/check rollup remains green. Record run URL, SHA, and protection evidence.

Do not merge the draft PR without the user's explicit merge decision; Phase 1 can make it ready and protected.

## Independent Review Contracts

Every review artifact should contain:

- Reviewed branch and exact SHA.
- Scope/files/commands inspected.
- Finding table: ID, severity, affected files, reproducible failure or exploit path, impact, mitigation, evidence.
- Explicit “no blocker/high” conclusion only after findings are enumerated.
- Informational/accepted residuals separated from defects.
- No implementation changes by the reviewer.

### Product reviewer

Trace locked PRD, guided amendment, roadmap, completion report, UI stages, fixtures, and browser tests. Focus on whether a beginner receives structured evidence-first learning while advanced catalog versatility remains; whether any feature is fake/misleading; whether direct and guided modes reach a report; whether fixture/live wording is accurate; and whether the demo tells a defensible educational story.

### QA/accessibility reviewer

Run or inspect lint/type/unit/build/E2E evidence, then manually test the app in the in-app browser at 1440×900 and 390×844. Cover keyboard-only navigation, visible focus, labels/landmarks/live regions, axe, contrast, reduced motion, refresh/report restoration, reset/new-lab state, failed guided progress, rapid/duplicate clicks, retry/error states, overflow, and console/runtime errors.

### Security reviewer

Audit browser → route → workflow → fixture/provider trust boundaries. Attempt strict-schema bypass, arbitrary path/file/command/container ID, oversized body/text/output, prompt injection, hint/reference leakage, public DTO/import/storage/bundle leakage, failing-prose promotion, fallback deception, rate-key churn, raw error/provider detail exposure, host subprocess, secret/history leakage, and dependency vulnerabilities. Review accepted per-process rate-limit and inline-CSP residuals as medium/low unless deployment context elevates them.

## Remediation Rules

- Coordinator reproduces each blocker/high finding before accepting it.
- Fix the smallest cohesive boundary, add a regression at the narrowest useful level, run the failed check, then every downstream affected gate.
- If a finding is invalid, record the reproduction attempt and technical rejection; do not silently delete it.
- Medium/low issues may be fixed if low-risk; otherwise document owner, rationale, residual impact, and later phase/post-MVP action.
- Any hidden-answer, credential, host-execution, deterministic-authority, or fallback break is automatically blocker/high and must close before publication.
- Do not modify OpenAI integration parameters during Phase 1 unless a local defect is reproduced; current live compatibility belongs to Phase 2 and requires official OpenAI docs plus a credentialed smoke.

## Documentation Targets

- `docs/BUILD_LOG.md`: GSD initialization, CI split, audit SHAs/findings, repairs/regressions, commands/results, GitHub run/protection evidence.
- `docs/ROADMAP.md`: Phase 1 milestone complete/pending accurately; later external gates unchanged; current risks/direction review.
- `docs/THREAT_MODEL.md`: remove stale “not a git repository” statement; record current working-tree and reachable-history scans; preserve residual rate-limit/CSP analysis.
- `docs/TESTING.md`: list four CI gates and security source/history commands; update counts/timings only from actual final runs.
- `docs/COMPLETION_REPORT.md`: bind statuses to the final reviewed SHA/PR run; keep live/deploy/UAT/video/Session ID qualified.

## Validation Architecture

### Existing Test Infrastructure

| Layer | Command | Expected feedback |
|-------|---------|-------------------|
| Static | `npm run lint && npm run typecheck` | ~5–15 seconds |
| Unit/integration | `npm test` | ~1–5 seconds; 40-test baseline |
| Build/leakage/audit | `npm run build && npm run security:bundle && npm audit --audit-level=moderate` | ~15–45 seconds |
| Browser/accessibility | `npm run test:e2e` | ~5–20 seconds after browser setup |
| Full local | `npm run quality && npm audit --audit-level=moderate` | ~1–2 minutes |

### Sampling Policy

- After CI workflow edits: parse/review YAML, run each underlying package command locally, and confirm `npm run quality` semantics are unchanged.
- After every accepted code/security repair: run the narrow relevant unit/route/browser regression first.
- After Wave 3: run `npm run quality`, audit, source/history secret checks, and production startup/header/API smoke.
- Before Phase 1 sign-off: repeat the in-app manual browser review at 1440×900 and 390×844 and inspect runtime/console output.
- After push: require four green GitHub check contexts for the same final SHA and re-read branch protection.

### Requirement-to-Evidence Map

| Requirement group | Automated evidence | Manual/external evidence |
|-------------------|--------------------|--------------------------|
| DEV-01–03 | Planning/traceability parsers; review artifact presence; `git diff --check` | Review reports bound to one SHA; accepted/rejected finding review |
| CI-01–05 | Local underlying commands; workflow syntax/review; GitHub check rollup | Four unique green job names on final SHA |
| CI-06 | GitHub API read after update | Protection has strict four-context replacement and PR remains mergeable |
| QA-01–02 | Vitest/Playwright/axe/full quality | Independent product/QA reports and desktop/mobile browser inspection |
| SEC-01–02 | Adversarial suite, audit, source/history scans, bundle scan | Independent security report and residual-risk classification |
| SAFE-01–02 | Missing-key/failure E2E, DTO/import/storage/bundle, command/allowlist/authority tests | Workspace/report fixture disclosure inspected manually |
| DOC-01 | Link/path/search checks; `git diff --check` | Canonical docs compared against final commands/SHA and unsupported claims removed |

### Wave 0

No new test framework is required. Existing Vitest, Playwright, axe, production build, bundle scan, and GitHub CLI/API cover Phase 1. If the CI source/history scan becomes a repository script, add a deterministic fixture/self-test or exercise both success and deliberate-failure cases in a temporary copy before trusting it as a gate.

### Reviewer SHA Binding

Wave 1 ends in a commit. Record `git rev-parse HEAD` before spawning Wave 2 reviewers and include it in every prompt/report. If any reviewer sees a different SHA or a dirty tree, its report is not sign-off evidence. Wave 3 changes necessarily invalidate the Wave 2 SHA; final sign-off therefore requires the coordinator to map every finding to the remediated final SHA and, for blocker/high fixes, request an independent focused recheck or demonstrate the added regression plus original reviewer acceptance criteria.

### Manual-Only Evidence

- Visual contrast/focus quality beyond automated axe heuristics.
- Responsive layout and recording composition at exact viewports.
- Whether fixture/live labels are understandable and non-misleading.
- GitHub branch-protection transition and PR check presentation.

## Top Planning Risks

1. **Stale protected check context:** update only after new jobs are observed green.
2. **Review SHA drift:** freeze/record Wave 1 SHA; dirty-tree reviews do not count.
3. **Secret scan log exposure:** print identifiers, never credential contents.
4. **False-positive host scan:** scope to application source and explicitly classify tests/tooling.
5. **Scope creep during remediation:** only reproduced Phase 1 defects; keep custom/runtime breadth deferred.
6. **Self-certification:** reviewers report; coordinator repairs; blocker/high fixes receive independent focused recheck.

---
*Research complete: July 18, 2026*  
*Ready for Phase 1 planning: yes*
