# Plan 01-04 Independent Security Review

**Review date:** 2026-07-18  
**Frozen implementation SHA:** `506dae90ce3832f4096f5f95a52c996c5335f9f1`  
**Review isolation:** unique detached worktree, with `npm ci` completed before the recorded gates  
**Disposition:** **Not approved. One unresolved high-severity finding remains.**

## Scope and method

This was a read-only adversarial review of the frozen SHA named in `01-01-BASELINE.md`. It covered the browser/API/provider boundaries, strict schemas and limits, server-owned allowlists, command/container/repository input rejection, prompt injection, progressive hints, hidden fixture material, DTO/import/storage/bundle exposure, deterministic evidence authority, overbroad repair, output/error sanitation, rate-key churn, source and reachable-history credentials, dependencies/licenses, response headers/CSP, and application-host subprocess absence. No live OpenAI credential was used and no secret or hidden solution value was printed or copied.

## Gate evidence

| Attempt | Result |
| --- | --- |
| Confirm detached review SHA | Passed: `HEAD` exactly matched `506dae90ce3832f4096f5f95a52c996c5335f9f1` |
| `npm ci` in detached worktree | Passed: 490 packages installed; install audit reported zero vulnerabilities |
| `npm test` | Passed: 7 files, 45 tests |
| `npm audit --audit-level=moderate` | Passed: zero vulnerabilities |
| `npm run security:source` | Passed: 96 working-tree files and 19 reachable commits; matching values are not emitted by the scanner |
| `npm run build` | Passed: optimized Next.js 16.2.10 production build; seven routes |
| `npm run security:bundle` | Passed: 17 static artifacts |
| Production header smoke on loopback | Passed for CSP, HSTS, frame denial, nosniff, referrer, permissions, opener/resource policy, no-store API responses, and absence of `X-Powered-By` |
| Application-host execution searches | Passed: no `child_process`, exec/spawn, eval/dynamic-function, Bun/Deno command, execa, or shelljs use in non-test `src` |
| Client-to-server import search | Passed: no server-module imports from client components, pages, or shared client libraries |
| Public-secret environment search | Passed: no public OpenAI/API-key/secret/token environment variable |
| Sensitive tracked-file check | Only the intentionally empty `.env.example`; no tracked symlink or tracked file over 1 MiB at the frozen SHA |
| License inventory | Reviewed: predominantly MIT/Apache/ISC/BSD, with MPL, LGPL, CC, and Python-2.0 transitive packages; notices must remain with any redistributed dependency bundle |
| Baseline-to-review implementation drift | Passed: `git diff --name-only <baseline>..HEAD -- src tests scripts package.json .github` was empty at review start |

## Adversarial attempts and boundary results

| Boundary/attempt | Result |
| --- | --- |
| Extra JSON keys, arbitrary command, client container ID, traversal, duplicate/missing/unexpected files | Rejected by strict Zod request schemas and exact fixture allowlists; existing route/workflow regressions passed. No repository URL/input surface exists. |
| File/text/count/path/request limits | File snapshots are bounded and paths are project-relative; the 80 KiB check rejects oversized bodies, but the body is fully buffered when length is absent or false (FS-SEC-003). |
| Prompt injection and failing-prose promotion | Deterministic test status remains authoritative and failing evidence is forced to `not_verified`. However free-form live assessment fields can disclose hidden fixture knowledge (FS-SEC-001). |
| Progressive hints/reference leakage | Future hints are absent from the challenge DTO; live hints must exactly equal the requested approved step and unsafe output falls back. No bypass was found. |
| Public DTO/import/storage/bundle leakage | Public challenge projection and current bundle were clean. Browser storage parses public schemas. A poisoned live assessment would nevertheless be returned and persisted (FS-SEC-001); the regression scanners have narrow future coverage (FS-SEC-007). |
| Overbroad/destructive repair | Prevalidated mode rejects non-exact and broad repairs. Live Code Interpreter mode gates verification on passing tests but does not enforce the server-owned change boundary (FS-SEC-004). |
| Output/error sanitation | Unknown route/provider errors become fixed safe responses, and test logs are bounded with partial redaction. The log sanitizer does not cover all credential/provider/path shapes (FS-SEC-005). |
| Rate-key churn | Malformed addresses collapse to one bucket and bucket count is capped. Valid-looking forwarded-address rotation and per-process distribution still bypass the intended paid-route rate (FS-SEC-002). |
| Secrets and reachable history | No match was found in 19 reachable commits and source findings omit matched values. Current baseline had no sensitive tracked artifact; scanner blind spots are recorded in FS-SEC-007. |
| CSP/clickjacking/exfiltration | Frame, object, form, referrer, permissions, opener/resource, and connect restrictions were present. Production script/style policy retains inline execution (FS-SEC-006). |
| Host subprocess execution | No application-host process API or dynamic execution path was found. The only process execution is the security script invoking Git and the fixed Code Interpreter instruction inside the provider sandbox. |

