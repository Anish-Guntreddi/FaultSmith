# Technology Stack

## Application Shape

- FaultSmith is a single-package, private npm application; package identity, scripts, engine constraints, and direct dependencies live in `package.json`.
- The repository is a full-stack Next.js application: browser UI, server Route Handlers, server-only workflow code, and shared validation contracts ship from one codebase.
- Application code is organized under `src/`; the browser entry is `src/app/page.tsx`, the root layout is `src/app/layout.tsx`, and API entry points are under `src/app/api/`.
- The product serves a React client workspace backed by same-origin JSON APIs; it is not split into separately deployed frontend and backend packages.

## Languages and Runtime

- TypeScript is the primary language for application, server, unit/integration test, and configuration code (`src/**/*.ts`, `src/**/*.tsx`, `next.config.ts`, `playwright.config.ts`, `vitest.config.mts`).
- JavaScript ES modules are used for tooling configuration and scripts (`eslint.config.mjs`, `postcss.config.mjs`, `scripts/check-client-bundle.mjs`).
- CSS is authored in `src/app/globals.css`; Tailwind utility classes are applied directly throughout TSX components such as `src/components/faultsmith-app.tsx`.
- Python appears only as curated learner-project fixture content in `src/server/fixtures.ts` and is executed remotely in live mode; Python is not an application-host runtime dependency.
- Node.js is the server/build runtime with an engine floor of Node 20.9 in `package.json`; npm and the lockfile v3 in `package-lock.json` provide reproducible installs.
- The currently installed development environment is newer than the declared floor, so planning should preserve compatibility with the declared Node range rather than depend on workstation-only behavior.

## Framework and UI

- Next.js 16.2.10 is pinned in `package.json` and implements the App Router structure in `src/app/`.
- React and React DOM 19.2.4 are pinned; interactive state and browser persistence live in the client component `src/components/faultsmith-app.tsx`.
- `src/app/page.tsx` remains a small server entry that renders the client workspace, while `src/app/layout.tsx` supplies metadata and the global stylesheet.
- API handlers use native Web `Request` and `Response` primitives in Next.js Route Handlers, for example `src/app/api/challenges/generate/route.ts`.
- Route handlers opt out of response caching with `Cache-Control: no-store`; `src/app/api/health/route.ts` is also explicitly dynamic.
- Tailwind CSS 4 is integrated through `@tailwindcss/postcss` in `postcss.config.mjs`; there is no separate Tailwind configuration file.
- Global visual tokens, responsive behavior, motion preferences, and base styles are centralized in `src/app/globals.css`.

## Core Runtime Dependencies

- `openai` is declared at `^6.32.0` and currently locked/installed at 6.48.0; all SDK use is isolated to the server gateway in `src/server/ai-gateway.ts`.
- `zod` is declared at `^4.3.5` and currently locked/installed at 4.4.3; strict request, response, persistence, model-output, and internal contracts are defined across `src/lib/contracts.ts` and `src/server/*-contract.ts`.
- `server-only` marks sensitive implementation modules such as `src/server/ai-gateway.ts`, `src/server/fixtures.ts`, and `src/server/workflows.ts` as server-bound.
- `next`, `react`, and `react-dom` are the only other production dependencies; there is no ORM, database driver, authentication SDK, analytics SDK, or state-management library.
- `package-lock.json` is authoritative for resolved transitive versions; `package.json` also forces PostCSS 8.5.19 through an npm override.

## Configuration

- `next.config.ts` disables the framework signature header and installs CSP, HSTS, frame denial, MIME protection, restrictive permissions, referrer, opener, and resource-policy headers.
- `next.config.ts` varies the CSP for development via the runtime environment while retaining same-origin network restrictions.
- `tsconfig.json` enables strict TypeScript, no emit, isolated modules, bundler resolution, React JSX, incremental builds, and the `@/*` alias to `src/*`.
- The TypeScript compilation target is ES2017 with DOM and latest ECMAScript libraries, as configured in `tsconfig.json`.
- `eslint.config.mjs` composes Next.js Core Web Vitals and TypeScript flat-config presets on ESLint 9.
- `.env.example` documents the sole application credential name; `.gitignore` excludes all real `.env*` files while allowing only `.env.example`.
- `.gitignore` also excludes `.next`, build/export output, coverage, Playwright reports, test results, local Vercel metadata, and TypeScript build metadata.

## Build and Developer Commands

- `npm run dev` starts the Next.js development server; `npm run build` creates a production build; `npm run start` serves that build (`package.json`).
- `npm run lint` runs ESLint and `npm run typecheck` runs `tsc --noEmit` (`package.json`).
- `npm test` runs the Vitest suite once; `npm run test:e2e` runs Playwright; headed E2E is available through `npm run test:e2e:headed`.
- `npm run security:bundle` executes `scripts/check-client-bundle.mjs`, which scans generated client assets for internal schema, credential, and hidden-answer markers.
- `npm run quality` chains lint, typecheck, unit/integration tests, production build, client-bundle leakage scan, and E2E tests.
- Clean installation uses `npm ci`; the repository does not contain pnpm, Yarn, Bun, monorepo, Docker, or task-runner configuration.

## Test Tooling

- Vitest 4 is the unit/integration runner; `vitest.config.mts` uses the Node environment, maps `@` to `src`, and excludes browser E2E tests.
- Unit and integration tests are colocated with code, including `src/server/workflows.test.ts`, `src/app/api/challenges/routes.test.ts`, and `src/lib/learning-paths.test.ts`.
- Playwright 1.61 drives browser tests from `tests/e2e/`; `playwright.config.ts` boots the app on port 3101 and waits for `src/app/api/health/route.ts`.
- CI changes Playwright retry, worker, and focused-test behavior through `playwright.config.ts`.
- `@axe-core/playwright` supplies automated accessibility checks in `tests/e2e/faultsmith.spec.ts`.
- The normal automated test suite avoids external OpenAI calls through gateway injection and the deterministic fallback; credentialed live smoke testing is documented separately in `docs/TESTING.md`.

## Operational Constraints for Future Work

- Next.js behavior must be checked against the repository-bundled documentation in `node_modules/next/dist/docs/` before framework code changes, per `AGENTS.md`.
- Learner Python must never be executed through a host subprocess; the only live execution implementation is the OpenAI Code Interpreter tool in `src/server/ai-gateway.ts`.
- Hidden fixture metadata and model contracts belong in server-only modules; public/browser-safe contracts belong in `src/lib/contracts.ts`.
- The full UI is concentrated in `src/components/faultsmith-app.tsx`, so UI changes can have broad persistence, API, accessibility, and workflow effects despite the small route surface.
