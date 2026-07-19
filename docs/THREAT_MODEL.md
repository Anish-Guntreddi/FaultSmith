# FaultSmith Threat Model

**Review date:** July 19, 2026 (updated for the implemented Phase 01.1 identity/cloud boundary)
**Scope:** browser client, Next.js API routes, server-only challenge catalog, OpenAI Responses API and Code Interpreter boundary, browser-local persistence, implemented Firebase email/password + Google identity and server-mediated Cloud Firestore progress (emulator-proven, real project pending), and deployment configuration

## Security objectives

1. Learner Python never executes on the Next.js host.
2. Credentials, internal prompts, hidden root causes, reference fixes, and provider identifiers never reach the browser.
3. Only an approved project snapshot and server-owned tests can execute.
4. Deterministic test evidence controls verification.
5. Provider failures and malicious inputs fail safely without losing the demo fallback.

## Assets

- `OPENAI_API_KEY` and API credit budget
- Hidden root causes, original sources, expected failure signatures, and reference repairs
- Integrity of test evidence and verified/not-verified status
- Approved project and test catalog
- Learner source, hypothesis, explanation, and browser-local attempt
- Guided lesson completion evidence and curriculum sequencing integrity
- Service availability and submission/demo reliability
- Provider container/session isolation
- Firebase service credential and ID-token confidentiality
- Account ownership, password/verification/reset integrity, and provider-to-UID continuity
- Private UID-scoped cloud learning metrics and cross-user isolation

## Trust boundaries

| Boundary | Untrusted side | Trusted side | Enforcement |
| --- | --- | --- | --- |
| Browser → Next.js routes | All JSON, headers, IDs, files, prose | Request guard and Zod schemas | content type, body size, strict keys, length/count/path limits, rate limit |
| Public DTO → server fixtures | Browser-visible challenge | Hidden fixture metadata | `server-only` modules and explicit DTO construction |
| Server → GPT-5.6 | Project/learner text can contain instructions | Fixed developer instructions and structured schema | data delimiting, strict structured output, semantic equality against approved contract |
| Server → Code Interpreter | Learner Python is hostile | Ephemeral OpenAI sandbox | fixed server command/bundle, timeout, output sanitation; no host subprocess |
| Test result → model assessment | Learner prose and provider scores are probabilistic | Deterministic verification policy | hidden fixture answers are omitted from model input; provider returns only three scores; prose, completion, minimality, and execution fields are server-owned |
| Browser storage → restored UI | Local storage can be tampered with | Runtime validation/reexecution | public-only state; final submission reruns exact files server-side |
| Firebase Auth client → Next.js progress routes (implemented) | Browser identity state and Bearer token are attacker-controlled | Server-verified Firebase token and verified-email policy | single bounded Authorization value (≤4608 chars, comma-rejected, charset-checked token ≤4096), Admin verification with project/audience/expiry enforcement, provider-independent verified-email requirement, UID-only identity wrapper, same-origin containment on both token-accepting routes, no password server path |
| Next.js server → Cloud Firestore (implemented) | Route payloads cannot select identity or paths | Server-only bounded progress repository | verified UID wrapper, fixed `learningProfiles/{uid}` path, strict exact-key DTOs, transactional writes, SHA-256 idempotency, 50-attempt retention, one-time import marker, deployed default-deny browser rules |
| Operator smoke → release evidence | Public route payloads, provider output, filesystem paths, and target URLs are untrusted | Strict evidence schema and contained writer | exact route schemas/mode assertions; HTTPS except loopback; redirect rejection; hashes instead of output; exclusive no-follow/symlink-safe writes under ignored `test-results/` |

## Entry points

- `POST /api/challenges/generate`
- `POST /api/challenges/execute`
- `POST /api/challenges/hint`
- `POST /api/challenges/assess`
- `GET /api/health`
- Project/skill/difficulty controls
- Source, hypothesis, and explanation text
- Browser-local saved attempt
- Firebase account controls in My Progress and the authenticated `GET/POST/DELETE /api/progress` routes (implemented)
- Provider responses and Code Interpreter logs

## Abuse cases and findings

