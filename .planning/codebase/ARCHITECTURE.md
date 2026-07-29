# Architecture

**Analysis Date:** 2026-07-18

## Pattern Overview

**Overall:** Full-stack Next.js App Router monolith with a browser-resident learning workbench, thin HTTP controllers, a server-only workflow layer, and a fixture-bounded optional AI execution adapter.

**Key Characteristics:**
- The single public page at `src/app/page.tsx` renders an interactive client application rather than a set of feature routes.
- Browser code owns transient learning-session state; the server is request-oriented and has no database or user-account layer.
- Route handlers in `src/app/api/` form a backend-for-frontend boundary around challenge generation, execution, hints, and assessment.
- Shared Zod schemas in `src/lib/contracts.ts` define both runtime validation and TypeScript types across browser/server boundaries.
- Hidden challenge answers and execution policy live behind `server-only` imports in `src/server/`.
- Live OpenAI behavior is optional and deliberately constrained by server-owned fixtures; every live path has a deterministic fallback.
- Executed or prevalidated test evidence is authoritative, while model-generated interpretation and feedback remain subordinate.

## Dependency Direction

```text
`src/app/page.tsx`
  -> `src/components/faultsmith-app.tsx`
  -> HTTP `/api/challenges/*`
  -> `src/app/api/challenges/*/route.ts`
  -> `src/server/workflows.ts`
  -> fixtures / deterministic runner / AI gateway
  -> OpenAI Responses API + Code Interpreter (optional)
```

- Browser modules import shared modules from `src/lib/`, but never import `src/server/`.
- Route handlers depend on request guards, public request schemas, and workflow functions; they contain little domain logic.
- `src/server/workflows.ts` coordinates services and adapters and is the central application layer.
- Lower-level server modules depend on shared public types, while `server-only` prevents accidental inclusion in the client graph.
- There is no repository/data-access layer because durable server persistence is intentionally absent.

## Layers

