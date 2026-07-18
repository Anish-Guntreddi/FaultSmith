# FaultSmith Threat Model

**Review date:** July 18, 2026  
**Scope:** browser client, Next.js API routes, server-only challenge catalog, OpenAI Responses API and Code Interpreter boundary, browser-local persistence, and deployment configuration

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

## Trust boundaries

| Boundary | Untrusted side | Trusted side | Enforcement |
| --- | --- | --- | --- |
| Browser → Next.js routes | All JSON, headers, IDs, files, prose | Request guard and Zod schemas | content type, body size, strict keys, length/count/path limits, rate limit |
| Public DTO → server fixtures | Browser-visible challenge | Hidden fixture metadata | `server-only` modules and explicit DTO construction |
| Server → GPT-5.6 | Project/learner text can contain instructions | Fixed developer instructions and structured schema | data delimiting, strict structured output, semantic equality against approved contract |
| Server → Code Interpreter | Learner Python is hostile | Ephemeral OpenAI sandbox | fixed server command/bundle, timeout, output sanitation; no host subprocess |
| Test result → model assessment | Model feedback is probabilistic | Deterministic verification policy | failing evidence forces `not_verified`; execution fields are server-owned |
| Browser storage → restored UI | Local storage can be tampered with | Runtime validation/reexecution | public-only state; final submission reruns exact files server-side |

## Entry points

- `POST /api/challenges/generate`
- `POST /api/challenges/execute`
- `POST /api/challenges/assess`
- `GET /api/health`
- Project/skill/difficulty controls
- Source, hypothesis, and explanation text
- Browser-local saved attempt
- Provider responses and Code Interpreter logs

## Abuse cases and findings

