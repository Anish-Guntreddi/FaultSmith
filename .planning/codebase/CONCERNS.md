# Codebase Concerns

**Mapped:** July 18, 2026  
**Scope:** FaultSmith guided-learning release candidate on `agent/guided-learning-mvp`

## Release Blockers and External Dependencies

- The live GPT-5.6 and Code Interpreter path in `src/server/ai-gateway.ts` has strong mocked coverage but no credentialed provider evidence. A server-only `OPENAI_API_KEY` is required for the controlled smoke in `docs/TESTING.md`.
- The application is production-build ready, but no public unauthenticated deployment has been authorized or verified. This blocks the deployed-app items in `docs/PRD.md` and `docs/EXECUTION_GOAL.md`.
- Five-person usability evidence, the public sub-three-minute video, and the primary Codex `/feedback` Session ID require external coordination and remain accurately marked pending in `docs/COMPLETION_REPORT.md`.
- The guided-learning work is on a feature branch and draft PR rather than `main`; release evidence must remain branch-specific until review and merge complete.

## Security and Abuse-Resistance Residuals

- `src/server/request-guard.ts` uses an in-memory, per-process rate limiter. It bounds local memory, but a horizontally scaled deployment needs a provider, edge, or shared limiter to make API-credit exhaustion controls global.
- `next.config.ts` retains `unsafe-inline` for scripts and styles. Other CSP directives and React escaping reduce risk, but a nonce-based production CSP is the stronger post-MVP target.
- Live learner Python is sent only to Code Interpreter by `src/server/ai-gateway.ts`; the fixed command and file allowlist are server-owned. Provider behavior still needs credentialed validation because local tests cannot prove the remote sandbox contract.
- Browser-local attempts and curriculum progress in `src/components/faultsmith-app.tsx` are intentionally non-authoritative. Tampering can change the owner's local presentation but cannot mint server verification or a credential.
- Hidden fixture answers live in server-only source under `src/server/fixtures.ts`. Public DTO, import, storage, and bundle gates must remain required whenever challenge contracts or bundling change.

## Reliability and Correctness Risks

- `src/server/ai-gateway.ts` parses pytest counts from Code Interpreter log text. Provider output shape or pytest wording drift could produce an `error` state; the controlled live smoke is the release check for this integration seam.
- Code Interpreter has a 20-second abort while API routes declare a 30-second maximum. Deployment-platform timeouts must preserve that ordering and safe fallback behavior.
- Fixture mode intentionally does not execute arbitrary learner Python. Exact approved snapshot comparison is safe and deterministic, but UI and submission language must keep distinguishing prevalidated evidence from a fresh sandbox run.
- Challenge generation permits one live retry before fixture recovery in `src/server/workflows.ts`. Changes to mutation schemas, fixture allowlists, or validation interpretation can create subtle contract drift and require route plus workflow regression tests.
- Progress and attempt state are versioned local-storage documents. Contract changes need explicit migration or safe discard behavior, plus refresh/reset browser tests.

## Quality-System Gaps

- `.github/workflows/ci.yml` currently serializes lint, type checking, unit/integration tests, build, bundle leakage, Playwright, and audit under one `Quality gate` job. Failures are slower to triage and independent gates cannot run concurrently.
- The normal test suite correctly avoids paid OpenAI calls, but the repository has no credential-controlled GitHub Actions live-smoke job. Live verification therefore remains a documented manual gate.
- There is no first-party coverage threshold. The suite is behavior-heavy, but newly added branches can evade detection unless reviewers map every requirement to unit, route, or browser evidence.
- Accessibility automation covers axe and keyboard behavior; final contrast, focus, responsive layout, and reduced-motion review still depend partly on manual browser evidence recorded in `docs/TESTING.md`.
- Security scanning uses dependency audit, targeted secret searches, bundle leakage checks, and adversarial tests. A dedicated independently named security CI job would make the gate more visible and enforceable.

## Documentation Drift

- `docs/THREAT_MODEL.md` still says the workspace is not a Git repository, although the project is now public on GitHub. That statement must be replaced with current working-tree and history-scan evidence.
- `docs/COMPLETION_REPORT.md` correctly qualifies live and deployment claims, but its GitHub CI wording should be updated after the guided-learning PR is merged or superseded.
- Root `docs/ROADMAP.md` is the canonical product/delivery roadmap. New GSD files under `.planning/` must link to canonical PRD and execution documents instead of becoming a competing product specification.

## Scope and Product Risks

- Natural-language challenge prompting, arbitrary repository ingestion, arbitrary execution, accounts, and instructor dashboards are explicitly deferred in `docs/ROADMAP.md`. Adding them before submission would materially change the locked PRD and security posture.
- The strongest submission path is the curated nine-lesson roadmap plus the advanced project/skill catalog. Breadth that weakens deterministic validation, answer containment, or fallback reliability should not displace live smoke, deployment, tester, and video work.
- A runtime multi-agent swarm would add latency, cost, and nondeterministic authority. The approved swarm is for development orchestration; executed tests and deterministic server policy remain authoritative in the product.

## Highest-Priority Remediation Order

1. Land the guided-learning branch through review and required CI.
2. Split CI into independently named static, unit/integration, build/security, and browser/accessibility gates without weakening `npm run quality` locally.
3. Correct documentation drift and record current repository/history secret-scan evidence.
4. Run independent QA, security, and product-completeness audits; repair every in-scope finding and add regressions.
5. With explicit credentials and deployment approval, run live provider smoke, deploy, and verify the public workflow.
6. Complete external tester, video, and `/feedback` submission evidence.

## Accepted MVP Residuals

- Per-process rate limiting is accepted only for limited demo traffic and must be paired with deployment-provider controls.
- Inline CSP allowances are accepted for the Next.js MVP while all other restrictive headers and no-host-execution rules remain enforced.
- Anonymous browser-local persistence is accepted because FaultSmith makes no certification, account, or cross-device synchronization claim.
- The fixture fallback is a required validated reliability path and must not be removed while live-service availability remains variable.
