---
phase: 01-release-integration-and-independent-quality-gates
plan: 01
subsystem: ci-security
tags: [github-actions, secret-scan, git-history, vitest, playwright]
requires: []
provides:
  - Four independent GitHub Actions quality/security check candidates
  - Non-disclosing working-tree and reachable-history security scanner
  - Immutable implementation SHA for independent Wave 2 reviews
affects: [phase-1-reviews, branch-protection, testing, threat-model]
tech-stack:
  added: []
  patterns: [parallel named CI jobs, identifier-only security findings, frozen review SHA]
key-files:
  created:
    - scripts/check-source-security.mjs
    - scripts/check-source-security.test.mjs
    - .planning/phases/01-release-integration-and-independent-quality-gates/01-01-BASELINE.md
  modified:
    - package.json
    - .github/workflows/ci.yml
key-decisions:
  - "Scan reachable history without echoing matching values; the only allowlist is the exact deliberate redaction fixture."
  - "Freeze Wave 2 reviews to implementation SHA 506dae9, not moving branch HEAD."
patterns-established:
  - "CI visibility: static, unit/integration, build/security, and browser/accessibility are unique independent jobs."
  - "Security evidence prints commit/file/line/rule identifiers only."
requirements-completed: []
duration: 8 min
completed: 2026-07-18
---

# Phase 1 Plan 01: CI and Source-Security Gates Summary

**Four independently visible CI gates plus a tested, non-disclosing source/history scanner, frozen at implementation SHA `506dae9` for parallel review**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-18T18:40:00Z
- **Completed:** 2026-07-18T18:48:30Z
- **Tasks:** 4
- **Files modified:** 5

## Accomplishments

- Added five focused scanner regressions and a repository gate that inspected 97 current files plus 17 reachable commits without exposing matching values.
- Split the monolithic workflow into four unique independent jobs while preserving offline/mocked tests and the existing local aggregate command.
- Passed 45 Vitest tests, production build, 17-artifact bundle scan, six Playwright workflows in 5.9 seconds, zero-vulnerability audit, and the new source/history gate.
- Captured immutable implementation SHA `506dae90ce3832f4096f5f95a52c996c5335f9f1` for all Wave 2 reviews.

## Task Commits

1. **Task 1: Add deterministic repository source/history security scan** — `51244b8`
2. **Task 2: Split GitHub Actions into four parallel required-check candidates** — `506dae9`
3. **Task 3: Prove aggregate quality and fallback invariants** — verification-only; evidence captured in baseline
4. **Task 4: Freeze the Wave 1 implementation SHA** — `248e996`

## Files Created/Modified

- `scripts/check-source-security.mjs` — current/history credential scan plus application host-execution/public-secret guard.
- `scripts/check-source-security.test.mjs` — behavioral regressions and exact fixture allowlist.
- `package.json` — local `security:source` command.
- `.github/workflows/ci.yml` — four parallel named jobs.
- `01-01-BASELINE.md` — frozen Wave 1 SHA and validation evidence.

## Decisions Made

- Used existing Node/git tooling rather than adding a scanning dependency.
- Restricted host-process detection to non-test `src/` code so tooling can invoke git without weakening the learner-code boundary.
- Made history findings identifier-only to avoid leaking a discovered secret into Actions logs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Scanner initially detected its own deliberate allowlist literal**
- **Found during:** Task 1
- **Issue:** The exact fake key was present as a contiguous scanner-source string and correctly triggered the working-tree rule.
- **Fix:** Constructed the allowlisted value from separate non-secret fragments while retaining exact-value comparison.
- **Files modified:** `scripts/check-source-security.mjs`
- **Verification:** focused tests and full working-tree/history scan pass.
- **Committed in:** `51244b8`

**2. [Rule 3 - Blocking] Delegated executor did not reach a tool action**
- **Found during:** Wave 1 orchestration
- **Issue:** The spawned executor remained active without producing an edit or command result.
- **Fix:** Coordinator stopped the inactive stream and executed the independently verified plan as the sole workspace writer.
- **Files modified:** none from the stalled agent.
- **Verification:** all task commits and full gates above exist.

**Total deviations:** 2 auto-fixed (1 bug, 1 orchestration blocker).  
**Impact on plan:** No product scope or authority changed; all planned outcomes and checks were delivered.

## Issues Encountered

None remain. One focused test exposed an incomplete `execFile` detection pattern and was corrected before the scanner was trusted.

## User Setup Required

None. Normal CI does not use `OPENAI_API_KEY`.

## Next Phase Readiness

- Plans 01-02, 01-03, and 01-04 can inspect the exact frozen SHA in isolated worktrees.
- Branch protection must remain on `Quality gate` until the new four remote checks have appeared and passed later in Plan 06.

## Self-Check: PASSED

- Created files exist.
- Task commits `51244b8`, `506dae9`, and `248e996` resolve.
- Full local quality/security evidence is green.

---
*Phase: 01-release-integration-and-independent-quality-gates*  
*Completed: 2026-07-18*
