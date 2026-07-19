# Phase 2: Credential-Controlled Live OpenAI Proof - Context

**Gathered:** 2026-07-18
**Status:** Ready for planning
**Source:** locked PRD/execution goal plus user-directed offline-first sequencing

<domain>
## Phase Boundary

Make the already implemented GPT-5.6 and Code Interpreter path genuinely plug-and-play for one controlled local credential-backed proof. Before requesting a key, finish every safe offline prerequisite: executable preflight/smoke tooling, sanitized evidence capture, negative/fallback simulations, operator documentation, deployment-readiness checks, and submission/UAT preparation that can be built without external state.

The phase may prepare deployment artifacts but must not deploy, configure a real host credential, recruit/claim tester results, publish a video, or mark LIVE/DEP/UAT/SUB evidence complete without objective external proof.

</domain>

<decisions>
## Implementation Decisions

### Credential and cost boundary
- Normal CI and default local verification make no paid OpenAI call.
- A live smoke requires both an existing server configured with a server-only `OPENAI_API_KEY` and an explicit operator flag; absence of either must fail closed or exercise the labeled fixture path without printing the key.
- Evidence output must never include credential fragments, provider container IDs, internal prompts, hidden fixture answers, raw provider responses, or learner source beyond stable hashes/approved public metadata.

### Offline-first sequencing
- Build and test all harness structure before the user configures the key.
- Mocked/fake-server tests must cover the complete expected live lifecycle, invalid schemas/statuses, fallback, timeouts, response redaction, evidence-file safety, and non-zero exit behavior.
- Preserve the validated fixture fallback and make the offline fallback smoke runnable with no key.

### Pre-deployment readiness
- Keep deployment Vercel-compatible as required by the PRD, but do not deploy without explicit approval.
- Prepare repeatable production smoke checks for local or remote base URLs, including unauthenticated root/health, security headers, cache behavior, fallback truth, and expected-live mode.
- Treat edge/shared rate limiting and CSP nonce/hash feasibility as deployment decisions that must be verified on the selected host; tooling/docs may require and record them but may not pretend they are already configured.

### Submission readiness
- Prepare a five-tester script/result schema, recording checklist, evidence manifest, and final placeholder/link audit without inventing results.
- The fallback remains a valid recording path if accurately labeled; a live claim may be used only after the credential-controlled proof passes.

### Locked product/safety boundary
- Do not add runtime agents, arbitrary prompts, repository ingestion, learner shell commands, host Python execution, authentication, or a public SDK.
- Deterministic execution evidence remains authoritative; GPT may score or veto but never promote failing/overbroad evidence.

### Codex discretion
- Exact script names, evidence JSON schema, CLI ergonomics, fake-server test design, and documentation layout.
- Whether deployment-preflight and submission-audit tooling live in one executable or small focused scripts, provided each has regression coverage and safe defaults.

</decisions>

<specifics>
## Specific Ideas

- One command should prove the no-key fallback path now.
- One explicit command should become the final plug-in-key live proof later.
- The live evidence should bind repository SHA, timestamp, base URL origin, safe mode labels, lifecycle statuses, and gate results without sensitive payloads.
- The deployment command should work against `127.0.0.1` now and an approved HTTPS URL later.

</specifics>

<deferred>
## Deferred Ideas

- Actual OpenAI call: deferred only until the user configures/authorizes the key.
- Actual public deployment: Phase 3 approval gate.
- Tester results, video publication, final URLs, and `/feedback` ID: Phase 4 external gate.
- Adaptive prompts, repository upload, accounts, cohorts, and public npm package: post-submission PRD cycle.

</deferred>

---

*Phase: 02-credential-controlled-live-openai-proof*
*Context gathered: 2026-07-18 from locked documents and current user direction*