| Severity | Abuse/failure path | Affected surface | Mitigation | Verification | Residual risk |
| --- | --- | --- | --- | --- | --- |
| High if absent; mitigated | Submit shell command, file ID, or container ID | execute/assess routes | strict schemas accept only challenge ID and bounded file snapshots; server owns command and ephemeral execution | route adversarial tests reject extra keys; source search finds no host subprocess use | OpenAI sandbox behavior still requires live smoke |
| High if absent; mitigated | Path traversal or modification outside allowlist | contracts/workflows | normalized relative path schema, duplicate detection, exact server allowlist | traversal and arbitrary-file tests; fixture allowlist tests | curated catalog correctness remains trusted |
| High if absent; mitigated | Hidden solution leaks through JSON, bundle, storage, or imports | fixtures/DTO/client | server-only fixture modules, explicit public schema, no hidden client imports | API hidden-field tests, client import scan, E2E storage review, bundle string scan procedure | source repository intentionally contains fixture answers server-side |
| High if absent; mitigated | Future hints or a model-generated repair bypass progressive disclosure | hint route/gateway/client | future hints omitted from public challenge; separate strict hint schema; exact approved-step equality and repair/reference rejection | hint workflow/route tests, fixture hint invariant, browser-storage E2E | a learner can still call the bounded hint endpoint out of UI order; hints never contain the completed patch |
| High if absent; mitigated | GPT declares failing patch correct | assessment | execute exact snapshot first; force `not_verified` on any failing/errored result | failing-patch unit, route, and E2E tests | none in current policy path |
| High if absent; mitigated | Prompt injection changes command or reveals answer | GPT inputs | mark file/prose content untrusted; structured output; compare exact approved contract; server-owned command | injection-shaped route test and semantic-invalid-plan tests | generative feedback may still be low quality, but cannot alter evidence |
| Medium; mitigated | Schema-valid plan creates multiple causes or broad patch | generation | exact fixture contract, one root cause, allowlist and patch equality, original-pass/mutated-fail/signature validation | multiple-root/expanded-allowlist/mutation-no-fail tests | limits novelty to approved mutation catalog by design |
| Medium; mitigated | Validation interpreter promotes invalid execution evidence | generation | deterministic original-pass/mutated-fail/signature gates run before the separate interpretation call; the model may veto but cannot release invalid evidence | permissive-interpreter plus invalid-mutation regression and veto/retry regression | live provider conformance awaits credentialed smoke |
| Medium; mitigated | Provider timeout/expiration causes broken lab or internal error disclosure | gateway/workflow/routes | abort timeout, safe error normalization, no provider details, labeled fixture recovery | timeout/expired-runner/malformed-output/missing-key tests | a total server outage still prevents route use |
| Medium; mitigated | Oversized files/output exhaust memory or flood UI | contracts/request guard/output sanitizer | 80 KiB request limit, bounded files/count/text, 8 KiB sanitized output, execution timeout | request and sanitizer tests | serverless platform should add upstream body/concurrency caps |
| Medium; partially mitigated | Distributed rate-limit bypass, spoofed-key memory growth, and API-credit exhaustion | API routes | normalized address, 30 requests/minute/IP/scope, 5,000-bucket cap, expired cleanup, overflow bucket | 31st-request and malformed-address-rotation regression tests | per-process state is not sufficient for horizontally scaled public traffic; add edge/shared limiter |
| Medium; mitigated | Credential leaks via client env/error/log | config/gateway/routes | server-only env read, no `NEXT_PUBLIC_`, safe errors, output key redaction, `.env*` ignore | secret scan, redaction test, client source scan | deployment operator must configure server scope correctly |
| Low; mitigated | Local storage tampering manufactures a report | client persistence | report is learning evidence, not certification; any submission reruns server-side snapshot | refresh/reset E2E and authoritative assess tests | a user can alter their own rendered browser; no external credential is granted |
| Low; mitigated | Local progress tampering unlocks lessons, injects learner prose, or creates false mastery | guided curriculum persistence | strict versioned schema, approved lesson-ID enum, bounded metrics, per-entry parsing, duplicate replacement, verified-only writes | learning-path unit tests and guided success/failure E2E; stored progress is checked for absence of code/hypothesis/explanation | browser owner can alter their own local presentation; progress grants no credential or verification authority |
| Medium if expanded; avoided | Open-ended beginner prompting increases token spend, prompt dependency, or attack surface | learning entry point | guided lessons use existing prevalidated fixtures and deterministic recommendations; no new prompt or endpoint added | guided E2E confirms prevalidated launch and registry-to-fixture unit test proves all nine mappings | live Practice by skill still spends credits when explicitly selected and configured |
| High if absent; mitigated | Learner embeds the expected repair text in a comment, dead branch, or invalid program to fool fixture verification | deterministic fallback | fallback releases a passing result only for exact equality with the server-owned prevalidated repair snapshot; no learner Python runs on the host | comment, syntax-error, dead-code, broad-patch, and unchanged-patch regressions | semantically equivalent alternative repairs require live Code Interpreter and are intentionally not inferred by the non-executing fallback |
| Medium; mitigated | Fixture transcripts are mistaken for a fresh Python execution | fallback UI/report | mode-aware labels say prevalidated verification/snapshot comparison and explicitly state that no learner Python ran on the host; Code Interpreter evidence uses separate wording | primary E2E asserts workspace and report disclosures | judge must still distinguish prevalidated fixture evidence from credentialed live proof |
| Low; mitigated | Anonymous observability accidentally captures learner prose | local event log | strict event schema allows only names, timestamps, bounded IDs/source/outcomes; cap 100 | event-schema unit tests and primary E2E prove no hypothesis/explanation keys | local browser owner can inspect or clear their own event log |
| Medium; mitigated | Verbose irrelevant prose receives a misleadingly high fallback reasoning score | deterministic assessment | challenge-specific server-only causal signal groups and causal-language evidence replace length-based scoring; source is visibly labeled deterministic fallback | passing-repair/irrelevant-prose regression compares grounded and ungrounded scores | heuristic fallback scores are provisional learning feedback, not certification; GPT rubric still requires live credentials |
| Low; partially mitigated | XSS/clickjacking/data exfiltration | app/config | React escaping, strict JSON, CSP, frame denial, no-referrer, restrictive permissions, same-origin policies | production header smoke and axe/browser checks | CSP retains `unsafe-inline`; migrate to nonce-based CSP post-MVP |

## Secret and sensitive-file review

- `.env*` is ignored; `.env.example` is explicitly allowed and empty.
- No live `OPENAI_API_KEY` was present during the July 18 review.
- A repository scan found only a fake `sk-…` token and `/Users/…` path in the output-redaction test.
- No private-key block or committed credential was found.
- `tsconfig.tsbuildinfo`, `.next`, test results, and screenshots are generated artifacts and ignored or excluded from scans/distribution.
- The workspace is not a git repository, so “committed secret” history scanning is not applicable yet. Run a history scan immediately after connecting a repository.

## Dependency and license review

- `npm audit --audit-level=moderate`: zero vulnerabilities at the checkpoint.
- PostCSS is overridden to 8.5.19 across Next.js, Tailwind, and Vitest/Vite.
- Installed-license inventory: predominantly MIT, Apache-2.0, ISC, BSD; reviewed MPL tooling, CC datasets, Python-2.0 argparse, and the LGPL libvips runtime binary used by Sharp.
- Retain all package license files/notices in any distributed dependency bundle and rerun both audit and license inventory immediately before public submission.

## Verification commands

See `docs/TESTING.md` for executable commands. Security-specific gates include schema/adversarial tests, secret and subprocess searches, `npm audit`, production header inspection, public-response inspection, client/bundle string scans, and a credential-controlled live Code Interpreter smoke.

## Review conclusion

No unresolved blocker or high-severity finding remains in the local release candidate. The rate limiter and inline CSP allowances are accepted MVP residual risks, documented for deployment hardening. Live OpenAI isolation and public deployment headers remain external verification gates, not inferred successes.
