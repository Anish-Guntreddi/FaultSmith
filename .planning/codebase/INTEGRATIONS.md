# External Integrations

## OpenAI Responses API

- The only runtime third-party service integration is OpenAI, encapsulated behind `AIGateway` and `OpenAIGateway` in `src/server/ai-gateway.ts`.
- The gateway creates the SDK client on the server and reads the credential only from server runtime configuration; no OpenAI client is constructed in browser code.
- The configured model identifier is `gpt-5.6` in `src/server/ai-gateway.ts`.
- Mutation planning uses `responses.parse` plus `zodTextFormat` and the strict schema in `src/server/mutation-contract.ts`.
- Progressive hint delivery uses a separate `responses.parse` call and the narrow schema in `src/server/hint-contract.ts`.
- Validation interpretation uses another structured-output call governed by `src/server/validation-contract.ts`; deterministic pass/fail/signature checks occur before this call.
- Learner assessment uses `responses.parse` with `assessmentResultSchema` from `src/lib/contracts.ts`; server workflow logic still forces failing test evidence to `not_verified`.
- Every model request sets `store: false` in `src/server/ai-gateway.ts`.
- Prompts explicitly treat learner prose and project source as untrusted data, and returned mutation plans are compared against the server-owned fixture boundary in `src/server/workflows.ts`.

## OpenAI Code Interpreter

- Live Python execution uses the Responses API `code_interpreter` tool in `src/server/ai-gateway.ts`; the server requests an automatic container with a bounded memory setting.
- The server supplies a fixed instruction to create only approved project-relative files and run `python -m pytest -q`; clients cannot submit a command or container identifier.
- Editable files are combined with server-owned read-only test and README files by `safeProjectFiles` in `src/server/ai-gateway.ts`.
- Live execution is bounded by a 20-second abort timeout in `src/server/ai-gateway.ts`, while Next.js challenge Route Handlers expose a 30-second maximum duration.
- Code Interpreter log output is collected from tool results, sanitized, truncated, and parsed into bounded `TestResult` data by `src/server/ai-gateway.ts` and `src/server/fixture-runner.ts`.
- The live generation gate executes the pristine fixture, then the mutation, and releases a generated challenge only when original-pass, mutated-fail, named-signature matching, and validation interpretation all agree (`src/server/workflows.ts`).
- Generation retries at most once after validation feedback, then falls back rather than releasing unvalidated model output.

## Internal HTTP API Surface

- The browser calls only same-origin application routes through the `postJson` helper in `src/components/faultsmith-app.tsx`.
- `POST /api/challenges/generate` validates project, skill, difficulty, and live preference in `src/app/api/challenges/generate/route.ts`.
- `POST /api/challenges/execute` validates the exact allowlisted file snapshot and selected execution mode in `src/app/api/challenges/execute/route.ts`.
- `POST /api/challenges/hint` releases a single bounded progression step from `src/app/api/challenges/hint/route.ts`.
- `POST /api/challenges/assess` reruns the exact submitted snapshot before producing the report in `src/app/api/challenges/assess/route.ts`.
- `GET /api/health` reports basic service status, whether live OpenAI is configured, and fixture readiness in `src/app/api/health/route.ts`.
- JSON DTOs are strictly bounded by schemas in `src/lib/contracts.ts`; unknown keys, traversal-like paths, oversized fields, and invalid enums are rejected.
- `src/server/request-guard.ts` requires JSON content type, enforces an 80 KiB request ceiling, performs in-process per-route/IP rate limiting, and normalizes errors without provider details.
- API responses are marked no-store. There are no public webhooks, outbound callbacks, GraphQL endpoints, or inbound integrations beyond these browser-facing routes.

## Deterministic Fallback Integration

- The live service is optional: `src/server/workflows.ts` resolves availability from the server credential or an injected test gateway.
- When live generation is not selected, no credential is present, or two validation attempts fail, `src/server/challenge-service.ts` returns a labeled prevalidated challenge.
- Prevalidated content is a server-owned catalog of nine Python challenge fixtures in `src/server/fixtures.ts`; it is source-controlled, not fetched from a remote content service.
- `src/server/fixture-runner.ts` does not execute Python. It verifies exact equality with the approved repair snapshot plus a minimal-change boundary and returns preserved test evidence.
- Live execute requests recover to the deterministic verifier when Code Interpreter times out or errors; the response records fallback use and a bounded recovery category (`src/server/workflows.ts`).
- Live hint failures, missing credentials, safety-gate divergence, or accidental repair disclosure recover to the approved hint stored in `src/server/fixtures.ts`.
- Assessment always has a deterministic implementation in `src/server/workflows.ts`; OpenAI assessment is used only when available and schema-valid.
- Test status remains authoritative in both modes, and a non-passing snapshot cannot be promoted by the model or deterministic scoring logic.

## Persistence and State

