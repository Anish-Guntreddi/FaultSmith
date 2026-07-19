---
phase: 2
slug: credential-controlled-live-openai-proof
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-18
---

# Phase 2 — Validation Strategy

> Offline-first validation contract for live and release-readiness tooling.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4, Node in-process HTTP server, Playwright 1.61, Next.js production server |
| **Config file** | `vitest.config.mts`, `playwright.config.ts` |
| **Quick run command** | `npm run security:source && npm test && npm run lint && npm run typecheck` |
| **Full suite command** | `npm run security:source && npm run quality && npm audit --audit-level=moderate` |
| **Estimated runtime** | quick under 10 seconds; full under 2 minutes locally |

## Sampling Rate

- **After every implementation task commit:** run the focused new test file, then the quick command.
- **After every plan wave:** run the quick command and any new offline smoke/validator command.
- **Before the credential checkpoint:** the full suite, production fallback smoke, documentation claim audit, and independent QA/security review must be green.
- **After eventual live proof:** rerun the full suite and inspect the safe evidence artifact before marking LIVE requirements complete.
- **Max automated feedback latency:** 120 seconds locally; real provider runtime is recorded separately.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | LIVE-01–04 | unit | live-smoke core focused Vitest | ❌ W1 output | ⬜ pending |
| 02-01-02 | 01 | 1 | LIVE-01–04 | fake HTTP integration | full live/fallback/adversarial fake-server Vitest | ❌ W1 output | ⬜ pending |
| 02-02-01 | 02 | 1 | DEP/SUB preparation | unit/schema | UAT/submission readiness focused Vitest | ❌ W1 output | ⬜ pending |
| 02-03-01 | 03 | 2 | LIVE-01–04 | CLI integration | offline smoke plus fake live CLI process/entry tests | ❌ W2 output | ⬜ pending |
| 02-04-01 | 04 | 2 | DEP preparation | production smoke | build/start and credential-free production smoke | ❌ W2 output | ⬜ pending |
| 02-05-01 | 05 | 3 | LIVE-04, SAFE-01–02 | regression/full gate | `npm run security:source && npm run quality && npm audit --audit-level=moderate` | ✅ | ⬜ pending |
| 02-05-02 | 05 | 3 | documentation | claims/source | product claim tests and placeholder/readiness audit | ✅ partial | ⬜ pending |
| 02-06-01 | 06 | checkpoint | LIVE-01–04 | real provider | explicit live smoke on reviewed production SHA | ❌ credential gate | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

## Wave 0 Requirements

Existing Vitest, Node, route/workflow mocks, Playwright, production build/start, source/history scan, bundle scan, audit, GitHub Actions, and curl/browser infrastructure cover the phase. New harness tests are deliverables, not missing framework setup.

- [x] No new test framework or runtime dependency required.
- [x] Fake HTTP behavior can use Node built-ins.
- [x] Normal CI can remain credential-free.
- [x] Production route and browser regression suites already exist.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Actual GPT-5.6 exact contract | LIVE-01 | provider behavior cannot be established by mocks | configure key privately, start reviewed production SHA, run explicit live CLI, inspect safe evidence |
| Actual Code Interpreter lifecycle | LIVE-02 | hosted sandbox behavior requires a real provider call | confirm failing/passing Code Interpreter modes and no fallback/provider identifiers in evidence |
| Actual live hint/scores | LIVE-03 | model conformance requires live output | require live source labels and deterministic failing-patch authority |
| Public host edge/CSP controls | DEP-02–03 | selected host and approval do not exist yet | Phase 3 deployment readback and remote smoke |
| Tester comprehension/video quality | UAT/SUB | human/external evidence | Phase 4 protocol and recording review |

## Validation Sign-Off

- [x] All offline tasks have automated verification or are explicit Wave outputs.
- [x] Sampling continuity: no three consecutive tasks lack automated checks.
- [x] Wave 0 covers all infrastructure references.
- [x] No watch-mode flags are used.
- [x] Local feedback target is under 120 seconds.
- [x] `nyquist_compliant: true` is set.

**Approval:** approved for offline-first planning July 18, 2026; live evidence remains credential-gated
