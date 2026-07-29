# Plan 01-05 Finding Disposition

**Baseline reviewed:** `506dae90ce3832f4096f5f95a52c996c5335f9f1`  
**Coordinator:** primary GSD execution stream  
**Policy:** every blocker/high is repaired; medium/low residuals require an explicit owner and may not be represented as solved.

## Complete ledger

| Finding | Accepted? | Disposition | Regression / evidence | Final status |
| --- | --- | --- | --- | --- |
| PR-001 (High) | Yes | Guided/demo/submission attribution was inaccurate. Guided narration now states that it makes no model call; live claims say the model emits an exact approved contract and bounded scores. UI source/report labels match that boundary. | `scripts/product-claims.test.mjs`; full E2E; independent product recheck required on the remediated SHA. | Repaired; no open high |
| PR-002 (Medium) | Yes | The three difficulty values do not change fixture content. UI now calls this a practice-level label and states that system/skill select the curated fault; public claims no longer call it adaptive. | Product-claim regression plus browser suite. | Repaired claim; content expansion intentionally out of current fixture scope |
| PR-003 (Medium) | Yes | Canonical test counts, repository state, scan evidence, review results, and CI job names were stale. | Plan 01-06 updates the five canonical evidence documents from the final candidate commands. | Accepted; scheduled in Plan 01-06 before sign-off |
| PR-004 (Informational) | Yes | Exact-snapshot fixture verification is an intentional non-executing safety boundary. | Existing broad/comment/syntax/dead-code fixture regressions and explicit UI/report disclosure. | Retained boundary |
| QA-01 (Medium) | Yes | React disabled state was not a same-tick mutex. Added synchronous per-action refs for generate, execute, hint, and assess. | E2E double-dispatches every network control and asserts one POST per action. | Repaired |
| QA-02 (Informational) | Yes | Immutable baseline scan counters varied with the reachable planning/report commits present during reruns. | Final evidence records the actual candidate counts and preserves the baseline capture as historical. | Reconciled in Plan 01-06 |
| FS-SEC-001 (High) | Yes | Live assessment no longer sends server-only fixture answers to the model and the model schema returns only three bounded scores. Completion, evidence, patch discipline, strengths, improvements, and recommendations are server-owned. Workflow copying is field-explicit, so unexpected provider prose is discarded. | Workflow tests prove hidden fixture material is absent from model input and response, reject extra score-schema fields, and exercise a malicious mock with extra prose. | Repaired; no open high |
| FS-SEC-002 (Medium) | Yes | Added a per-scope 300-request/minute process budget independent of address in addition to the 30/client bucket. This bounds valid forwarded-address churn on one instance. | Valid-address churn regression reaches the process budget. | Partially mitigated; shared edge quota remains mandatory before public credentialed deployment (Phase 3 owner) |
| FS-SEC-003 (Medium) | Yes | JSON bodies are read incrementally and cancelled immediately above 80,000 bytes; invalid lengths are rejected before reading. | Chunked early-cancel, exact 80,000-byte, 80,001-byte, malformed-length, and split-multibyte regressions. | Repaired locally; upstream host cap remains Phase 3 defense in depth |
| FS-SEC-004 (Medium) | Yes | Live passing tests no longer imply verification when the server-owned maximum changed-line boundary is exceeded. | Mocked passing Code Interpreter broad-rewrite regression asserts `not_verified` and low patch discipline. | Repaired |
| FS-SEC-005 (Low) | Yes | Central output sanitation now covers the repository credential families, private-key markers, macOS/Linux/Windows home paths, terminal controls, and provider/container identifiers before truncation. | Table-driven sanitizer regression uses runtime-built fake values and asserts non-disclosure. | Repaired |
| FS-SEC-006 (Low) | Yes | No injection sink was found. Nonce/hash CSP would require request-scoped framework/hosting integration and is not safely inferred before deployment selection. | Existing production header smoke, React escaping, no arbitrary HTML surface. | Accepted residual; Phase 3 security-header owner; must not be described as solved |
| FS-SEC-007 (Low) | Yes | Source/history scan now includes lock/auth forms, tracked/working large text, symlink rejection, and more credential families. Bundle scanning derives non-disclosing markers for all nine fixtures rather than one answer string. | Source scanner and bundle scanner synthetic regressions; production build bundle scan. | Repaired for identified local blind spots; finite pattern coverage remains defense in depth |

## High-severity closure evidence

### Product attribution

The reproduced guided path calls `forgeChallenge(false, ...)` and bypasses the OpenAI gateway. The revised timed narrative says exactly that. Direct-mode copy no longer says the model selects, designs, or adaptively creates a mutation. A dedicated regression binds those claims to the current implementation boundary.

### Live assessment disclosure

The reproduced provider path previously sent a hidden root cause to a free-form assessment schema and returned every model-authored prose field. The repair removes server-only answer material from the assessment model input, narrows provider output to three integer scores, and constructs all public prose and verification status from deterministic server code. Extra fields fail the strict provider schema; even an interface-bypassing malicious mock cannot copy its prose into the response.

## Accepted residuals and release constraints

- **Distributed rate limiting:** the application-level budget is deliberately not represented as cross-instance protection. Phase 3 must configure and verify a deployment-provider edge/shared limit before a server credential is exposed publicly.
- **Inline CSP:** current CSP remains a low defense-in-depth residual with no demonstrated injection sink. Phase 3 must re-evaluate nonce/hash support against the chosen host and exact production build.
- **Practice levels:** beginner/intermediate/advanced currently label the selected attempt. Adding level-specific scaffolding or additional validated fixtures is a future approved curriculum change, not an unstated current feature.
- **Fixture fallback:** exact server-owned snapshot comparison remains the validated fallback. It must stay visibly labeled and must never be narrated as fresh Python execution.

## Validation status

Candidate `fee208737b9814eb72b2f7582d0aad4d1a7fab9e` passed the complete downstream gate:

- source/history security scan: 109 working-tree files and 26 reachable commits in the main checkout;
- ESLint and `tsc --noEmit`;
- 63 Vitest tests across nine files;
- Next.js 16.2.10 production build with seven routes;
- client leakage scan across 17 artifacts using 63 hidden markers derived from all nine fixtures;
- seven Playwright workflows in 6.6 seconds, including the new single-flight adversarial path;
- zero vulnerabilities at the moderate audit threshold;
- production startup in 93 ms, hardened header/health smoke, and fallback generation → hint → intended failure → repaired pass → verified assessment lifecycle.

Focused detached-worktree rechecks inspected that exact SHA:

- `01-05-PRODUCT-RECHECK.md`: **APPROVED**, PR-001/PR-002 resolved, zero remaining findings;
- `01-05-QA-RECHECK.md`: **APPROVED**, one POST per duplicate action and all focused UX/accessibility paths green, zero remaining findings;
- `01-05-SECURITY-RECHECK.md`: **APPROVED**, FS-SEC-001/004 closed, zero blocker/high; distributed rate limiting, inline CSP, and live provider conformance remain explicitly separate constraints.

The validated fixture fallback remained visibly labeled and green throughout every repair and recheck.