| Severity | Abuse/failure path | Affected surface | Mitigation | Verification | Residual risk |
| --- | --- | --- | --- | --- | --- |
| High if absent; mitigated | Submit shell command, file ID, or container ID | execute/assess routes | strict schemas accept only challenge ID and bounded file snapshots; server owns command and ephemeral execution | route adversarial tests reject extra keys; source search finds no host subprocess use | OpenAI sandbox behavior still requires live smoke |
| High if absent; mitigated | Path traversal or modification outside allowlist | contracts/workflows | normalized relative path schema, duplicate detection, exact server allowlist | traversal and arbitrary-file tests; fixture allowlist tests | curated catalog correctness remains trusted |
| High if absent; mitigated | Hidden solution leaks through JSON, bundle, storage, or imports | fixtures/DTO/client | server-only fixture modules, explicit public schema, no hidden client imports | API hidden-field tests, client import scan, E2E storage review, bundle string scan procedure | source repository intentionally contains fixture answers server-side |
| High if absent; mitigated | Future hints or a model-generated repair bypass progressive disclosure | hint route/gateway/client | future hints omitted from public challenge; separate strict hint schema; exact approved-step equality and repair/reference rejection | hint workflow/route tests, fixture hint invariant, browser-storage E2E | a learner can still call the bounded hint endpoint out of UI order; hints never contain the completed patch |
| High if absent; mitigated | GPT declares failing patch correct | assessment | execute exact snapshot first; force `not_verified` on any failing/errored result | failing-patch unit, route, and E2E tests | none in current policy path |
| High if absent; mitigated | Prompt injection changes command or reveals answer through assessment prose | GPT inputs | mark file/prose content untrusted; exact contract/hint checks; omit hidden answers from assessment input; strict score-only assessment; server-owned command and feedback prose | malicious assessment mock, hidden-input exclusion, injection-shaped route, and semantic-invalid-plan tests | live score quality may vary, but provider prose cannot reach the learner and scores cannot alter verification |
| Medium; mitigated | Schema-valid plan creates multiple causes or broad patch | generation | exact fixture contract, one root cause, allowlist and patch equality, original-pass/mutated-fail/signature validation | multiple-root/expanded-allowlist/mutation-no-fail tests | limits novelty to approved mutation catalog by design |
| Medium; mitigated | Validation interpreter promotes invalid execution evidence | generation | deterministic original-pass/mutated-fail/signature gates run before the separate interpretation call; the model may veto but cannot release invalid evidence | permissive-interpreter plus invalid-mutation regression and veto/retry regression | live provider conformance awaits credentialed smoke |
| Medium; mitigated | Provider timeout/expiration causes broken lab or internal error disclosure | gateway/workflow/routes | abort timeout, safe error normalization, no provider details, labeled fixture recovery | timeout/expired-runner/malformed-output/missing-key tests | a total server outage still prevents route use |
| Medium; mitigated locally | Oversized files/output exhaust memory or flood UI | contracts/request guard/output sanitizer | incrementally cancel request streams above 80 KiB; bounded files/count/text; redaction before 8 KiB truncation; execution timeout | malformed/exact/overflow/multibyte stream and expanded sanitizer tests | deployment platform must still enforce an upstream body/concurrency cap |
| Medium; partially mitigated | Distributed rate-limit bypass, spoofed-key memory growth, and API-credit exhaustion | API routes | 30 requests/minute/IP/scope, separate 300/scope process budget, 5,000-bucket cap, expired cleanup, overflow bucket | same-client, malformed-address, and valid-address-churn regressions | per-process state is not sufficient for horizontally scaled public traffic; Phase 3 requires edge/shared limiter |
| Medium; mitigated | Passing live tests verify a broad/destructive repair | assessment | server derives changed files/lines and withholds verification above the fixture's minimal-change boundary | mocked passing Code Interpreter broad-rewrite regression | test adequacy and live execution still require credentialed smoke |
| Medium; mitigated | Credential leaks via client env/error/log | config/gateway/routes | server-only env read, no `NEXT_PUBLIC_`, safe errors, output key redaction, `.env*` ignore | secret scan, redaction test, client source scan | deployment operator must configure server scope correctly |
| High if absent; mitigated (emulator-proven) | Password leaks into FaultSmith server, storage, logs, or evidence | email/password account flow | Firebase browser SDK owns credential exchange; no password API/schema/state field; password-manager-safe form clears state after every action; `password-boundary` source-scan rule with direct unit coverage | adapter unit tests, browser persisted-state leak scenario, source/history and bundle scans | real browser/provider behavior remains credential-gated |
| Medium if absent; mitigated (emulator-proven) | Signup/login/reset/verification reveals registered emails or floods inboxes | Firebase account actions | account-existence outcomes collapse to one generic state end-to-end; reset always reports generic success; 60s client cooldowns; server 30/min/IP + 300/min scope caps | emulator/browser enumeration and cooldown scenarios | Firebase-side enumeration protection, password policy, and email delivery require real-project configuration and proof |
| High if absent; mitigated (emulator-proven) | Unverified password identity reads or writes cloud progress | progress routes | server requires a verified Firebase token **and** provider-independent `email_verified`; local guest path remains available | identity DAL unit tests plus emulator integration for missing/unverified/verified/wrong-project/oversized tokens | token-claim refresh behavior requires real-project proof |
| High if absent; mitigated (emulator-proven, linking release-gated) | Google/password collision silently splits, merges, or overwrites learner progress | provider linking and UID-keyed profile | one-account-per-email; collisions produce fixed safe guidance and never merge; linking is behind the default-off capability flag, requires recent authentication, and a UID-changing link signs out with `link_unavailable` | adapter unit tests and emulator/browser collision scenarios | UID-preserving linking ships only after the real-provider checkpoint |
| High if absent; mitigated (emulator-proven) | User A reads, writes, deletes, or infers user B's cloud metrics | progress API/Firestore | UID derived only from verified token; fixed server paths; strict exact-key DTOs; deployed default-deny direct-client rules; responses carry no UID or document path | two-user emulator isolation, deletion, and rules tests across five identity states | Admin SDK bypasses rules, so DAL correctness and real-project proof remain mandatory |
| Low; mitigated | Cross-origin browser request reaches a token-accepting write surface | progress and assess routes | exact-origin check on both routes (origin-absent non-browser clients unaffected); bearer tokens are non-ambient so classical CSRF is already structurally absent | adversarial cross-origin route regressions on both surfaces | none identified in the local boundary |
| Low; mitigated | Local storage tampering manufactures a report | client persistence | report is learning evidence, not certification; any submission reruns server-side snapshot | refresh/reset E2E and authoritative assess tests | a user can alter their own rendered browser; no external credential is granted |
| Low; mitigated | Local progress tampering unlocks lessons, injects learner prose, or creates false mastery | guided curriculum persistence | strict versioned schema, approved lesson-ID enum, bounded metrics, per-entry parsing, duplicate replacement, verified-only writes | learning-path unit tests and guided success/failure E2E; stored progress is checked for absence of code/hypothesis/explanation | browser owner can alter their own local presentation; progress grants no credential or verification authority |
| Medium if expanded; avoided | Open-ended beginner prompting increases token spend, prompt dependency, or attack surface | learning entry point | guided lessons use existing prevalidated fixtures and deterministic recommendations; no new prompt or endpoint added | guided E2E confirms prevalidated launch and registry-to-fixture unit test proves all nine mappings | live Practice by skill still spends credits when explicitly selected and configured |
| High if absent; mitigated | Learner embeds the expected repair text in a comment, dead branch, or invalid program to fool fixture verification | deterministic fallback | fallback releases a passing result only for exact equality with the server-owned prevalidated repair snapshot; no learner Python runs on the host | comment, syntax-error, dead-code, broad-patch, and unchanged-patch regressions | semantically equivalent alternative repairs require live Code Interpreter and are intentionally not inferred by the non-executing fallback |
| Medium; mitigated | Fixture transcripts are mistaken for a fresh Python execution | fallback UI/report | mode-aware labels say prevalidated verification/snapshot comparison and explicitly state that no learner Python ran on the host; Code Interpreter evidence uses separate wording | primary E2E asserts workspace and report disclosures | judge must still distinguish prevalidated fixture evidence from credentialed live proof |
| Low; mitigated | Anonymous observability accidentally captures learner prose | local event log | strict event schema allows only names, timestamps, bounded IDs/source/outcomes; cap 100 | event-schema unit tests and primary E2E prove no hypothesis/explanation keys | local browser owner can inspect or clear their own event log |
| Medium; mitigated | Verbose irrelevant prose receives a misleadingly high fallback reasoning score | deterministic assessment | challenge-specific server-only causal signal groups and causal-language evidence replace length-based scoring; source is visibly labeled deterministic fallback | passing-repair/irrelevant-prose regression compares grounded and ungrounded scores | heuristic fallback scores are provisional learning feedback, not certification; GPT rubric still requires live credentials |
| Low; partially mitigated | XSS/clickjacking/data exfiltration | app/config | React escaping, strict JSON, CSP, frame denial, no-referrer, restrictive permissions, same-origin policies | production header smoke and axe/browser checks | CSP retains `unsafe-inline`; Phase 3 must re-evaluate nonce/hash hardening and document the accepted residual if the selected host cannot support it safely |
| Medium if absent; mitigated locally | Release tooling leaks provider/learner content or promotes contradictory evidence | operator scripts/evidence | exact response key/type/bound validation; approved-hint equality; fail/pass/signature/completion relationship checks; digests only; credentials rejected from URL/CLI; exclusive evidence writes | 63 focused release-tool tests including hidden/unknown fields, raw HTTP failures, redirect, timeout, tampered evidence, traversal/symlink/overwrite, counterfeit shell, CSP/HSTS/cache drift, and safe output | actual provider conformance remains credential-gated; sanitized evidence must still receive human review |
| Low; mitigated | Visual redesign or explanatory motion adds a remote origin, hidden interaction, stale inline state, scroll trap, excessive layers, or accessibility regression | global styles and learning/account/workspace/report/story surfaces | system fonts and CSS geometry only; exact CSP unchanged; GSAP/ScrollTrigger are bundled split chunks dynamically loaded only near the desktop story; native sticky scroll without pin/snap/smoothing; semantic chapters precede enhancement; reduced-motion/mobile static path; deterministic teardown clears inline properties; compositor hints limited to five layers | lint/typecheck/build; 18 standard and 16 Firebase-mode browser scenarios; axe, keyboard, password-manager, responsive and desktop→mobile/reduced-motion transition review | presentation dependency increases client code only when the optional desktop story nears the viewport; no authority, data, credential, or network boundary is added |

