# Testing and Quality Map

## Frameworks and Configuration

- Unit and integration tests use Vitest 4, configured in `vitest.config.mts` with the Node environment and the `@` alias mapped to `src/`.
- Vitest excludes `tests/e2e/**`, keeping browser workflows separate from Node suites. Test files are colocated with implementation as `*.test.ts` under `src/lib/`, `src/server/`, and `src/app/api/challenges/`.
- End-to-end tests use Playwright 1.61 with `@axe-core/playwright`; configuration lives in `playwright.config.ts` and browser scenarios live in `tests/e2e/faultsmith.spec.ts`.
- Playwright starts `npm run dev` on `127.0.0.1:3101`, waits for `src/app/api/health/route.ts`, runs tests fully in parallel, retains traces on failure, and captures screenshots only on failure.
- CI uses one quality job in `.github/workflows/ci.yml` on pushes and pull requests to `main`, with read-only repository permissions, concurrency cancellation, Node 24, and Chromium installation.
- The repository has no code-coverage provider, coverage report, minimum line/branch threshold, or mutation-testing configuration.

## Commands and Current Baseline

- `npm test` runs the Vitest suite once through `vitest run`.
- `npm run test:e2e` runs Playwright headlessly; `npm run test:e2e:headed` supports interactive debugging.
- `npm run lint` uses the Next.js core-web-vitals and TypeScript ESLint presets from `eslint.config.mjs`.
- `npm run typecheck` runs `tsc --noEmit` against strict TypeScript settings in `tsconfig.json`.
- `npm run security:bundle` runs `scripts/check-client-bundle.mjs` after a build and fails on forbidden hidden-answer or credential markers in `.next/static`.
- `npm run quality` runs lint, typecheck, Vitest, production build, bundle leakage scan, and Playwright in that order. CI additionally runs `npm audit --audit-level=moderate`.
- A mapper verification run of `npm test` on July 18, 2026 passed all 6 test files and 40 tests; the larger recorded checkpoint is documented in `docs/TESTING.md`.

## Unit and Integration Suites

- `src/lib/attempt-events.test.ts` verifies that local analytics retain only bounded metadata, exclude learner prose, and cap history at 100 events.
- `src/lib/learning-paths.test.ts` verifies registry uniqueness/order, project-skill mappings, strict progress parsing, sequential unlocks, deduplication, and deterministic recommendations.
- `src/server/fixtures.test.ts` is a table-driven fixture invariant suite. It expands `it.each` across all nine fixtures and proves original-pass, mutated-fail, expected-signature match, and repaired-pass.
- `src/server/fixtures.test.ts` also tests adversarial fallback patches, allowlist enforcement, hidden-field stripping, hint separation, and output redaction/truncation.
- `src/server/request-guard.test.ts` exercises content-type/JSON rejection, declared request-size limits, and malformed forwarded-address normalization against rate-limit bypass.
- `src/server/workflows.test.ts` tests workflow policy through an injected gateway: missing-key fallback, original/mutated evidence gates, two-attempt recovery, semantic plan constraints, timeout/expiration recovery, hint safety, model non-authority, score bounds, and causal fallback scoring.
- `src/app/api/challenges/routes.test.ts` calls route handlers directly with Web `Request` objects and asserts safe DTOs, all nine supported catalog combinations, separate hints, strict-field rejection, traversal/command/container-ID rejection, prompt-injection resistance, and 429 responses.
- Tests favor externally meaningful results (`status`, DTO fields, HTTP status, visible evidence) over assertions on private implementation calls, except where bounded retry count is part of policy.

## Test Structure and Assertions

- Suites import `describe`, `it`, `expect`, and limited lifecycle helpers directly from `vitest`; no global test API is configured.
- Test names are complete behavior statements and are grouped by subsystem boundary rather than by individual function name.
- Shared setup is intentionally small. `jsonRequest` in `src/app/api/challenges/routes.test.ts` builds realistic requests; `planFor` and `assessmentRequest` in `src/server/workflows.test.ts` build valid domain fixtures.
- Registry behavior is covered with loops and `it.each`, so adding a new fixture automatically exercises lifecycle invariants in `src/server/fixtures.test.ts`.
- Assertions use exact equality for stable contracts, `toMatchObject` for typed errors, property-absence/string-exclusion checks for secrets, and bounded comparisons for scores and output lengths.
- Async errors use `await expect(...).rejects`; route tests await handler responses and parse JSON rather than starting a server.
- Test data intentionally includes traversal paths, prompt-injection prose, fake API keys, ANSI escapes, local absolute paths, broad patches, comments, syntax errors, and dead-code repair decoys.

## Mocking and Isolation

- Node tests that import protected server modules mock only the `server-only` package with `vi.mock("server-only", () => ({}))`; this keeps the production guard in application code while allowing Vitest imports.
- `src/server/workflows.test.ts` uses a hand-written `MockGateway` implementing `AIGateway`, passed through workflow options. This is dependency injection rather than module-level OpenAI SDK interception.
- The mock can independently substitute planning, original/mutated execution, assessment, hint, and validation-interpretation results, allowing deterministic failure-path testing without external calls.
- Normal automated tests never call OpenAI, by policy in `CONTRIBUTING.md` and `docs/TESTING.md`. Missing credentials are the expected automated route condition.
- Route tests set `process.env.OPENAI_API_KEY` to an empty string in `beforeEach`; they use distinct test IPs where needed because the rate limiter is process-local state.
- Playwright's `openClean` helper installs an origin-scoped init script that clears local storage before app hydration, then removes its one-use query token. This avoids persistence races under fully parallel execution.
- The E2E suite uses the real dev server and deterministic prevalidated API path; it does not mock browser network responses.

