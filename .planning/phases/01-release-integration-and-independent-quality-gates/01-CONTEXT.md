# Phase 1: Release Integration and Independent Quality Gates - Context

**Gathered:** July 18, 2026  
**Status:** Ready for planning  
**Source:** PRD express path using `docs/PRD.md`, `docs/EXECUTION_GOAL.md`, and the user's GSD/swarm direction

<domain>
## Phase Boundary

Produce one stable guided-learning release-candidate SHA with tracked GSD context, independently named parallel CI jobs, independent product/QA/security review evidence, all validated in-scope blocker/high findings repaired with regressions, and current canonical documentation. This phase is development tooling, integration, and objective proof; it does not add a learner-facing runtime swarm, arbitrary prompting, repository ingestion, accounts, or other material product scope.

The existing guided roadmap, direct project/skill catalog, GPT-5.6/Code Interpreter adapter, deterministic evidence authority, server-only fixture catalog, and prevalidated fallback are the product being hardened. Live credential evidence, deployment, external testers, video, and final form completion belong to Phases 2–4.

</domain>

<decisions>
## Implementation Decisions

### Swarm Role and Authority

- The agent swarm is for development only; it must not be added to the learner-facing application runtime in this phase.
- Use a coordinator plus independent product-completeness, QA/accessibility, and security/adversarial streams.
- Give streams non-overlapping write ownership. Read-heavy reviewers report findings; the coordinator validates and implements accepted fixes so reviewers do not self-certify.
- Parallelize independent work aggressively because the deadline is close, but do not let speed weaken the locked PRD, deterministic evidence, or fallback.

### CI and Quality Gates

- Keep the existing local `npm run quality` aggregate as the developer source of truth.
- Split GitHub Actions into four unique jobs: `Static analysis`, `Unit and integration`, `Build and security`, and `Browser and accessibility`.
- Normal CI remains offline/mocked and never requires an OpenAI credential or spends live API credits.
- Build/security owns the production build, client-bundle leakage regression, dependency audit, repository secret/history checks, and application-host execution scan.
- Browser/accessibility owns Playwright, axe, keyboard, responsive, refresh/reset, fallback, and primary/guided flows.
- Update branch protection only after the four new checks have appeared and passed, avoiding a gap or stale required context.

### Security and Evidence

- Learner code must never execute on the Next.js host; no client command, container ID, dependency, repository, or arbitrary file path may be accepted.
- Hidden root causes, reference solutions, rubrics, future hints, secrets, and internal provider details stay out of client responses, imports, storage, logs, and bundles.
- Executed or prevalidated deterministic tests remain authoritative; model output cannot promote failing evidence.
- Preserve the 80 KiB request cap, strict Zod schemas, allowlists, sanitized 8 KiB output, timeout ordering, rate limits, safe errors, and exact fixture projection.
- Preserve and explicitly label the prevalidated fallback. It is a real reliability mode and must not be removed or described as a fresh Python execution.
- Classify review findings as blocker/high/medium/low/informational with file, failure path, proposed mitigation, and validation evidence. Repair all in-scope blocker/high findings before phase completion.

### Documentation and Scope

- `.planning/` is a tracked development control plane that links to canonical `docs/PRD.md`, `docs/EXECUTION_GOAL.md`, `docs/ROADMAP.md`, and `docs/COMPLETION_REPORT.md`; it must not silently redefine the product.
- Update `docs/BUILD_LOG.md`, `docs/ROADMAP.md`, `docs/THREAT_MODEL.md`, `docs/TESTING.md`, and `docs/COMPLETION_REPORT.md` with branch/SHA-specific evidence and accepted/rejected findings.
- Correct the stale threat-model claim that the workspace is not a Git repository and add reachable-history scan evidence.
- Do not claim live GPT-5.6/Code Interpreter behavior, deployment, tester comprehension, video publication, or `/feedback` completion without the external evidence.
- The user wants the fastest safe completion and maximal promised functionality. Prioritize proving every locked capability over speculative breadth.

### Codex's Discretion

- Exact number and content of Phase 1 plan files, provided all 16 requirement IDs map once and parallel work has exclusive file ownership.
- Whether CI uses repeated `npm ci` jobs or artifact sharing; prefer simple independent jobs unless measured latency justifies extra complexity.
- Exact cross-platform source/history scan implementation, provided deliberate test fixtures are handled explicitly and no real secret or host execution path is missed.
- Exact documentation layout for review evidence, provided accepted/rejected findings and commands/results are reproducible.
- Medium/low findings may be fixed now when low risk or documented as accepted residuals when deferral is technically justified and compatible with PRD.

</decisions>

<specifics>
## Specific Ideas

- The expected implementation wave is: create named CI/security checks; run three independent reviews against the same SHA; coordinator reproduces and repairs findings; rerun narrow then full gates; update canonical evidence; push and verify GitHub checks; update protected-branch contexts.
- Existing draft PR #13 contains the guided-learning MVP and completed-report persistence behavior and is the current integration vehicle.
- Existing evidence baseline is 40 Vitest tests, six Playwright workflows, a 17-artifact client-bundle scan, production build/start/header smoke, zero moderate audit vulnerabilities, and desktop/mobile browser review.
- No new runtime dependency should be added unless a reproduced blocker/high finding cannot be repaired safely with the current stack.

</specifics>

<deferred>
## Deferred Ideas

- Credential-controlled current-provider verification — Phase 2.
- Public deployment and production abuse-control/header/smoke evidence — Phase 3.
- Five-person UAT, video, final URLs, and `/feedback` Session ID — Phase 4.
- Natural-language custom prompting, arbitrary repositories/execution, accounts/cohorts/dashboards, languages beyond Python, runtime swarms, leaderboards, and public SDK extraction — v2/new PRD cycle.

</deferred>

---
*Phase: 01-release-integration-and-independent-quality-gates*  
*Context gathered: July 18, 2026 via PRD express path*
