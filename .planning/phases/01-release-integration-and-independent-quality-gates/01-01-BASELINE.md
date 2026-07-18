# Wave 1 Independent-Review Baseline

**Implementation SHA:** `506dae90ce3832f4096f5f95a52c996c5335f9f1`  
**Branch:** `agent/guided-learning-mvp`  
**Captured:** 2026-07-18T18:48:30Z  
**Working tree at capture:** Clean

## Included outcomes

- `scripts/check-source-security.mjs` scans working-tree text and reachable Git history for credential/private-key shapes without printing matching values.
- The source gate rejects application-host process execution and public OpenAI secret variables in non-test runtime code.
- `scripts/check-source-security.test.mjs` covers secret detection/non-disclosure, the exact deliberate redaction fixture allowlist, host-execution detection, public-secret variables, and stateless regex behavior.
- `.github/workflows/ci.yml` exposes four independent jobs: `Static analysis`, `Unit and integration`, `Build and security`, and `Browser and accessibility`.

## Validation at capture

| Gate | Result |
|------|--------|
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm test` | Passed — 7 files, 45 tests |
| `npm run build` | Passed — 7 routes |
| `npm run security:bundle` | Passed — 17 artifacts |
| `npm run test:e2e` | Passed — 6 tests in 5.9 seconds |
| `npm audit --audit-level=moderate` | Passed — 0 vulnerabilities |
| `npm run security:source` | Passed — 97 working-tree files and 17 reachable commits |

## Reviewer contract

Plans 01-02, 01-03, and 01-04 must review the exact implementation SHA above, not the later commit containing this manifest or any sibling review commit. Each reviewer must create a unique detached temporary Git worktree at the implementation SHA, install dependencies in that worktree before running commands, write only its owned report in the main repository, stop worktree-local processes, and remove only its own temporary worktree.

The implementation SHA is immutable review evidence. A dirty tree or a report that names current `HEAD` instead of this value is not accepted as independent sign-off.