## Findings

### FS-SEC-001 — High — Live assessment prose can disclose server-only fixture knowledge

- **Affected files:** `src/server/ai-gateway.ts:264-315`, `src/server/workflows.ts:327-356`, `src/lib/contracts.ts:32-61`, `src/components/faultsmith-app.tsx:202-276`.
- **Exploit/failure path:** A caller submits schema-valid learner prose to the assessment route while live mode is configured. The gateway sends the hidden root cause and the attacker-controlled prose to the same model. Structured output constrains types and lengths only. All model-authored `strengths`, `improvementAreas`, and `nextPracticeRecommendation` strings are accepted; on a failing run only completion status and one evidence field are replaced. A prompt-injected response can therefore echo or paraphrase server-only fixture knowledge into the API response, after which the client persists the assessment in local storage. The offline injection test exercises deterministic fallback and cannot cover this path.
- **Mitigation:** Do not return provider-authored free-form text that has access to hidden fixture material. Prefer model output limited to bounded score/category identifiers, then render server-owned safe feedback templates. If prose is retained, reject any response overlapping hidden root/reference/repair/hint/internal-prompt material and fall back, while recognizing exact-string filtering alone cannot prevent paraphrase.
- **Verification:** Add a mocked malicious assessment gateway that returns hidden material in every prose field for both passing and failing test results. Assert route JSON, rendered state, and persisted storage omit it and use the deterministic safe fallback. Repeat with paraphrases/category abuse; run unit, route, E2E storage, build, and bundle gates.

### FS-SEC-002 — Medium — Paid-route rate limits are bypassable by valid forwarded-address churn and horizontal scaling

- **Affected files:** `src/server/request-guard.ts:3-37`, all four challenge POST routes, `src/server/request-guard.test.ts:35-49`.
- **Exploit/failure path:** The first `x-forwarded-for` token is accepted solely by character shape. A caller or untrusted proxy can rotate valid-looking IPv4/IPv6 strings, receiving a fresh 30-request bucket until the 5,000-bucket cap is reached; a fresh process can therefore admit roughly 5,000 buckets times 30 requests before overflow limiting. Separate instances reset the map entirely. The current regression rotates malformed values only.
- **Mitigation:** Before any public credentialed deployment, enforce a shared/edge rate limiter and use only a deployment-provider-authenticated client-address source. Add a coarse global/concurrency budget and paid-operation quota independent of client IP.
- **Verification:** Test valid-address rotation, trusted-proxy parsing, overflow behavior, concurrent calls, and cross-instance/shared-state behavior. Confirm the 31st effective request is denied across instances and the bucket store remains bounded.

### FS-SEC-003 — Medium — The 80 KiB request cap is enforced only after an undeclared body is buffered

- **Affected files:** `src/server/request-guard.ts:40-60`, `src/server/request-guard.test.ts:19-33`.
- **Exploit/failure path:** `Content-Length` is optional and untrusted. When it is absent or false, `request.text()` buffers the entire stream before byte length is checked. A client can therefore force allocation and decoding above the stated application limit; only a platform-specific upstream maximum bounds the damage. The regression covers an oversized declared length, not a chunked/undeclared oversized body.
- **Mitigation:** Read the body stream incrementally, stop and cancel after 80,000 bytes, then decode/parse. Also configure and document an upstream body cap and reject invalid/negative length syntax.
- **Verification:** Feed a chunked stream larger than the limit, assert early cancellation and 413 without consuming later chunks, and test multibyte boundaries at 80,000/80,001 bytes.

### FS-SEC-004 — Medium — Live passing tests can verify an overbroad repair

