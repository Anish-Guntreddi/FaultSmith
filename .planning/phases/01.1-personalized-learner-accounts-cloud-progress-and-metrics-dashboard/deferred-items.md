## Observed during 01.1-02 execution (2026-07-19)

- `npm run typecheck` currently fails in `src/lib/progress-contracts.test.ts` (4 enum-literal errors) and `npm run lint` warns about unused `MAX_STORED_ATTEMPTS`. Both originate from Plan 01.1-01's in-flight uncommitted work in `src/lib/` (disjoint parallel Wave 1 plan). Out of scope for 01.1-02; Plan 01's executor owns resolution before its own verify gate.

## Observed during 01.1-03 execution (2026-07-19)

- `npm run lint` reports one pre-existing warning: `'passwordBoundaryRules' is defined but never used` in `scripts/check-source-security.test.mjs:12` (introduced by Plan 01.1-02's committed work). Non-blocking (lint exits 0); not touched by 01.1-03 whose files are disjoint. Candidate cleanup for Plan 01.1-05 hardening.
