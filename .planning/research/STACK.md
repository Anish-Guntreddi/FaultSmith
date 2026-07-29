# Stack Research

**Project:** FaultSmith remaining submission milestone  
**Researched:** July 18, 2026  
**Milestone type:** Subsequent brownfield release; preserve the existing application stack

## Recommendation

Keep the current single-package Next.js 16.2.10, React 19.2.4, TypeScript, Zod, OpenAI JavaScript SDK, Vitest, Playwright, axe, and npm toolchain. The remaining work does not justify a framework, package manager, database, authentication, state-management, or test-runner migration. The fastest safe improvements are orchestration and deployment controls: independently named GitHub Actions jobs, existing branch protection updated to require those unique checks, a Node.js-capable deployment, server-only environment configuration, and deployment-layer rate limiting.

Official Next.js guidance confirms that a Node.js server supports the full framework surface and that the existing `build`/`start` scripts are the required deployment shape. GitHub Actions jobs run in parallel by default when they have no `needs` dependency, which matches the requested fast independent gates. GitHub also warns that required job names must be unique across workflows. If Vercel is approved as the target, its WAF can enforce a global fixed-window rule at the edge, closing the known multi-instance gap in `src/server/request-guard.ts` without adding application dependencies.

## Current Stack to Keep

| Technology | Current role | Decision | Rationale | Confidence |
|------------|--------------|----------|-----------|------------|
| Node.js `>=20.9.0` | Build/server runtime | Keep declared floor; use a supported deployment runtime | Matches Next.js 16 minimum and current `package.json` | HIGH |
| Next.js 16.2.10 App Router | UI, Route Handlers, server build | Keep pinned | Full release candidate and security headers are already validated | HIGH |
| React / React DOM 19.2.4 | Client workbench | Keep pinned | No remaining requirement benefits from migration | HIGH |
| TypeScript 5 + strict mode | Static correctness | Keep | Existing shared contracts and server/client boundaries rely on it | HIGH |
| Zod 4 | Request, response, model, and persistence validation | Keep | Central to strict untrusted-boundary enforcement | HIGH |
| OpenAI JavaScript SDK 6.x | Responses API and Code Interpreter | Keep lockfile-resolved SDK; do not update during submission freeze unless live smoke proves a defect | Integration is already isolated and mocked | HIGH |
| Vitest 4 | Unit/integration tests | Keep | 40 behavior tests cover server and pure domain logic | HIGH |
| Playwright 1.61 + axe | E2E/responsive/accessibility | Keep | Six browser workflows already cover primary and guided flows | HIGH |
| npm lockfile | Reproducible install | Keep `npm ci` in CI/deployment | Existing repo and GitHub cache are npm-native | HIGH |

## CI Orchestration Additions

Use one workflow with four unique, independent job names. Each job checks out the same SHA, installs with `npm ci`, and runs only its owned evidence. Duplication of installation is acceptable for clarity and parallel latency under the deadline.

| Job | Commands | Extra setup | Required-check recommendation |
|-----|----------|-------------|-------------------------------|
| `Static analysis` | `npm run lint`, `npm run typecheck` | Node + npm cache | Required |
| `Unit and integration` | `npm test` | Node + npm cache | Required |
| `Build and security` | `npm run build`, `npm run security:bundle`, `npm audit --audit-level=moderate`, targeted secret/host-execution searches | Node + npm cache | Required |
| `Browser and accessibility` | `npm run test:e2e` | Node + npm cache + Playwright Chromium/deps | Required |

Keep `npm run quality` unchanged as the complete local developer gate. The split workflow must not become a second set of behavior; it should call the same package scripts. Do not add a job dependency unless a later job consumes an artifact from an earlier job, because GitHub Actions otherwise schedules independent jobs in parallel.

Branch protection should require the four unique names after at least one workflow run creates them. Removing the old single `Quality gate` requirement is a separate GitHub administration change and should occur only after the new checks are visible and green, preventing an unmergeable or under-protected interval.

## Deployment Stack

### Application Runtime

- Use a full Node.js deployment, not static export, because FaultSmith requires POST Route Handlers, server-only fixture projection, the OpenAI SDK, environment secrets, and per-request security controls.
- The existing `npm run build` and `npm run start` scripts satisfy the documented Node.js server shape.
- Keep `src/app/api/challenges/*/route.ts` at `maxDuration = 30` and the Code Interpreter abort at 20 seconds so application recovery occurs before the route/platform deadline.
- Deploy the exact reviewed commit SHA and record it with the public URL and smoke evidence.

### Recommended Provider Shape

Vercel is the lowest-friction candidate because it is a verified Next.js adapter/provider and provides environment scoping, Functions, and WAF rate limiting. This is a recommendation, not deployment authorization. A different Node.js provider is valid if it preserves all Next.js features, HTTPS, environment variables, egress to OpenAI, function duration above 30 seconds, and upstream rate controls.

### Environment and Secrets