- **Affected files:** `src/server/workflows.ts:311-365`, `src/server/ai-gateway.ts:307-315`, `src/server/fixture-runner.ts:46-73`.
- **Exploit/failure path:** Prevalidated verification enforces the exact server-owned repair and `maxChangedLines`, but a live Code Interpreter `passed` result proceeds to assessment with `changedLines` used only for scoring. The gateway returns `verified` for every passing result. A large rewrite within the exact allowed file set can therefore be marked complete if the curated tests pass, even when it exceeds the lab's minimal-repair boundary.
- **Mitigation:** Apply the server-owned changed-file and maximum-changed-line policy before live verification, returning `not_verified` (or a distinct needs-refinement state) for broad repairs. Keep deterministic tests authoritative but make minimality an additional server-owned release predicate.
- **Verification:** Mock a passing Code Interpreter result for a submission exceeding `maxChangedLines` and assert it cannot become verified; add route/E2E coverage for destructive, append-only, and full-file rewrite variants.

### FS-SEC-005 — Low — Test-log sanitation covers only a narrow subset of sensitive output

- **Affected files:** `src/server/fixture-runner.ts:6-13`, `src/server/ai-gateway.ts:54-68,156-179`.
- **Exploit/failure path:** Provider logs are returned after OpenAI-key-shape, one macOS home-path shape, ANSI, and length handling. Other credential families, private-key headers, Linux/Windows home paths, provider/container identifiers, and terminal control characters can pass through. No application secret is intentionally supplied to the sandbox, so current impact is defense-in-depth and provider-internal disclosure rather than demonstrated host-key exposure.
- **Mitigation:** Centralize output sanitation using the source scanner's credential families plus cross-platform path, control-character, and provider-identifier rules. Prefer a small server-generated pytest summary over raw provider logs when possible.
- **Verification:** Add table-driven sanitizer tests for every credential family, private-key markers, cross-platform paths, control characters, provider IDs, and truncation after redaction; assert responses and logs contain no original value.

### FS-SEC-006 — Low — Production CSP allows inline script and style

- **Affected files:** `next.config.ts:3-16`.
- **Exploit/failure path:** Production responses set `script-src 'self' 'unsafe-inline'` and `style-src 'self' 'unsafe-inline'`. React escaping and the absence of an arbitrary HTML sink kept this from becoming a demonstrated XSS path, but any future injection sink would receive less CSP containment.
- **Mitigation:** Migrate scripts to nonce/hash-based CSP and remove inline script allowance; remove inline style allowance when framework/style constraints permit.
- **Verification:** Production header test rejects `unsafe-inline` for scripts, confirms a per-response nonce/hash is applied to required framework scripts, and reruns the browser suite under the stricter policy.

### FS-SEC-007 — Low — Secret and bundle leakage gates have narrow blind spots

- **Affected files:** `scripts/check-source-security.mjs:8-33,124-140`, `scripts/check-client-bundle.mjs:4-11`, `src/server/fixtures.test.ts:88-112`.
- **Exploit/failure path:** The working-tree source scan skips `package-lock.json`, symlinks, and text files over 1 MiB and recognizes a finite credential set. The bundle scan checks internal field names and only one fixture-specific answer marker. A future copied answer from another fixture, registry credential in an ignored lockfile, or large/symlinked sensitive file could evade a green gate. No such artifact was found at this SHA.
- **Mitigation:** Scan tracked Git blobs and sensitive configuration/lockfile auth forms independent of size, reject or explicitly inspect tracked symlinks, and derive bundle/API/storage forbidden markers from every fixture's hidden root/reference/repair/hints without printing values.
- **Verification:** Add synthetic non-disclosing regressions for each skipped class and for every fixture; confirm failures report only rule, path, line, and commit—not matched content.

## Residual-risk classification

- **External/unverified:** Live GPT-5.6 and Code Interpreter isolation/conformance remain Phase 2 credential-controlled evidence; no success is inferred here.
- **Medium, not acceptable for public paid deployment:** FS-SEC-002 rate limiting and FS-SEC-003 pre-buffer body limit. The current pre-deployment/missing-key context keeps them below high, but enabling a paid credential publicly without edge/shared controls would escalate rate abuse.
- **Low accepted MVP residual:** Inline CSP while no injection sink is known, local-only browser-state tampering that grants no credential, and public health disclosure of only configured/fallback booleans.
- **Dependency/license:** Zero known moderate-or-higher audit vulnerabilities. Copyleft/content-licensed transitive packages require notice preservation and a fresh inventory before distribution; no present license blocker was identified.

## Conclusion

**Blocker findings: 0. High findings: 1. Medium findings: 3. Low findings: 3. Informational findings: 0.**

The frozen SHA is **not security-approved** because FS-SEC-001 is an unresolved high-severity hidden-information boundary failure. Plan 05 must reproduce and repair it without reviewer self-certification, then validate all downstream route, storage, build, bundle, and adversarial gates. No other blocker/high issue was found in the reviewed scope.