**App Shell and Routing Layer:**
- Purpose: Declare the HTML shell, public page, HTTP endpoints, and framework error states.
- Contains: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/not-found.tsx`, and `src/app/api/**/route.ts`.
- Depends on: UI components for pages; contracts, request guards, and workflows for API handlers.
- Used by: Next.js App Router at render time and on incoming HTTP requests.

**Client Learning Workbench:**
- Purpose: Implement the learner-facing stage machine, editing experience, progressive hints, reporting, local recovery, and curriculum UI.
- Contains: The orchestrating client component `src/components/faultsmith-app.tsx` and curriculum renderer `src/components/guided-roadmap.tsx`.
- Depends on: Browser APIs, React state/effects, static catalogs, learning helpers, and public Zod contracts from `src/lib/`.
- Used by: The server-rendered home entry `src/app/page.tsx` through the `"use client"` boundary.

**Shared Domain and Contract Layer:**
- Purpose: Define safe public DTOs, project metadata, anonymous event shapes, and curriculum/progress rules usable on both sides of the network.
- Contains: `src/lib/contracts.ts`, `src/lib/catalog.ts`, `src/lib/attempt-events.ts`, and `src/lib/learning-paths.ts`.
- Depends on: Zod plus local type relationships; it does not import server-only modules.
- Used by: Client components, API routes, server workflows, fixtures, and tests.

**HTTP Boundary Layer:**
- Purpose: Turn untrusted HTTP requests into validated workflow calls and normalize responses.
- Contains: `src/app/api/challenges/generate/route.ts`, `src/app/api/challenges/execute/route.ts`, `src/app/api/challenges/hint/route.ts`, `src/app/api/challenges/assess/route.ts`, and `src/app/api/health/route.ts`.
- Depends on: `src/server/request-guard.ts`, `src/lib/contracts.ts`, and `src/server/workflows.ts`.
- Used by: Browser `fetch` calls issued by `postJson` in `src/components/faultsmith-app.tsx`.

**Application Workflow Layer:**
- Purpose: Enforce the learning loop, select live versus fallback behavior, validate AI results against approved fixtures, and keep tests authoritative.
- Contains: `src/server/workflows.ts` and DTO construction in `src/server/challenge-service.ts`.
- Depends on: Fixture catalog, fixture runner, AI gateway interface, request errors, and shared contracts.
- Used by: Challenge route handlers and workflow unit tests in `src/server/workflows.test.ts`.

**Fixture and Deterministic Evidence Layer:**
- Purpose: Hold approved Python challenge snapshots, hidden solutions, fixed tests, rubrics, hints, and a no-execution fallback verifier.
- Contains: `src/server/fixtures.ts`, `src/server/fixture-runner.ts`, and mutation/hint/validation schemas in `src/server/*-contract.ts`.
- Depends on: Shared file/test types and server-only mutation contracts.
- Used by: Workflow generation, execution, assessment, public challenge projection, and server tests.

**Provider Adapter Layer:**
- Purpose: Isolate all OpenAI SDK and Code Interpreter behavior behind a mockable contract.
- Contains: `AIGateway`, `OpenAIGateway`, and credential detection in `src/server/ai-gateway.ts`.
- Depends on: OpenAI Responses API, structured-output schemas, server-owned fixtures, and output sanitation.
- Used by: `src/server/workflows.ts`; tests inject fake `AIGateway` implementations rather than calling the network.

## Key Abstractions

**Public Contracts:**
- Purpose: Bound every network-visible ID, path, file, string, count, status, and response shape.
- Examples: `publicChallengeSchema`, `executeRequestSchema`, and `assessmentResponseSchema` in `src/lib/contracts.ts`.
- Pattern: Strict Zod schemas are the runtime source of truth; types are inferred from schemas.

**ChallengeFixture:**
- Purpose: Represent one approved lab including public presentation data and hidden original/mutated evidence.
- Location: Type and registry in `src/server/fixtures.ts`.
- Pattern: Immutable-looking in-memory catalog entries constructed by `createFixture`; selected by challenge ID or project/skill pair.

**Public Challenge Projection:**
- Purpose: Strip hidden fixture state before crossing the server/browser boundary.
- Location: `toPublicChallenge` in `src/server/challenge-service.ts`.
- Pattern: Explicit projection followed by `publicChallengeSchema.parse`, not object spreading of the full fixture.

**AIGateway:**
- Purpose: Make mutation planning, isolated tests, hint delivery, evidence interpretation, and reasoning assessment replaceable and testable.
- Location: Interface and production implementation in `src/server/ai-gateway.ts`.
- Pattern: Dependency injection through optional workflow arguments in `src/server/workflows.ts`.

**Deterministic Fixture Runner:**
- Purpose: Keep the demo functional without executing learner Python on the application host.
- Location: `runFixtureTests` in `src/server/fixture-runner.ts`.
- Pattern: Exact comparison to the server-owned repaired snapshot plus a minimal-change boundary; it is intentionally not a Python interpreter.

**Client Stage Machine:**
- Purpose: Coordinate the linear UI lifecycle `configure -> forging -> workspace -> report`.
- Location: `Stage` and state transitions in `src/components/faultsmith-app.tsx`.
- Pattern: A single stateful coordinator renders specialized view functions and persists safe checkpoints to local storage.

**Guided Curriculum:**
- Purpose: Map nine ordered lessons to existing fixture-backed challenges and unlock them sequentially.
- Location: Static curriculum and pure progress functions in `src/lib/learning-paths.ts`, rendered by `src/components/guided-roadmap.tsx`.
- Pattern: Versioned, validated browser-local progress with deterministic recommendation rules.

## Data Flow

**Initial Page and State Restoration:**
1. Next.js renders `src/app/layout.tsx` and the server component `src/app/page.tsx`.
2. `src/app/page.tsx` introduces the client boundary by rendering `FaultSmithApp` from `src/components/faultsmith-app.tsx`.
3. On hydration, effects parse curriculum progress and saved attempts from `localStorage` using schemas from `src/lib/contracts.ts` and `src/lib/learning-paths.ts`.
4. A valid saved assessment resumes the report; a valid incomplete attempt resumes the workspace; invalid storage is ignored or removed.

**Challenge Generation:**
1. The client posts project, skill, difficulty, and live preference to `src/app/api/challenges/generate/route.ts`.
2. The route applies the per-scope in-memory rate limit, caps/parses JSON through `src/server/request-guard.ts`, and validates with `generateChallengeRequestSchema`.
3. `generateChallengeWorkflow` in `src/server/workflows.ts` selects an approved fixture from `src/server/fixtures.ts`.
4. In prevalidated or missing-key mode, `getPrevalidatedChallenge` returns an explicit public projection.
5. In live mode, `OpenAIGateway` proposes the already-approved contract, runs original and mutated snapshots in Code Interpreter, and returns a validation interpretation.
6. The workflow releases a generated challenge only if contract equality, original-pass, mutated-fail, failure-signature, and interpretation gates all pass; after two failures it returns the fixture fallback.
7. `toPublicChallenge` removes the hidden solution/root cause and the client revalidates the received DTO before entering the workspace.

**Test Execution and Hinting:**
1. The workspace submits only the challenge ID, bounded allowlisted file snapshots, and an execution-mode label to `src/app/api/challenges/execute/route.ts`.
2. `executeChallengeWorkflow` re-resolves the server-owned fixture and rechecks exact file membership.
3. Live generated attempts run fixed `python -m pytest -q` behavior in OpenAI Code Interpreter; provider error/timeout/missing-key states recover through `runFixtureTests`.
4. Hint requests go through `src/app/api/challenges/hint/route.ts`; live output must exactly equal the approved hint at the requested index and must not contain the fixed snippet/reference solution.
5. Results return with `Cache-Control: no-store`; the client parses them and updates the browser-local checkpoint.

**Assessment:**
1. The client records the current hypothesis, exact edited files, reasoning, hint count, run count, and elapsed time, then posts to `src/app/api/challenges/assess/route.ts`.
2. `assessChallengeWorkflow` computes changed files/lines against the mutated fixture and calls the same execution workflow on the submitted snapshot.
3. A deterministic rubric produces fallback scores; when configured, `AIGateway.assess` can replace the narrative scores.
4. Regardless of model output, any non-passing test result forces `completionStatus: "not_verified"`.
5. Only a verified guided attempt is recorded into validated local curriculum progress by `src/components/faultsmith-app.tsx`.

**State Management:**
- Server application state is limited to process-local rate-limit buckets in `src/server/request-guard.ts`; challenge definitions are static module data.
- Attempt, learning progress, and anonymous events are browser-local under versioned keys in `src/components/faultsmith-app.tsx`.
- There is no account, cookie session, server-side attempt record, queue, cache service, or database.
- Each execute/assess request re-derives authority from a server fixture rather than trusting restored browser state.

## Trust Boundaries

**Browser to Route Handlers:**
- Everything in headers, JSON, challenge IDs, paths, code, and prose is untrusted.
- `src/server/request-guard.ts` enforces content type, an 80 KiB body ceiling, safe JSON parsing, and scoped rate limiting.
- Strict schemas in `src/lib/contracts.ts` reject extra keys and bound path syntax, arrays, counts, and text sizes.

**Public DTO to Hidden Fixture State:**
- `src/server/fixtures.ts` and related contracts use `server-only` and must never enter a client import graph.
- `src/server/challenge-service.ts` constructs public fields explicitly so hidden root causes, reference fixes, rubrics, and future hints are omitted.

**Server to OpenAI Models:**
- Project files and learner prose are treated as untrusted data inside fixed instructions in `src/server/ai-gateway.ts`.
- Structured outputs are schema-validated, and mutation/hint outputs face semantic equality gates owned by `src/server/workflows.ts`.

**Server to Code Interpreter:**
- Learner Python must not execute on the Next.js host.
- `src/server/ai-gateway.ts` sends server-assembled snapshots to an ephemeral provider container, owns the pytest command, forbids network/package/environment access in instructions, and applies a 20-second abort timeout.

**Execution Evidence to Assessment:**
- Model feedback is probabilistic; pass/fail status is authoritative.
- `src/server/workflows.ts` deterministically vetoes verified status whenever the final test result is not passing.

**Browser Storage to Restored UI:**
- Local storage can be modified by the learner and grants no external credential.
- Public challenge, assessment, file, event, and curriculum data are validated during restore; final submission always reruns the exact files server-side.

## Entry Points

**Home UI:** `src/app/page.tsx` exposes `/` and renders `src/components/faultsmith-app.tsx`.

**Challenge Generation:** `src/app/api/challenges/generate/route.ts` exposes `POST /api/challenges/generate`.

**Test Execution:** `src/app/api/challenges/execute/route.ts` exposes `POST /api/challenges/execute`.

**Progressive Hint:** `src/app/api/challenges/hint/route.ts` exposes `POST /api/challenges/hint`.

**Final Assessment:** `src/app/api/challenges/assess/route.ts` exposes `POST /api/challenges/assess`.

**Health Probe:** `src/app/api/health/route.ts` exposes dynamic `GET /api/health` for runtime readiness and optional-key status.

**Framework Recovery:** `src/app/error.tsx`, `src/app/global-error.tsx`, and `src/app/not-found.tsx` are App Router error/not-found entry points.

## Error Handling

**Strategy:** Validate and normalize errors at the HTTP edge, recover provider failures inside workflows, and show bounded messages in the client without leaking internals.

**Patterns:**
- Route handlers wrap their body in `try/catch` and return `safeErrorResponse` from `src/server/request-guard.ts`.
- Expected failures use `RequestError` with a safe message, code, HTTP status, and retryable flag.
- Unexpected errors collapse to a generic 500 response; raw provider errors and stack traces are not serialized.
- Provider absence, timeout, invalid live generation, invalid hinting, and model-assessment errors normally degrade to prevalidated behavior in `src/server/workflows.ts`.
- Client responses are independently parsed with Zod, and fetch failures become a user-visible `error` state in `src/components/faultsmith-app.tsx`.
- App Router rendering failures are handled by `src/app/error.tsx` and `src/app/global-error.tsx`, both preserving browser-local recovery semantics.

## Cross-Cutting Concerns

**Validation:** Strict Zod contracts span HTTP inputs, outputs, stored progress, event records, and model structured outputs.

**Security Headers:** `next.config.ts` applies CSP, HSTS, frame denial, same-origin resource policies, referrer suppression, MIME protection, and restrictive permissions.

**Output Safety:** `sanitizeTestOutput` in `src/server/fixture-runner.ts` strips ANSI escapes, key-shaped strings, local user paths, and output beyond 8,000 characters.

**Observability:** There is no server telemetry service; `src/lib/attempt-events.ts` supports a capped, anonymous, local-only browser event history, while render errors log only a digest.

**Authentication and Authorization:** There is no identity system. Rate limits and challenge allowlists protect public endpoints, but progress and reports are personal learning evidence rather than credentials.

**Caching:** Challenge HTTP responses and the health route use `Cache-Control: no-store`; no application cache abstraction exists.

**Testing Seams:** Pure domain helpers, injected `AIGateway` implementations, direct route-handler calls, fixture invariants, and browser E2E flows support validation without paid external calls.

---

*Architecture analysis: 2026-07-18*
*Update when request flows, trust boundaries, persistence, or provider execution patterns change.*