## Secret and sensitive-file review

- `.env*` is ignored; `.env.example` is explicitly allowed and empty.
- No live `OPENAI_API_KEY` was present during the July 18 review.
- The non-disclosing scanner covers common credential/auth/private-key families, public-secret environment names, tracked/working text including the lockfile and large files, working-tree symlinks, and reachable Git history.
- The candidate-era main checkout passed across 109 working-tree files and 26 reachable commits; an independent detached recheck of candidate `fee208737b9814eb72b2f7582d0aad4d1a7fab9e` passed across 110 files and the same 26 commits. No private key or committed credential was found.
- The Phase 2 offline working-tree scan passed across 139 files and 38 reachable commits after adding the release/UAT tooling; findings remained identifier-only and no credential was present.
- The Phase 01.1 candidate scan passed across the full working tree and all reachable commits (exact per-run counts are recorded with the frozen SHA in the phase review reports). Only the exact `NEXT_PUBLIC_FIREBASE_API_KEY` name is allowlisted as public Firebase metadata; name variants and any publicized server secret still fail closed, and no real Firebase value exists anywhere in the repository (all suites use the fake `demo-faultsmith` emulator project).
- A real Firebase operator configuration is now present only in ignored `.env.local` for the remaining human checkpoint. The direct scanner correctly fails closed on that file without printing values. After the motion pass, the current credential-free source copy (excluding only the private operator file) passed across 573 files and all 66 reachable commits; the operator must privately omit/remove the live file before the canonical direct gate is claimed green. No real value is tracked or reachable in Git history.
- `tsconfig.tsbuildinfo`, `.next`, test results, and screenshots are generated artifacts and ignored or excluded from scans/distribution.
- The workspace is a Git repository connected to the public `Anish-Guntreddi/FaultSmith` origin; reachable-history scanning is an automated required gate.

