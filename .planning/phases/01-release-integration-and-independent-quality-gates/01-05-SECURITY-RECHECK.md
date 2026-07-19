# Plan 01-05 Independent Security Recheck

**Recheck date:** 2026-07-18  
**Candidate SHA:** `fee208737b9814eb72b2f7582d0aad4d1a7fab9e`  
**Isolation:** unique detached worktree `/private/tmp/faultsmith-security-recheck.jqXqPP/candidate`; `npm ci` completed before validation; worktree and temporary parent were removed after the recheck  
**Live credential use:** none; provider behavior was evaluated through strict boundary inspection and the candidate's mocked adversarial regressions  
**Verdict:** **APPROVED — no blocker or high-severity finding remains in the rechecked scope.**

## Recheck scope

This was an independent read-only recheck of the exact candidate SHA. It focused on FS-SEC-001, FS-SEC-004, request handling, provider/test-output sanitation, source/history secret scanning, fixture-derived client-bundle leakage scanning, and application-host execution boundaries. No source file was edited and no commit was created by the rechecker.

## FS-SEC-001 closure

**Result: closed.** The original high-severity provider-prose disclosure path is no longer present.

- `buildAssessmentInput` in `src/server/ai-gateway.ts:70-97` constructs an explicit allowlist containing public challenge metadata, the rubric, learner-authored reasoning, aggregate attempt metadata, changed paths/counts, and sanitized test evidence. It does not read or serialize `hiddenRootCause`, `hiddenReferenceSolution`, `mutationPatch`, `fixedSnippet`, `brokenSnippet`, or any fixture hint value.
- `modelAssessmentScoresSchema` in `src/server/ai-gateway.ts:27-34` is strict and permits only three bounded integer scores. `OpenAIGateway.assess` in `src/server/ai-gateway.ts:301-334` parses through that schema, so provider-authored prose, completion claims, evidence, recommendations, and extra categories are rejected.
- `deterministicAssessment` in `src/server/workflows.ts:259-319` owns completion status, patch discipline, strengths, improvement areas, evidence summaries, and recommendations. `applyModelScores` in `src/server/workflows.ts:321-331` copies only the three named numeric fields. Unexpected provider properties cannot be spread or serialized into the public response.
- The final workflow gate in `src/server/workflows.ts:377-382` independently forces `not_verified` whenever executed tests do not pass or the changed-line boundary is exceeded.
- The adversarial regressions in `src/server/workflows.test.ts:338-440` prove that a model cannot verify failing evidence, an interface-bypassing malicious mock containing hidden reference/root/repair/hint prose cannot place that prose in the response, hidden fixture material is absent from the score input, extra schema fields fail, and a passing but broad live repair remains unverified.
- Because the API response is built from the strict `assessmentResponseSchema` and the client parses that schema before rendering or persistence, discarded provider fields have no route to rendered or stored assessment state.

The provider still receives learner-authored hypotheses and explanations by design. They are treated as untrusted evidence and can affect only bounded scores; they cannot author public feedback or completion evidence.

## FS-SEC-004 closure

**Result: closed.** Changed files and changed lines are recomputed on the server against the fixture mutation in `src/server/workflows.ts:341-350`. Passing Code Interpreter evidence is necessary but is no longer sufficient: `deterministicAssessment` requires both passing status and `changedLines <= fixture.maxChangedLines`, assigns low patch discipline to broad changes, and the final release predicate repeats the minimality gate. The mocked passing broad-rewrite regression records passing tool evidence while asserting `not_verified`, patch-discipline score `45`, and a server-owned minimal-boundary explanation.

## Integrated boundary results

| Boundary | Objective result |
| --- | --- |
| Request schemas and allowlists | Strict Zod contracts reject extra command/container fields, traversal, invalid paths, duplicates, missing and unexpected files. Existing route/workflow adversarial tests passed. |
| Body handling | `readJsonBody` streams and counts bytes, rejects malformed or oversized declared lengths, cancels immediately above 80,000 received bytes, and correctly handles exact-limit and split-multibyte input. Regressions passed. |
| Local rate controls | Per-client 30/minute, per-scope 300/minute, bounded bucket count, malformed-address normalization, and valid-address churn regression passed. This is explicitly not cross-instance protection. |
| Safe errors | Expected request failures use bounded fixed contracts; unexpected exceptions return a generic fixed 500 response without provider/error detail. |
| Test-output sanitation | Credential families, auth forms/URLs, private-key material, macOS/Linux/root/Windows homes, ANSI/terminal controls, provider/container identifiers, and post-redaction truncation regressions passed. |
| Source/history leakage | Passed across 110 working-tree files and 26 reachable commits. Findings are non-disclosing; lock/auth forms, large text, tracked files, symlinks, public secret names, and application-host process APIs are covered. |
| Client bundle leakage | Passed across 17 production artifacts. The non-executing TypeScript AST gate derived root/reference/fixed/mutation/three-hint markers for all nine fixtures and reports only marker identifiers, never values. |
| Host execution boundary | No application-host subprocess/dynamic execution surface was found in non-test `src`; the fixed test command remains provider Code Interpreter behavior, while the validated fixture fallback remains non-executing. |

## Recorded gate evidence

| Command | Result |
| --- | --- |
| `git rev-parse HEAD` | Exact match: `fee208737b9814eb72b2f7582d0aad4d1a7fab9e` |
| `npm ci` | 490 packages installed; install audit reported zero vulnerabilities |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm test` | Passed: 9 files, 63 tests |
| `npm audit --audit-level=moderate` | Passed: zero vulnerabilities |
| `npm run build` | Passed: optimized Next.js 16.2.10 build; seven routes |
| `npm run security:bundle` | Passed: 17 artifacts |
| `npm run security:source` | Passed: 110 files and 26 reachable commits |
| `npm run test:e2e` | Passed: 7 browser tests, including primary demo, verified-only guided progress, failed-patch exclusion, duplicate-action suppression, keyboard/axe coverage, secondary fixtures, and narrow-layout overflow |

## Residuals and release constraints

- **Distributed rate enforcement — medium deployment constraint, not an FS-SEC-001/004 closure failure.** The 300-request scope budget is process-local and `x-forwarded-for` is not independently trustworthy. Before exposing a paid server credential publicly, Phase 3 must configure and verify a shared edge/provider quota using an authenticated client-address source and cross-instance/concurrency enforcement. The candidate is not represented as having distributed rate limiting.
- **Inline CSP — low accepted MVP residual, not an identified injection path.** Production `script-src` and `style-src` retain `'unsafe-inline'`. No arbitrary HTML/eval/dynamic-function sink was found, and frame/object/form/connect/referrer controls remain present. Nonce/hash feasibility must be rechecked against the selected deployment host; this residual is not represented as solved.
- **Live provider conformance — external Phase 2 evidence.** No credential was used in this recheck. Actual GPT-5.6 structured-output and Code Interpreter behavior still require the separately authorized live smoke test. The validated fixture fallback and mocked boundary evidence remain green and must be preserved.
- **Finite signatures — low defense in depth.** Credential detection necessarily recognizes a finite family set. Identified lockfile, large-file, symlink, auth-form, output, and fixture-marker blind spots are closed, and scan failures remain non-disclosing.

## Conclusion

**Blocker findings: 0. High findings: 0.** FS-SEC-001 and FS-SEC-004 are objectively closed at the candidate SHA. The exact candidate is approved for Phase 1 security integration, subject to the explicitly separate live-credential proof and public-deployment controls above.
