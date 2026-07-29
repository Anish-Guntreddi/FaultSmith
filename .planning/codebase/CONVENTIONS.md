# Coding Conventions

## Scope and Sources

- These conventions describe the repository as implemented, primarily under `src/`, plus the enforced guidance in `AGENTS.md` and `CONTRIBUTING.md`.
- `AGENTS.md` warns that the installed Next.js version has breaking changes; read the relevant guide under `node_modules/next/dist/docs/` before changing Next.js code.
- The central product invariant from `CONTRIBUTING.md` is evidence-first: tests and server-owned policy decide verification, while model output may coach or assess but cannot override failing evidence.

## Formatting and Module Style

- TypeScript and TSX use two-space indentation, double-quoted strings, semicolons, and trailing commas in multiline calls, objects, arrays, imports, and parameter lists.
- The repository has ESLint configuration in `eslint.config.mjs` but no Prettier configuration; match nearby formatting rather than assuming a separate formatter.
- Cross-layer imports normally use the `@/` alias configured in `tsconfig.json`, such as `@/lib/contracts`; sibling server modules use relative imports, as in `src/server/workflows.ts`.
- Import order is generally side-effect guards first, third-party modules second, aliased application imports third, and relative imports last. Server modules such as `src/server/ai-gateway.ts` begin with `import "server-only";`.
- Use `import type` for type-only dependencies and colocate the type with the schema or implementation that owns it.
- Domain helpers, schemas, constants, and components use named exports. App Router pages and error boundaries use default exports in `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/error.tsx`, `src/app/global-error.tsx`, and `src/app/not-found.tsx`.
- The code favors small pure helpers around a few orchestration functions; examples include `editableFiles` in `src/components/faultsmith-app.tsx`, `validateSubmittedFiles` in `src/server/fixture-runner.ts`, and `resolveLiveOptions` in `src/server/workflows.ts`.

## Naming

- Functions, variables, hooks, and module-local helpers use `camelCase`; React components, classes, interfaces, and type aliases use `PascalCase`.
- Constants that encode fixed operational policy use `UPPER_SNAKE_CASE`, for example `MAX_REQUEST_BYTES` in `src/server/request-guard.ts`, `MODEL` in `src/server/ai-gateway.ts`, and storage keys in `src/components/faultsmith-app.tsx`.
- Zod schemas use a descriptive `camelCase` name ending in `Schema`, with their inferred TypeScript type immediately following, as demonstrated throughout `src/lib/contracts.ts`.
- Route handlers use App Router HTTP verb names such as `GET` and `POST`; route-level duration and rendering controls use Next.js convention names such as `maxDuration` and `dynamic`.
- Test descriptions use behavior-oriented prose and group around a boundary or subsystem, for example `describe("challenge route security boundary", ...)` in `src/app/api/challenges/routes.test.ts`.
- Persistent browser keys are namespaced and versioned (`faultsmith:attempt:v2`, `faultsmith:events:v1`, and `faultsmith:learning-progress:v1`) in `src/components/faultsmith-app.tsx`.

## Types, Contracts, and Validation

- TypeScript strict mode is enabled in `tsconfig.json`; avoid `any` and accept `unknown` at untrusted boundaries until validation succeeds.
- Zod is the canonical runtime-contract layer. Shared public/request/response schemas live in `src/lib/contracts.ts`; hidden model contracts live in server-only modules such as `src/server/mutation-contract.ts`, `src/server/hint-contract.ts`, and `src/server/validation-contract.ts`.
- Object schemas are normally `.strict()` so unknown fields are rejected rather than silently stripped. Arrays, strings, scores, counts, elapsed time, file sizes, and path formats all receive explicit bounds.
- Use `safeParse` for user, network, or persisted data when the caller needs controlled recovery. Use `parse` for internal invariants and for validating an outbound value before it crosses a boundary.
- Types are inferred from Zod with `z.infer` where a runtime schema owns the shape; hand-written `type` declarations remain appropriate for internal state, component props, options, and curated registry structures.
- File paths must remain project-relative, bounded, and traversal-free through `fileSnapshotSchema` in `src/lib/contracts.ts`; server workflows additionally enforce fixture-specific allowlists with `validateSubmittedFiles` in `src/server/fixture-runner.ts`.
- Public DTOs are constructed explicitly in `src/server/challenge-service.ts`. Do not spread server fixture objects into browser responses because fixtures contain hidden root causes, repair material, and failure signatures.

## Server and Workflow Boundaries