- Configure only `OPENAI_API_KEY` and only in the server runtime environment.
- Never introduce a `NEXT_PUBLIC_` version, commit `.env.local`, print environment values, or store the key in GitHub Actions for the normal suite.
- Scope the credential to the intended preview/production environment and validate that missing-key fallback still works in an environment without the secret.
- A credentialed live-smoke workflow should be manual/explicit rather than part of every pull request; no paid external call belongs in the normal quality gate.

### Global Abuse Control

- Preserve the application-local 30-request/minute scoped limiter and 5,000-bucket cap as defense in depth.
- If Vercel is selected, configure a WAF fixed-window rate limit for POST requests under `/api/challenges/` before public testing. Start in log/observe mode when possible, then enforce a conservative limit that still permits one complete demo session.
- Keep provider-level OpenAI project spend/rate limits as an additional control. Do not store a shared rate-limit database solely for the hackathon unless the chosen platform lacks an edge control.

## Security and Evidence Tooling

No new runtime security package is required. Existing controls should be surfaced as an independently named CI job:

- `npm audit --audit-level=moderate` for dependency findings.
- `scripts/check-client-bundle.mjs` after production build for hidden-answer/secret-shaped client leakage.
- Targeted repository/history scans for credentials and sensitive files, with deliberate fake test tokens classified as false positives.
- A host-execution scan that fails on `child_process`, `exec`, or `spawn` application paths while allowing documentation references.
- Existing adversarial Vitest/route/Playwright tests for strict schemas, allowlists, provider failure, output sanitation, evidence authority, local-storage tampering, accessibility, and fallback disclosure.

Adding a broad third-party security scanner immediately before submission is not recommended unless it is already available and produces actionable signal without lockfile or branch-protection disruption. Independent manual/adversarial review plus the current automated boundaries is the lower-risk path.

## What Not to Add Before Submission

| Addition | Why not now |
|----------|-------------|
| Database or account provider | Conflicts with anonymous local persistence and adds privacy/auth/deployment scope |
| Queue/background worker | Current requests are bounded within 30 seconds and fallback handles provider failure |
| Runtime agent framework | Adds latency and nondeterministic authority without a locked PRD requirement |
| Custom repository sandbox | Arbitrary ingestion/execution materially changes the safety model |
| Alternative JS package manager | No product value and weakens reproducibility during freeze |
| Docker/Kubernetes | Node deployment already supports the full app; operational overhead exceeds hackathon value |
| Coverage-threshold migration | Useful post-MVP, but behavior/requirement mapping is the immediate release gate |
| Paid OpenAI calls in normal CI | Creates nondeterminism, credential exposure surface, and unbounded spend |

## Version and Compatibility Notes

- Do not update dependencies merely because newer versions exist. The current zero-audit lockfile and green build are release assets.
- GitHub Actions action refs already use major `v7` in `.github/workflows/ci.yml`; retain the currently green refs unless GitHub reports a concrete issue.
- Next.js 16 no longer runs lint as part of `next build`, so the separate static-analysis job remains mandatory.
- Playwright browser binaries must be installed in the browser job with `npx playwright install --with-deps chromium`.
- The deployment runtime must meet the `package.json` engine and Next.js minimum; the existing CI Node 24 run provides a newer-runtime signal but does not authorize narrowing the declared engine range.

## Verification Checklist

- [ ] Four unique CI job names run against the same commit SHA and are independently green.
- [ ] Local `npm run quality` remains green after workflow changes.
- [ ] Branch protection is updated only after new checks exist and requires every intended job.
- [ ] Production build and `next start` pass with no `OPENAI_API_KEY` and the fixture fallback remains functional.
- [ ] With explicit credential use, current GPT-5.6/Code Interpreter generate, test, hint, and assess behavior passes the controlled smoke.
- [ ] With explicit deployment approval, the public URL is unauthenticated, HTTPS, header-correct, rate-limited, responsive, and fallback-capable.
- [ ] The deployed commit SHA, timestamp, mode, and sanitized evidence are recorded in canonical docs.

## Sources

- Next.js official deployment guidance: https://nextjs.org/docs/app/getting-started/deploying
- Next.js official platform guidance: https://nextjs.org/docs/app/guides/deploying-to-platforms
- Next.js official installation/runtime requirements: https://nextjs.org/docs/app/getting-started/installation
- GitHub official Actions concepts and default parallel jobs: https://docs.github.com/en/actions/get-started/understand-github-actions
- GitHub official protected-branch and unique-check guidance: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- Vercel official WAF rate limiting: https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting
- Vercel official Functions limits: https://vercel.com/docs/functions/limitations
- OpenAI official Code Interpreter guide: https://platform.openai.com/docs/guides/tools-code-interpreter
- Repository evidence: `package.json`, `package-lock.json`, `.github/workflows/ci.yml`, `src/server/ai-gateway.ts`, `src/server/request-guard.ts`, `docs/TESTING.md`, and `.planning/codebase/STACK.md`.

---
*Stack research for: FaultSmith submission-completion milestone*  
*Recommendation: preserve the application stack; improve orchestration and deployment controls*
