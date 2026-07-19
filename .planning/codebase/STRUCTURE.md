# Codebase Structure

**Analysis Date:** 2026-07-18

## Directory Layout

```text
FaultSmith_v0.1/
├── .github/                    # Repository policy, issue templates, dependency updates, and CI
├── .planning/codebase/         # Generated GSD codebase reference maps
├── docs/                       # Product, security, QA, build, demo, and submission records
├── scripts/                    # Standalone repository verification utilities
├── src/                        # Application source
│   ├── app/                    # Next.js App Router pages, boundaries, styles, and HTTP routes
│   │   └── api/                # Route handlers grouped by URL path
│   ├── components/             # Learner-facing client UI and curriculum renderer
│   ├── lib/                    # Browser/server-safe contracts, catalogs, and pure domain helpers
│   └── server/                 # Server-only workflows, fixtures, validation, and OpenAI adapter
├── tests/e2e/                  # Playwright browser journeys
├── AGENTS.md                   # Repository-specific agent instruction
├── next.config.ts              # Next.js runtime and security-header configuration
├── package.json                # Runtime requirements, dependencies, and command surface
├── tsconfig.json               # Strict TypeScript and `@/*` alias configuration
├── vitest.config.mts           # Node unit/integration test configuration
└── playwright.config.ts        # End-to-end test and local web-server configuration
```

## Directory Purposes

**`src/app/`:**
- Purpose: Define the framework-visible application surface using Next.js App Router conventions.
- Contains: Root `layout.tsx`, home `page.tsx`, global CSS, render error boundaries, not-found UI, and nested API route handlers.
- Key files: `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/error.tsx`, and `src/app/global-error.tsx`.
- Subdirectories: `src/app/api/challenges/` groups challenge operations; `src/app/api/health/` provides the readiness endpoint.

**`src/app/api/challenges/`:**
- Purpose: Provide browser-facing POST endpoints for the four learning-loop operations.
- Contains: One folder per operation, each exposing its handler through a framework-named `route.ts`.
- Key files: `src/app/api/challenges/generate/route.ts`, `src/app/api/challenges/execute/route.ts`, `src/app/api/challenges/hint/route.ts`, and `src/app/api/challenges/assess/route.ts`.
- Tests: Cross-route contract and adversarial coverage is colocated at `src/app/api/challenges/routes.test.ts`.

**`src/components/`:**
- Purpose: Hold feature UI outside the route tree.
- Contains: React TSX modules named after the feature they render.
- Key files: `src/components/faultsmith-app.tsx` owns the client state machine and all main views; `src/components/guided-roadmap.tsx` renders curriculum navigation; `src/components/progress-dashboard.tsx` renders the guest My Progress dashboard.
- Structure: Currently flat; view functions for configure/forging/workspace/report remain private to `faultsmith-app.tsx`.

**`src/lib/`:**
- Purpose: Hold modules safe to import from both client and server code.
- Contains: Strict public DTO schemas, static display catalogs, local event validation, and pure curriculum progress logic.
- Key files: `src/lib/contracts.ts`, `src/lib/catalog.ts`, `src/lib/attempt-events.ts`, `src/lib/learning-paths.ts`, `src/lib/progress-contracts.ts`, `src/lib/progress-merge.ts`, and `src/lib/progress-metrics.ts`.
- Tests: Pure-module tests are colocated as `src/lib/*.test.ts` (attempt events, learning paths, progress contracts/merge/metrics).

**`src/server/`:**
- Purpose: Protect hidden challenge data, server workflow policy, request defenses, execution logic, and provider credentials.
- Contains: Files marked with `import "server-only"`, plus their Node-targeted tests.
- Key orchestration: `src/server/workflows.ts`.
- Key infrastructure: `src/server/ai-gateway.ts`, `src/server/request-guard.ts`, and `src/server/fixture-runner.ts`.
- Key domain data: `src/server/fixtures.ts` and `src/server/challenge-service.ts`.
- Structured-output contracts: `src/server/mutation-contract.ts`, `src/server/hint-contract.ts`, and `src/server/validation-contract.ts`.

**`tests/e2e/`:**
- Purpose: Verify the rendered learner journey, accessibility, persistence, security-facing disclosures, and recovery in a real browser.
- Contains: Playwright specifications separate from colocated Vitest tests.
- Key files: `tests/e2e/faultsmith.spec.ts` and `tests/e2e/guided-learning.spec.ts`.
- Runtime: `playwright.config.ts` starts the app on `127.0.0.1:3101` and probes `src/app/api/health/route.ts`.

**`scripts/`:**
- Purpose: Store repository-level quality checks that are not application runtime modules.
- Contains: Node ESM scripts invoked through `package.json`.
- Key file: `scripts/check-client-bundle.mjs` scans production client output for server-only terms and hidden fixture material.

**`docs/`:**
- Purpose: Preserve product intent, security decisions, verification evidence, build history, and competition deliverables.
- Key product files: `docs/PRD.md`, `docs/GUIDED_LEARNING_MVP.md`, and `docs/SAMPLE_PROJECTS.md`.
- Key engineering files: `docs/EXECUTION_GOAL.md`, `docs/BUILD_LOG.md`, `docs/ROADMAP.md`, `docs/THREAT_MODEL.md`, and `docs/TESTING.md`.
- Key delivery files: `docs/DEMO_SCRIPT.md`, `docs/SUBMISSION.md`, and `docs/COMPLETION_REPORT.md`.

**`.github/`:**
- Purpose: Define repository automation and contribution workflow.
- Contains: `CODEOWNERS`, Dependabot configuration, issue templates, pull-request template, and CI.
- Key file: `.github/workflows/ci.yml`.

**`.planning/codebase/`:**
- Purpose: Hold generated codebase maps used by GSD planning and later implementation agents.
- Contains: Markdown reference documents such as `ARCHITECTURE.md` and `STRUCTURE.md`.
- Source: Generated from repository inspection; update after material structural changes.

## Key File Locations

**Runtime Entry Points:**
- `src/app/layout.tsx`: Root HTML/body layout, global stylesheet import, and site metadata.
- `src/app/page.tsx`: Public `/` page and server-to-client component handoff.
- `src/components/faultsmith-app.tsx`: Hydrated application coordinator and main user workflow.
- `src/app/api/health/route.ts`: Dynamic readiness/status GET endpoint.
- `src/app/api/challenges/*/route.ts`: POST API entry points for all challenge operations.

**Core Logic:**
- `src/server/workflows.ts`: Central use-case orchestration and live/fallback policy.
- `src/server/fixtures.ts`: Server-owned registry of nine approved Python labs and hidden answers.
- `src/server/fixture-runner.ts`: Allowlist checks, deterministic fallback verification, line counting, and output sanitation.
- `src/server/challenge-service.ts`: Fixture selection support and safe public challenge projection.
- `src/server/ai-gateway.ts`: OpenAI Responses API and Code Interpreter adapter.
- `src/lib/learning-paths.ts`: Curriculum registry, progress validation, unlocking, and recommendations.

**Contracts and Boundary Code:**
- `src/lib/contracts.ts`: Public request/response/file/assessment schemas and inferred types.
- `src/server/request-guard.ts`: HTTP content, size, rate, and safe-error enforcement.
- `src/server/mutation-contract.ts`: Hidden structured mutation plan schema.
- `src/server/hint-contract.ts`: Single live-hint structured output schema.
- `src/server/validation-contract.ts`: Live validation-interpretation schema.

**Client Data and Presentation:**
- `src/lib/catalog.ts`: Three-project card metadata and skill choices.
- `src/lib/attempt-events.ts`: Bounded local-only anonymous event model.
- `src/lib/progress-contracts.ts`: Strict bounded attempt-summary and versioned learner-profile schemas with derivation helpers.
- `src/lib/progress-merge.ts`: v1 migration, idempotent attempt recording, and monotonic profile merge.
- `src/lib/progress-metrics.ts`: Deterministic dashboard metric selectors over the learner profile.
- `src/components/guided-roadmap.tsx`: Nine-lesson roadmap UI.
- `src/components/progress-dashboard.tsx`: Guest My Progress dashboard fed by local profile/attempt history.
- `src/app/globals.css`: Global Tailwind import, theme, backgrounds, and motion/accessibility styling.

**Configuration:**
- `package.json`: Node engine, Next/OpenAI/Zod/React dependencies, and all development/quality scripts.
- `package-lock.json`: Reproducible npm dependency graph.
- `next.config.ts`: Next.js options and cross-route security headers.
- `tsconfig.json`: Strict compiler mode, bundler resolution, JSX, and `@/* -> src/*` mapping.
- `eslint.config.mjs`: Next core-web-vitals and TypeScript lint rules.
- `postcss.config.mjs`: Tailwind PostCSS plugin registration.
- `vitest.config.mts`: Node test environment and alias resolution.
- `playwright.config.ts`: Browser test settings and development-server lifecycle.
- `.env.example`: Empty, safe template for optional server credential configuration.
- `.gitignore`: Excludes dependencies, build/test output, credentials, and generated TypeScript state.

**Testing:**
- `src/server/workflows.test.ts`: Mock-gateway workflow, recovery, and evidence-authority tests.
- `src/server/fixtures.test.ts`: Fixture/public projection/deterministic verifier invariants.
- `src/server/request-guard.test.ts`: Request limits, parsing, and rate-limit tests.
- `src/app/api/challenges/routes.test.ts`: Route contract, hidden-field, and adversarial input tests.
- `src/lib/*.test.ts`: Shared pure-function tests.
- `tests/e2e/faultsmith.spec.ts`: Browser-level guided and direct practice flows.

**Project Guidance:**
- `AGENTS.md`: Requires reading the installed Next.js documentation before framework code changes.
- `CLAUDE.md`: Additional repository guidance for Claude-oriented tooling.
- `README.md`: User-facing architecture, setup, verification, and security overview.
- `CONTRIBUTING.md`: Contribution and validation process.
- `SECURITY.md`: Vulnerability-reporting instructions.

## Naming Conventions

**Files:**
- Application modules use lowercase kebab-case: `challenge-service.ts`, `learning-paths.ts`, and `faultsmith-app.tsx`.
- React component filenames remain kebab-case even though exported component symbols use PascalCase, as in `GuidedRoadmap` from `src/components/guided-roadmap.tsx`.
- Next.js special files follow framework names exactly: `page.tsx`, `layout.tsx`, `route.ts`, `error.tsx`, `global-error.tsx`, and `not-found.tsx`.
- Unit/integration tests use the colocated `{module}.test.ts` pattern; browser tests use `*.spec.ts` under `tests/e2e/`.
- Configuration extensions match their runtime: `.ts`, `.mts`, or `.mjs` rather than a single uniform extension.
- Repository and durable planning documents use uppercase conventional names such as `README.md`, `SECURITY.md`, and `ARCHITECTURE.md`.

**Directories:**
- Source directories use lowercase nouns by responsibility: `app/`, `components/`, `lib/`, and `server/`.
- App Router URL segments use lowercase plural nouns and operation names: `api/challenges/generate/`.
- There are no barrel `index.ts` modules, feature-level `__tests__/` folders, or generated source directories in `src/`.

**Symbols and Imports:**
- React component functions and types use PascalCase; functions/variables use camelCase; constants use UPPER_SNAKE_CASE.
- Zod schema values end in `Schema`/`schema` (`assessmentResponseSchema`), while their inferred types use the unsuffixed PascalCase form (`AssessmentResponse`).
- Server workflow exports use verb-first use-case names such as `generateChallengeWorkflow` and `assessChallengeWorkflow`.
- Internal imports normally use the `@/` alias across directories and relative paths within the same directory.

## Where to Add New Code

**New Browser/Server Contract:**
- Define the strict schema and inferred type in `src/lib/contracts.ts` if it is safe and necessary on both sides.
- Add contract-focused tests beside the consuming route or in the relevant colocated `*.test.ts` file.
- Keep hidden provider or answer-bearing schemas in a focused `src/server/*-contract.ts` module.

**New API Operation:**
- Add a framework entry at `src/app/api/{resource}/{operation}/route.ts`.
- Keep the handler thin: request guard, Zod parse, workflow call, no-store response, safe catch.
- Add application behavior to `src/server/workflows.ts` or a new focused server service if the workflow file would become less cohesive.
- Add route-level tests beside sibling routes and workflow tests under `src/server/`.

**New Challenge or Skill:**
- Add public project/skill presentation metadata to `src/lib/catalog.ts` when the project catalog changes.
- Add the approved server-only challenge definition to `src/server/fixtures.ts`.
- Add or update the lesson mapping in `src/lib/learning-paths.ts` for guided curriculum exposure.
- Extend fixture and learning-path tests in `src/server/fixtures.test.ts` and `src/lib/learning-paths.test.ts`.

**New UI Feature:**
- Add reusable feature UI to a kebab-case file under `src/components/`.
- Keep route composition in `src/app/page.tsx`; add a nested `src/app/**/page.tsx` only when a distinct URL is intended.
- Put browser/server-safe state rules in `src/lib/` rather than importing from `src/server/`.
- Cover pure rules with colocated Vitest tests and user journeys in `tests/e2e/faultsmith.spec.ts` or another focused `*.spec.ts`.

**New Provider Integration:**
- Define or extend an interface seam in `src/server/ai-gateway.ts` or a new server-only adapter module.
- Keep credential reads and SDK imports under `src/server/` and preserve dependency injection in `src/server/workflows.ts`.
- Mock external calls in normal tests; do not place paid live calls in the default Vitest or Playwright suites.

**New Shared Utility:**
- Place it in `src/lib/` only if it is safe for browser bundling and broadly shared.
- Place security-sensitive, Node-only, fixture-aware, or provider-aware helpers in `src/server/` with `import "server-only"`.
- Prefer focused named modules over creating a generic `utils.ts` bucket; the current tree groups by responsibility.

**New Repository Check or Documentation:**
- Put executable Node quality checks in `scripts/` and expose them through `package.json`.
- Put product/build/security/QA records in `docs/`; keep top-level Markdown for repository-wide entry documents.
- Update `.github/workflows/ci.yml` when a new check becomes a mandatory CI gate.

## Special and Generated Directories

**`node_modules/`:**
- Purpose: Installed npm dependencies and the version-specific Next.js guides required by `AGENTS.md`.
- Source: `npm ci` from `package-lock.json`.
- Committed: No; ignored by `.gitignore`.

**`.next/`:**
- Purpose: Next.js development/build output, generated route types, server chunks, and client chunks.
- Source: `next dev` or `next build`.
- Committed: No; ignored by `.gitignore`.

**`test-results/` and `playwright-report/`:**
- Purpose: Playwright traces, screenshots, and reports produced during browser testing.
- Source: `npm run test:e2e`.
- Committed: No; ignored by `.gitignore`.

**`coverage/`:**
- Purpose: Optional generated test-coverage output.
- Source: Test tooling when coverage is enabled.
- Committed: No; ignored by `.gitignore`.

**`next-env.d.ts` and `*.tsbuildinfo`:**
- Purpose: Framework/compiler-generated TypeScript declarations and incremental state.
- Source: Next.js and TypeScript commands.
- Committed: No; ignored by `.gitignore`.

---

*Structure analysis: 2026-07-18*
*Update when routes, source responsibilities, test placement, or generated-directory conventions change.*