- Keep credentials, model prompts, hidden answers, fixture policy, and provider execution in `src/server/` modules protected by `server-only`.
- Treat project files and learner prose as untrusted data, never instructions. `src/server/ai-gateway.ts` serializes them as structured input and validates structured model output before use.
- Learner Python must not execute on the Next.js host. Live execution belongs to isolated Code Interpreter; deterministic fallback in `src/server/fixture-runner.ts` compares against a server-owned repair snapshot.
- Workflows in `src/server/workflows.ts` accept injected `AIGateway` options for testability and centralize live/fallback policy rather than putting provider decisions in route files.
- Deterministic gates run before model interpretation: original must pass, mutation must fail, and the approved failure signature must match. A model may veto release but must never promote invalid evidence.
- Recovery is intentionally bounded: mutation planning tries at most twice, Code Interpreter timeout/error recovers to the deterministic fixture, and unsafe hints recover to an approved progressive hint.
- Responses involving learner work use `Cache-Control: no-store`; challenge routes in `src/app/api/challenges/*/route.ts` validate input, delegate to a workflow, and return a safe response.

## Error Handling

- Use `RequestError` from `src/server/request-guard.ts` for expected client-facing failures, including a stable code, HTTP status, and retryability flag.
- Convert route failures through `safeErrorResponse`; unknown exceptions become a generic `INTERNAL_ERROR` response and must not expose stack traces, provider details, commands, identifiers, or hidden policy.
- Catch recoverable provider failures inside `src/server/workflows.ts` and return an honestly labeled prevalidated fallback rather than treating unavailable live evidence as live success.
- Client request helpers in `src/components/faultsmith-app.tsx` enforce a timeout, reject non-2xx responses, re-validate response contracts, and render a safe user-facing error message.
- Browser-local persistence and anonymous event recording are best-effort. Storage failures are caught so they cannot block the learning workflow; corrupt progress or attempts are discarded or removed.
- App-level failures use the retry boundaries in `src/app/error.tsx` and `src/app/global-error.tsx`; the regular error boundary logs only the route error digest, not sensitive error content.

## State and Persistence

- Interactive state is centralized in `FaultSmithApp` in `src/components/faultsmith-app.tsx` with React `useState`, derived lookup through `useMemo`, and storage/hydration effects through `useEffect`.
- The app has no database. Anonymous attempts, events, and guided progress persist only in `window.localStorage` under the versioned keys declared in `src/components/faultsmith-app.tsx`.
- Treat restored storage as untrusted: parse challenge and assessment DTOs with Zod, validate file paths against the restored allowlist, filter and clamp scalar/history values, and cap hint/history lengths.
- Guided progress parsing in `src/lib/learning-paths.ts` rejects unknown fields and lesson IDs, removes malformed entries, deduplicates by lesson, and keeps the newest completion.
- Anonymous events in `src/lib/attempt-events.ts` use a strict metadata-only schema, omit hypotheses/explanations/source content, and retain at most 100 entries.
- State transitions use explicit string unions such as `Stage`, `RequestState`, and `LearningMode`; completion and evidence states also use bounded enums from `src/lib/contracts.ts`.

## React, Styling, and Accessibility

- Add `"use client"` only to modules that need browser APIs, effects, or event handlers, as in `src/components/faultsmith-app.tsx`, `src/app/error.tsx`, and `src/app/global-error.tsx`.
- UI components are function components with local prop types. Shared domain state stays in `FaultSmithApp`; presentational workflow sections are extracted as `ConfigureView`, `ForgingView`, `WorkspaceView`, `ReportView`, and `GuidedRoadmap`.
- Styling primarily uses inline Tailwind utility classes. Global tokens, reset rules, scrollbar treatment, animation, contrast overrides, and reduced-motion behavior live in `src/app/globals.css`.
- Preserve semantic landmarks and accessible names: labeled `section`/`aside` elements, `fieldset`/`legend`, explicit textarea labels, `aria-pressed`, `aria-live`, `role="status"`, and `role="alert"` are established patterns in `src/components/`.
- Interactive controls use visible `focus-visible` rings, disabled states, and status text that does not rely on color alone. Decorative marks use `aria-hidden`.
- Reduced-motion support in `src/app/globals.css` collapses animation duration and disables repeated animation; new animation should participate in that policy.

## Change Discipline

- Before changing Next.js behavior, consult `AGENTS.md` and the relevant installed framework guide; do not rely on older App Router conventions.
- Preserve the separation between shared public contracts in `src/lib/` and hidden server contracts in `src/server/` to prevent client-bundle leakage.
- Update `docs/TESTING.md`, `docs/THREAT_MODEL.md`, `docs/BUILD_LOG.md`, or `docs/ROADMAP.md` when implementation changes alter their evidence or assumptions, per `CONTRIBUTING.md`.
- Run the complete gate defined in `package.json` for implementation changes, and do not introduce normal tests that make live OpenAI calls.