## End-to-End Coverage

- `tests/e2e/faultsmith.spec.ts` contains six browser scenarios.
- The primary Expense Approval scenario covers selection, missing-key fallback, initial failure, hypothesis-gated hint, code editing, persistence across reload, passing evidence, assessment report, event privacy, and completed-report restoration.
- The guided success scenario covers a zero-credit fixture launch, verified completion, bounded persisted progress, next-lesson recommendation, and reload restoration.
- A negative guided scenario proves an unchanged failing patch is never marked verified and never records curriculum progress.
- A keyboard/accessibility scenario checks focusable selection/workspace controls and runs axe scans on both the selection and workspace states with zero accepted violations.
- A catalog breadth scenario forges working prevalidated workspaces for Inventory and Notification, complementing the all-nine route and fixture loops.
- A 390 by 844 scenario asserts no horizontal overflow in both roadmap and workspace and checks that editor/submission controls remain visible.
- Playwright locators prefer roles, accessible names, labels, and status text, which simultaneously tests user behavior and the semantic accessibility surface.

## Security, Privacy, and Accessibility Gates

- Contract/security assertions in `src/app/api/challenges/routes.test.ts` and `src/server/fixtures.test.ts` prove hidden root causes, reference solutions, future hints, mutation patches, unsafe commands, and traversal inputs do not cross public boundaries.
- `scripts/check-client-bundle.mjs` is a post-build regression gate for hidden server markers and credential strings that unit response tests cannot detect in compiled client chunks.
- `src/server/fixtures.test.ts` verifies sanitization of API-key-shaped text, ANSI escapes, local user paths, and oversized output.
- `src/server/workflows.test.ts` proves that a permissive assessment/validation model cannot override failing or invalid deterministic evidence.
- `src/lib/attempt-events.test.ts`, `src/lib/learning-paths.test.ts`, and Playwright persistence assertions prove anonymous metadata/progress exclude learner hypotheses, explanations, and code paths.
- Automated accessibility evidence consists of role-based Playwright interaction, focus assertions, axe scans, mobile overflow checks, and semantic landmarks/labels exercised through `tests/e2e/faultsmith.spec.ts`.
- Reduced-motion and contrast behavior in `src/app/globals.css` are documented and manually reviewed in `docs/TESTING.md`; they do not have dedicated computed-style assertions.
- Security headers from `next.config.ts`, production startup, and API smoke behavior are manually evidenced in `docs/TESTING.md`; the automated route suite directly asserts `Cache-Control: no-store` but not the complete production header set.

## Build and Release Gates

- The complete scripted gate in `package.json` fails fast: lint and types must pass before tests, build, leakage scanning, and E2E.
- The bundle scan requires a successful `next build` because it inspects `.next/static`; keep this ordering when changing scripts or CI.
- CI in `.github/workflows/ci.yml` installs dependencies with `npm ci`, installs Playwright Chromium with system dependencies, applies a 20-minute job timeout, and audits production dependencies at moderate severity.
- Playwright sets `forbidOnly` in CI, retries failures once in CI, and uses two CI workers, preventing committed focused tests while limiting contention.
- `docs/TESTING.md` is the authoritative human-readable checkpoint for clean install, production start, curl smoke, manual accessibility/UX review, audit, and live-smoke instructions.

## Coverage Strengths

- The strongest coverage is around the core trust boundary: strict schemas, allowlisted files, hidden-data exclusion, deterministic verification authority, fallback honesty, provider failure recovery, and prompt-injection resistance.
- The curated content registry has unusually strong invariants: every guided lesson maps to exactly one fixture and every fixture proves original, mutation, and repair evidence.
- Negative tests cover multiple ways a naive deterministic evaluator could be fooled, including repair text placed in comments, syntax-invalid code, dead code, unchanged source, and overbroad changes.
- The same primary user journey is exercised across lower-level fixture/workflow/route suites and one full browser flow, giving layered regression evidence.
- Persistence is tested both as pure parsing policy and through page reloads, including privacy assertions on stored analytics and guided progress.
- Accessibility is part of the normal E2E gate rather than a separate optional manual-only process.

## Known Gaps and Planning Implications

- There is no numeric coverage report or threshold, so future planning cannot use line/branch percentages to find unexercised paths; coverage gaps must currently be inferred from suite ownership.
- `src/server/ai-gateway.ts` has no direct adapter tests for OpenAI request construction, response-log extraction, timeout classification, or SDK format changes. Workflow mocks validate policy but not SDK integration fidelity.
- Live GPT-5.6 and Code Interpreter behavior is intentionally excluded from routine automation; the controlled live smoke in `docs/TESTING.md` remains a credentialed external gate.
- `src/components/faultsmith-app.tsx` and `src/components/guided-roadmap.tsx` have no component-level tests. Their behavior is covered only through six broad Playwright scenarios, making fine-grained UI state regressions slower to localize.
- `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/not-found.tsx`, and the complete health response shape have no dedicated automated suites.
- E2E runs against the development server, not `next start`; production behavior is checked by documented manual smoke rather than browser automation.
- Playwright has no explicit multi-browser project matrix, visual snapshot tests, or desktop viewport matrix. Automated responsive coverage is concentrated on the default viewport and 390 by 844.
- Security-header assertions, reduced-motion computed behavior, detailed contrast values, and bundle-size/performance budgets are not automated. The client-bundle script scans forbidden content, not size.
- The in-memory rate limiter is covered within one Node process, but there is no concurrency, multi-instance, proxy-chain, or long-window integration test.
- CI runs `npm audit` after `npm run quality`, while local `npm run quality` does not include the audit; contributors must run the separate audit command documented in `CONTRIBUTING.md` for CI parity.