## Dependency and license review

- `npm audit --audit-level=moderate`: zero vulnerabilities at the checkpoint.
- GSAP 3.15.0 is the sole motion dependency and uses its Standard no-charge license. It is locally bundled, dynamically imported, and adds no remote runtime request or origin; retain its packaged license notice in any distributed bundle.
- PostCSS is overridden to 8.5.19 across Next.js, Tailwind, and Vitest/Vite.
- Installed-license inventory: predominantly MIT, Apache-2.0, ISC, BSD; reviewed MPL tooling, CC datasets, Python-2.0 argparse, and the LGPL libvips runtime binary used by Sharp.
- Retain all package license files/notices in any distributed dependency bundle and rerun both audit and license inventory immediately before public submission.

## Verification commands

See `docs/TESTING.md` for executable commands. Security-specific gates include schema/adversarial tests, secret and subprocess searches, `npm audit`, production header inspection, public-response inspection, client/bundle string scans, and a credential-controlled live Code Interpreter smoke.

## Review conclusion

The Phase 1 independent security review found one high live-assessment disclosure path and three medium issues; the high was repaired by excluding hidden fixture knowledge from model input, accepting only score output, and keeping all prose/authority server-owned. The Phase 2 plan/security audit then found six execution-contract gaps, and the production-tool adversarial review reproduced six additional issues including two high-priority timeout/shell false-results. All were repaired and independently rechecked on `5fcae27`; 63 focused tests pass and no new issue was validated.

The Phase 01.1 independent security/adversarial review of the accounts/cloud boundary found zero blocker/high issues and one accepted low (cross-origin containment parity on the token-accepting assess route), which was repaired with a permanent regression; two informational observations (tolerant server-side cloud-document recovery, per-instance rate limiting pending deployment controls) were consciously accepted with recorded rationale. The automated real-project smoke subsequently passed 22/22 sanitized stages without recording an email, UID, token, password, project value, document content, or credential. Human Google/inbox/browser and cloud-off cleanup proof remain separate. The complete finding ledger is in `.planning/phases/01.1-personalized-learner-accounts-cloud-progress-and-metrics-dashboard/`.

No accepted local blocker/high remains open. Distributed rate limiting must be added before a paid credential is exposed publicly; nonce/hash CSP feasibility must be re-evaluated and documented during deployment; real Firebase project behavior (password policy, enumeration protection, token refresh, provider linking) remains a human-gated checkpoint. None of these residuals is represented as already solved.