- No server database, object store, queue, cache service, ORM, or account system is integrated.
- Attempt state is stored only in browser `localStorage` under `faultsmith:attempt:v2` by `src/components/faultsmith-app.tsx`.
- A capped anonymous event history is stored only in browser `localStorage` under `faultsmith:events:v1`; its bounded event schema is defined in `src/lib/attempt-events.ts`.
- Guided curriculum progress is stored only in browser `localStorage` under `faultsmith:learning-progress:v1`; parsing and deduplication live in `src/lib/learning-paths.ts`.
- Restored public challenge, file, assessment, event, and progress data are schema-checked or explicitly bounded before reuse.
- Final assessment never trusts restored browser state as verification: the exact submitted files are revalidated and executed or compared server-side through `src/server/workflows.ts`.
- The route limiter in `src/server/request-guard.ts` uses a process-local `Map`, so its state is ephemeral and not shared across deployment instances.

## GitHub and Repository Services

- The npm repository and Git remote target `Anish-Guntreddi/FaultSmith`; package metadata is in `package.json` and repository policy is documented in `CONTRIBUTING.md`.
- GitHub Actions runs the quality gate on pushes and pull requests to `main` through `.github/workflows/ci.yml`.
- CI checks out source, installs Node and npm dependencies, installs Playwright Chromium, runs `npm run quality`, and audits production dependencies at a moderate threshold.
- `.github/workflows/ci.yml` grants read-only repository contents permission and cancels superseded runs for the same workflow/ref.
- Dependabot tracks npm packages and GitHub Actions weekly through `.github/dependabot.yml`; minor and patch development updates are grouped while majors require deliberate work.
- Ownership rules in `.github/CODEOWNERS` cover the repository broadly and give specific review coverage to server code, workflows, product requirements, and the threat model.
- GitHub issue forms, the pull-request template, and private vulnerability reporting surfaces live under `.github/`, `CONTRIBUTING.md`, and `SECURITY.md`.
- There is no runtime GitHub API, GitHub App, OAuth, repository ingestion, or webhook integration in application code.

## Deployment Surface

- The application is deployable as a standard stateful Next.js Node server using `npm run build` and `npm run start` from `package.json`.
- No deployment provider is currently selected in code: there is no `vercel.json`, Dockerfile, platform adapter, infrastructure-as-code, or hosting manifest.
- `.gitignore` excludes `.vercel`, indicating local Vercel metadata is intentionally untracked, but this is not evidence of an active deployment.
- The dynamic health endpoint at `src/app/api/health/route.ts` is the readiness target used locally by Playwright and can support deployment smoke checks.
- Security headers are applied globally by `next.config.ts`; deployment planning must preserve dynamic Route Handlers and server-only environment access.
- Current documentation describes public deployment as pending in `docs/COMPLETION_REPORT.md` and `docs/ROADMAP.md`; downstream plans should not assume a public URL exists.
- The in-memory limiter is not coordinated across instances, so a horizontally scaled public deployment needs an upstream or shared rate-limit integration before high traffic (`src/server/request-guard.ts`, `docs/THREAT_MODEL.md`).

## Environment Variables

- `OPENAI_API_KEY` (server-only)
- `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT` (server-only), `FIREBASE_AUTH_EMULATOR_HOST`, `FIRESTORE_EMULATOR_HOST`
- `NEXT_PUBLIC_FAULTSMITH_CLOUD_SYNC`, `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` (non-production), `NEXT_PUBLIC_FAULTSMITH_PROVIDER_LINKING` (capability gate, default off)
- `NODE_ENV`
- `CI`

`OPENAI_API_KEY` and the Firebase server values must remain server-only. `NODE_ENV` plus the cloud-sync/auth-domain values affect the CSP and COOP in `next.config.ts` (Firebase origins join only when cloud sync is configured); `CI` adjusts Playwright behavior. The `NEXT_PUBLIC_FIREBASE_*` values are public project metadata consumed by the lazy browser auth adapter in `src/client/firebase-auth.ts`.

## Optional Firebase Integration (configuration-gated)

- Firebase Authentication (email/password + Google popup) via the lazy browser adapter `src/client/firebase-auth.ts`; the server verifies ID tokens through the Admin gateway `src/server/firebase-admin.ts` and mediates all Firestore access (`learningProfiles/{uid}`), with direct browser Firestore access rules-denied.
- With every Firebase variable absent the application is provably local-only (no sign-in surface, no Firebase/Google network contact); emulator-only test harnesses are `npm run test:firebase` and `npm run test:e2e:firebase`.

## Absent Integrations and Planning Implications
- There is no remote analytics or telemetry backend; anonymous attempt events never leave the browser.
- There is no payment, email, calendar, messaging, storage, CDN, monitoring, error-reporting, or feature-flag SDK.
- There is no arbitrary repository import: the project/skill catalog in `src/lib/catalog.ts` maps only to curated fixtures in `src/server/fixtures.ts`.
- Adding any server persistence, shared rate limiting, deployment platform, observability, or repository ingestion would be a new external trust boundary and should update `docs/THREAT_MODEL.md`, `docs/TESTING.md`, and the relevant strict contracts.
