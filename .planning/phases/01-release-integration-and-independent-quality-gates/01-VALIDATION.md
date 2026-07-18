---
phase: 1
slug: release-integration-and-independent-quality-gates
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-18
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4, Playwright 1.61, axe, Next.js 16 build/start, GitHub Actions/API |
| **Config files** | `vitest.config.mts`, `playwright.config.ts`, `.github/workflows/ci.yml` |
| **Quick run command** | `npm run lint && npm run typecheck && npm test` |
| **Full suite command** | `npm run quality && npm audit --audit-level=moderate` |
| **Estimated runtime** | quick ~20 seconds; full ~1–2 minutes locally |

---

## Sampling Rate

- **After every implementation task commit:** Run the narrow owned command, then `npm run lint && npm run typecheck && npm test` when source/config changed.
- **After every review wave:** Run `git diff --check`; confirm every report names the frozen SHA and has structured findings.
- **After remediation wave:** Run `npm run quality && npm audit --audit-level=moderate` plus source/history safety scans and production smoke.
- **Before `$gsd-verify-work`:** Full local suite, manual desktop/mobile browser review, four remote CI jobs, and branch-protection readback must be green.
- **Max automated feedback latency:** 120 seconds locally; remote GitHub Actions is recorded separately.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | CI-01–04 | workflow/static | `npm run lint && npm run typecheck && npm test && npm run build && npm run security:bundle && npm run test:e2e` | ✅ | ⬜ pending |
| 01-01-02 | 01 | 1 | CI-03, SEC-02, SAFE-02 | security scan | source/history scan success plus controlled false-positive/failure exercise | ✅ existing git/tooling | ⬜ pending |
| 01-01-03 | 01 | 1 | CI-05, SAFE-01 | regression | `npm run quality && npm audit --audit-level=moderate` | ✅ | ⬜ pending |
| 01-02-01 | 02 | 2 | DEV-02–03, QA-01 | review artifact | `git diff --check && test -s <product-review-file>` | ❌ W2 output | ⬜ pending |
| 01-03-01 | 03 | 2 | DEV-02–03, QA-02 | review + browser | `npm run test:e2e` | ❌ W2 output | ⬜ pending |
| 01-04-01 | 04 | 2 | DEV-02–03, SEC-01–02 | adversarial review | `npm test && npm audit --audit-level=moderate && npm run security:bundle` | ❌ W2 output | ⬜ pending |
| 01-05-01 | 05 | 3 | QA-01–02, SEC-01 | regression | narrow test named by each accepted finding | ❌ only if finding | ⬜ pending |
| 01-05-02 | 05 | 3 | DEV-03, SAFE-01–02 | downstream gate | `npm run quality && npm audit --audit-level=moderate` | ✅ | ⬜ pending |
| 01-06-01 | 06 | 4 | DEV-01, DOC-01 | docs/evidence | `git diff --check` plus stale-claim/link searches | ✅ | ⬜ pending |
| 01-06-02 | 06 | 4 | CI-01–06 | remote CI/protection | `gh pr checks 13` and GitHub branch-protection API readback | ✅ external repo | ⬜ pending |
| 01-06-03 | 06 | 4 | QA/SEC/SAFE | production/manual | build/start/curl smoke plus browser desktop/mobile review | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing Vitest, Playwright/axe, production build/start, bundle scan, git, GitHub CLI, and repository tests cover all phase requirements. Review artifacts are outputs of Wave 2, not missing test infrastructure.

- [x] Vitest and route/workflow fixtures exist.
- [x] Playwright Chromium/axe workflows exist.
- [x] Production build, bundle scan, audit, curl smoke, and GitHub API access exist.
- [x] No new framework or runtime dependency is needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Focus visibility, contrast, and recording composition | QA-02 | Automated axe cannot fully judge visual quality | Use in-app browser at 1440×900 and 390×844; keyboard through all primary/guided controls, inspect focus/contrast/overflow and runtime console |
| Fixture/live evidence wording is understandable | QA-01, SAFE-01 | Requires semantic comprehension review | Complete the primary fallback workflow and confirm workspace/report never imply fresh Python execution |
| Independent review integrity | DEV-02–03 | Agent/report provenance and SHA binding are process evidence | Confirm all three reports name the same Wave 1 SHA, separate findings by severity, and did not modify owned product files |
| Protected-branch transition | CI-06 | GitHub external state | Observe four green checks, update contexts once, re-read strict protection and PR mergeability |

---

## Validation Sign-Off

- [x] All planned tasks have automated verification or an explicit review/manual output.
- [x] Sampling continuity: no three consecutive tasks lack automated checks.
- [x] Wave 0 covers all infrastructure references.
- [x] No watch-mode flags are used.
- [x] Local feedback latency target is under 120 seconds.
- [x] `nyquist_compliant: true` is set in frontmatter.

**Approval:** approved for planning July 18, 2026
