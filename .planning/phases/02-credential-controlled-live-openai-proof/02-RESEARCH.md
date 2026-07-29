---
phase: 02-credential-controlled-live-openai-proof
researched: 2026-07-18
status: complete
sources: repository, official-openai-docs, official-build-week-rules, bundled-next-16-docs
---

# Phase 2 Research: Offline-First Live and Release Readiness

## Executive conclusion

FaultSmith does not need another OpenAI application architecture. The production code already has a server-only `gpt-5.6` gateway, strict Structured Outputs, auto-created 1 GB Code Interpreter containers, 20-second execution aborts inside 30-second route limits, exact contract equality, retry/fallback, strict public DTOs, and deterministic assessment authority. Phase 2 should add an operator-grade HTTP harness and evidence model around those routes, not bypass them with direct SDK calls.

All paid behavior must remain opt-in. The default harness path should prove the missing-key fallback today; the live path must require an explicit `--live` flag and a running server whose `/api/health` reports `liveOpenAIConfigured: true`. Normal CI tests the harness against fake HTTP servers and makes no OpenAI call.

## Current architecture relevant to the phase

| Surface | Existing behavior | Phase 2 implication |
| --- | --- | --- |
| `/api/challenges/generate` | exact approved contract; original pass; mutated fail/signature; strict interpretation; retry then fallback | live smoke must require `source: generated`, failing Code Interpreter evidence, and no hidden fields |
| `/api/challenges/hint` | one exact approved hint; live divergence recovers to prevalidated | live proof requires `source: gpt-5.6`; offline proof requires labeled prevalidated recovery |
| `/api/challenges/execute` | server-owned fixed runner; Code Interpreter timeout/error recovers to fixture | smoke must prove failing mutated files, passing minimal repair, execution mode, and fallback truth |
| `/api/challenges/assess` | reruns exact files; GPT returns only three scores; deterministic prose/completion/minimality | smoke must prove passing repair can verify, failing repair cannot, and live score source cannot override evidence |
| `/api/health` | no-store status, boolean live configuration, fallback readiness | safe credential-presence gate without printing a key |
| Next production | Node server scripts, security headers, dynamic API routes, 30-second max duration | production smoke can be host-neutral; Vercel needs no application rewrite |

## Official platform constraints

- Current OpenAI Code Interpreter guidance supports `gpt-5.6`, `tool_choice: required`, and auto containers with `memory_limit: 1g`; the implementation matches that shape.
- Code Interpreter containers are ephemeral and expire after inactivity. Evidence must store safe lifecycle facts, never rely on container reuse, and never persist or print container identifiers.
- `store: false` is already set on every Responses call and should remain invariant.
- The bundled Next 16 deployment guide says a Node.js server with `build` and `start` supports all Next features; Vercel is a verified adapter. Static export is unsuitable because FaultSmith needs server routes and secrets.
- Next environment guidance confirms unprefixed variables remain server-only and `.env*` files should not be committed. `OPENAI_API_KEY` must never gain a `NEXT_PUBLIC_` alias.
- Official Build Week rules require a working project accessible for judging through a website, functioning demo, or test build, plus a public video and repository. They do not mandate Vercel by name, but a public web deployment is the clearest path for this browser application.

## Recommended harness architecture

### Shared safe HTTP core

Create a small importable `.mjs` module used by both live and production smoke CLIs. It should:

- normalize a base URL; permit HTTP only for loopback and require HTTPS otherwise;
- apply per-request aborts longer than the 30-second route ceiling but still bounded;
- parse JSON with stage-specific structural assertions;
- reject hidden field names recursively;
- never include response bodies in thrown messages;
- return only safe stage/status/count/mode/source facts;
- hash sanitized output when evidence needs correlation instead of storing output;
- provide a stable evidence schema/version and atomic JSON write only to an explicitly requested path.

### Offline fallback smoke (default)

Against a running production server with no key:

1. root and health are HTTP 200; health reports fallback ready and live false;
2. generation requests `preferLive: true` and safely recovers to a prevalidated failing challenge;
3. first hint safely recovers to prevalidated;
4. mutated execution fails in `prevalidated_fixture` mode;
5. the known minimal Expense boundary repair passes;
6. repaired assessment is verified and deterministic;
7. failing assessment remains not verified;
8. no hidden field or sensitive error/body is emitted into evidence.

### Explicit live smoke

The same route-level lifecycle runs only with `--live`:

1. health must report live configured before any POST;
2. generation must return `source: generated`, failed Code Interpreter evidence, and the approved primary challenge;
3. first hint must return `source: gpt-5.6` without a completed repair;
4. mutated execution must fail in Code Interpreter with no fallback;
5. minimal repaired execution must pass in Code Interpreter with no fallback;
6. repaired assessment must be verified with score source `gpt-5.6` while prose remains server-owned;
7. failing assessment must remain `not_verified` even if GPT scoring succeeds;
8. evidence records only safe public metadata, booleans, counts, modes, SHA, timestamp, and output digests.

The script should never read or print `OPENAI_API_KEY`; it observes server readiness through health. The server operator loads `.env.local` using Next. This separation prevents the harness from becoming a second secret-handling path.

### Repair fixture

The primary demo already publicly teaches the one-line `>` to `>=` repair. The harness may apply that exact bounded transformation to the returned editable file, assert it changed exactly once, and never serialize file contents into evidence. If the live generated public files drift, fail with a stable rule ID instead of guessing.

## Fake-server and adversarial testing

Use Node's in-process HTTP server in Vitest; no new dependency is required. Cover:

- full fallback and full live lifecycle;
- explicit live flag absent/present;
- live flag with health false fails before POST;
- non-loopback HTTP URL rejected;
- timeout/abort and non-JSON response;
- HTTP error without body disclosure;
- hidden field injected at any depth;
- generated/prevalidated source mismatch;
- Code Interpreter/fallback mode mismatch;
- mutated-pass, repaired-fail, and failing-assessment promotion attempts;
- hint source mismatch or repair-shaped hint;
- duplicate/zero repair transformation;
- evidence JSON contains no source, hint, prose, output, provider IDs, credentials, absolute paths, or control characters;
- optional evidence write uses a caller-provided path and a versioned schema.

## Pre-deployment and submission preparation

Credential-free artifacts should include:

- a production smoke CLI that checks root/health/status/cache/security headers and can call the shared fallback/live lifecycle against loopback now or approved HTTPS later;
- `docs/DEPLOYMENT.md` with Vercel-compatible build/runtime/env instructions, explicit approval gate, edge/shared rate-limit requirement before public paid use, CSP nonce/hash feasibility decision, rollback to fixture-only operation, and immutable SHA evidence checklist;
- `docs/UAT_PROTOCOL.md` with five-tester consent-neutral script, purpose-comprehension question, task timing, severity rubric, and no invented results;
- a versioned UAT results template/schema and validator that rejects fewer than five testers, learner source/prose, unexpected identifiers, and false success claims;
- a submission audit CLI that reports placeholders, public URL/video/repository expectations, `/feedback` ID, tester threshold, and evidence freshness; default non-strict mode may prepare, while `--strict` must fail until external evidence exists;
- recording checklist updated to choose live language only after the live evidence manifest passes.

Provider/edge limiting and CSP nonce support are target-dependent and cannot be truthfully completed offline. Documentation and smoke tooling should make them explicit blocking decisions instead of adding an unverified dependency.

## Planning boundaries

- Keep LIVE-01–04 open until one real credentialed run passes on a named SHA.
- Keep DEP-01–04 open until deployment is approved and the exact head passes remote smoke.
- Keep UAT/SUB requirements open until actual people, video, URLs, and `/feedback` evidence exist.
- Do not add runtime agents, open-ended prompting, repository ingestion, public npm packaging, host Python execution, or automatic paid CI.

## Validation Architecture

### Test layers

| Layer | Tool | Purpose |
| --- | --- | --- |
| Pure/unit | Vitest | URL policy, hidden-field detection, repair transform, schema/evidence redaction, UAT/submission validation |
| HTTP integration | Vitest + in-process Node HTTP server | fallback/live lifecycle, errors, timeouts, adversarial responses, no paid calls |
| Existing app integration | current route/workflow tests | deterministic policy and fixture/provider recovery remain authoritative |
| Browser | Playwright/axe | existing learner workflow and fallback disclosure remain green |
| Production offline | build/start + smoke CLI | real Next headers/health/fallback lifecycle with no key |
| Live manual gate | explicit CLI against key-configured local production server | only source of LIVE-01–04 provider conformance evidence |
| Remote gate | production smoke against approved HTTPS URL | Phase 3 only |

### Sampling

- After each harness/core task: focused new Vitest file plus lint/typecheck.
- After each documentation/submission task: source scan, claim tests, and validator fixtures.
- After every plan: `npm run security:source && npm test && npm run lint && npm run typecheck`.
- Before the credential checkpoint: full `npm run quality`, audit, production offline smoke, and independent QA/security review.
- After the eventual live run: rerun source scan/full quality/audit; inspect evidence; no committed credential/evidence payload.

### Credential checkpoint

The final plan is `autonomous: false` with a human-action checkpoint. It may verify that the server reports live false, but it must not request the credential value. The user configures `.env.local` privately, starts the reviewed production head, and responds only that the server reports live configured. The continuation runs the explicit live harness, reviews safe evidence, and either closes LIVE-01–04 or adds a mock regression and self-heals.

## Sources consulted

- `docs/PRD.md`, `docs/EXECUTION_GOAL.md`, Phase 1 verification, current application code/tests.
- Official OpenAI Code Interpreter guide and OpenAI data/authentication guidance retrieved July 18, 2026.
- Official OpenAI Build Week Devpost rules retrieved July 18, 2026.
- Bundled Next.js 16.2.10 deployment, production checklist, environment variable, and header documentation.
