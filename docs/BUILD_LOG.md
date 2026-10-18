# FaultSmith Build and Review Log

This is the engineering provenance and self-healing record for the OpenAI Build Week submission. Times are local to America/New_York unless otherwise noted.

## July 17, 2026 — Product lock and first vertical slice

- **Environment:** primary Codex task.
- **Decision:** locked the MVP to the Education track, curated Python projects, anonymous local persistence, Expense Approval primary demo, and a reliable fixture fallback.
- **Implementation:** created the Next.js application scaffold, selection experience, Expense Approval editor, deterministic fixture evaluator, hypothesis journal, progressive hints, patch submission, and report.
- **Security boundary:** learner Python did not execute on the application host; the initial evaluator was data-driven.
- **Evidence:** ESLint, three evaluator unit tests, production build, and production-server UI smoke passed.
- **Gap observed:** the first slice had only one scenario and did not yet contain the planned GPT-5.6/Code Interpreter routes.

## July 18, 2026 — Requirements reconciliation

- **Sources read:** `AGENTS.md`, complete `docs/PRD.md`, existing build log and README, repository source/tests, supplied persistent execution goal, and relevant local Next.js 16.2.10 route, client/server, security, environment, testing, CSP, headers, and production guides.
- **OpenAI documentation:** used the OpenAI Docs skill; installed the official docs MCP configuration when it was absent, then used official OpenAI documentation as fallback because its tools were not exposed in the current session. Confirmed Responses structured parsing, GPT-5.6 support, Code Interpreter tool configuration, and ephemeral container behavior.
- **Repository finding:** the workspace has no `.git` directory. Incremental commits and git-history review were therefore impossible. No repository was initialized because that would be an external/provenance decision rather than a required implementation mutation.
- **Direction:** complete the secure end-to-end path before presentation polish or product expansion.

## July 18, 2026 — Secure challenge domain and fallback breadth

- **Changed:** introduced strict Zod contracts for requests, public challenge data, files, test evidence, mutation plans, and assessment. Added server-only catalog fixtures for nine single-root-cause scenarios: three each for Expense Approval, Inventory Service, and Notification Preferences.
- **Why:** the PRD requires validated breadth while preserving the curated, reliable demo model.
- **Security:** hidden root causes, reference solutions, expected signatures, and original source remain server-only. Public DTOs are constructed explicitly. Paths reject traversal and absolute paths; file counts and content lengths are bounded.
- **Validation:** fixture tests prove original-pass, mutated-fail, repaired-pass, allowlist rejection, minimal repair boundaries, failure signatures, output sanitization, and nine unique scenarios.
- **Review finding:** fallback verification needed to distinguish the exact approved repair from overbroad/destructive changes.
- **Repair:** the evaluator now requires the fixed snippet, absence of the broken snippet, a bounded changed-line count, and only allowlisted files.

## July 18, 2026 — GPT-5.6, Code Interpreter, and guarded routes

- **Changed:** added a server-only OpenAI gateway using `gpt-5.6`, `responses.parse`, Zod Structured Outputs, and the Code Interpreter tool. Added generation, execution, assessment, and health routes.
- **Generation policy:** GPT selects a strict approved mutation contract. The server rejects semantic drift—wrong ID, project, skill, difficulty, allowlist, tests, root-cause count, or patch—even if the JSON is schema-valid. Original-pass and mutated-fail/signature evidence are required. A single corrective retry precedes fallback.
- **Execution policy:** the server owns the fixed pytest command and test bundle. The client cannot submit shell commands, file IDs, container identifiers, hidden fields, or a mutation contract. Execution has a 20-second abort bound and sanitized, truncated output.
- **Assessment policy:** the exact submitted files are rerun. Failing test evidence forces `not_verified`; model scores are bounded 0–100 and cannot change execution facts.
- **Request controls:** JSON-only requests, 80 KiB body limit, 30 requests/minute/IP/scope, strict schemas, no-store responses, and safe external errors.
- **Recovery:** missing key, provider failure, malformed output, timeout, or expired container recovers to a labeled, real fixture path. Provider internals and stack traces are not returned.
- **Tests:** added mocked gateways and adversarial coverage for malformed and semantically invalid plans, retry/fallback behavior, authoritative failure, timeout/expiration, path traversal, arbitrary command/container-ID fields, prompt-injection-shaped text, output sanitization, and rate limiting.

## July 18, 2026 — Complete learning interface

- **Changed:** rebuilt the client around all three project cards; required skill and difficulty selection; asynchronous forge validation; allowlisted editable source; read-only tests and README; test execution; hypothesis journal; sequential hints; exact-snapshot submission; evidence-separated report; reset/new-lab behavior; and browser-local progress restoration.
- **Persistence:** only the public challenge DTO, learner file snapshot, journal, visible test evidence, and report are stored. The key, hidden answer, reference patch, provider prompt, and container ID never enter client state.
- **Error states:** user-visible loading, missing-key fallback, provider recovery, request error, invalid patch, and retry states were added.
- **Manual browser review:** exercised selection, failing evidence, hypothesis-gated hints, source edit, refresh restoration, passing evidence, submission, reset, and report at 1440 × 900 and 390 × 844.
- **Findings repaired:** stage changes could retain an awkward scroll position; score text and copy needed clearer evidence/model separation; some muted labels failed contrast; the workspace needed an `h1` and named landmarks; and the narrow layout needed explicit overflow verification.
- **Regression evidence:** Playwright now covers the complete primary workflow, failing-patch rejection, keyboard navigation, axe scan, persistence, and mobile overflow.

## July 18, 2026 — Adversarial and dependency self-healing

- **Finding (medium):** initial `npm audit` reported two moderate PostCSS advisories through build dependencies.
- **Repair:** pinned the root PostCSS override to 8.5.19. `npm ls postcss` shows the fixed version deduped throughout; `npm audit --audit-level=moderate` reports zero vulnerabilities.
- **Finding (test infrastructure):** after adding API adversarial tests, Vitest collected the Playwright file and failed with Playwright's “test() called here” guard even though all product tests passed.
- **Root cause:** both runners used the repository-wide default discovery pattern.
- **Repair:** imported Vitest `configDefaults` and added `tests/e2e/**` to the unit-runner exclusion, preserving the normal defaults.
- **Regression evidence:** five Vitest files and 29 tests passed after the repair.
- **Finding (medium, client isolation):** the first production-bundle scan found no hidden answer text, but it did find the names of hidden mutation fields in a client chunk because public and internal Zod schemas shared one module.
- **Root cause:** module bundling retained the internal schema even though client code used only public contracts.
- **Repair:** moved the mutation schema and type into `src/server/mutation-contract.ts`, protected it with `server-only`, and added `npm run security:bundle` to the quality sequence.
- **Regression evidence:** a fresh build inspected 17 client artifacts with zero internal field-name, credential-marker, or primary-answer hits; all unit and E2E tests remained green.
- **Security scan:** no real key, private key, host subprocess call, or sensitive env file was found. Credential-shaped and absolute-path strings occur only in the redaction regression test. `OPENAI_API_KEY` is absent in the environment.
- **License review:** installed dependencies are predominantly MIT/Apache/ISC/BSD. Reviewed MPL development tooling, CC data packages, Python-2.0 argparse, and the LGPL libvips binary distributed through Sharp. No package is copied into project source; retain dependency licenses in distributions and recheck before public release.

## July 18, 2026 — Production hardening and submission package

- **Changed:** disabled the powered-by header; added CSP, HSTS, MIME, frame, opener/resource, referrer, and browser-permissions headers; added route and global recovery UI plus a coherent 404; added `.env.example`, MIT license, typecheck/quality scripts, and the full submission documentation set.
- **CSP decision:** production avoids `unsafe-eval`; inline scripts/styles remain allowed for current Next.js/Tailwind operation. This residual is documented for nonce-based hardening after the MVP.
- **Reliability:** reduced-motion preferences suppress the forge animation; output and responses remain bounded; the fallback stays available and clearly identified.
- **External status:** no live key, deployment approval, public repository, public video, five-tester study, or `/feedback` Session ID was available. These are not represented as completed.

## Final local quality checkpoint

The authoritative commands, dates, and outcomes are maintained in `docs/TESTING.md` and mapped criterion-by-criterion in `docs/COMPLETION_REPORT.md`.

## July 18, 2026 — Requirement-level completion audit and second self-healing loop

- **Audit method:** reread every functional, UX, architecture, AI, security, analytics, testing, and submission requirement rather than relying on the first completion matrix.
- **Finding (medium, assessment evidence):** hypothesis revisions were browser-persisted but only the current hypothesis reached assessment; elapsed time was accepted by the route but omitted from GPT evidence and the report. The report also omitted the challenge title.
- **Repair:** the strict assessment request now requires a bounded revision trail whose final item matches the submitted hypothesis. GPT receives the trail and elapsed time. The response/report expose challenge identity, elapsed time, and revision count; tampered persisted counters/text are clamped to contract bounds.
- **Finding (medium, hint separation):** progressive hints were included in the public challenge payload and shared mutation-planning delivery, despite the PRD requiring a separate hint prompt/schema.
- **Repair:** added a strict, rate-limited `/api/challenges/hint` route and separate GPT-5.6 Structured Output prompt/schema. The server accepts a live hint only when it exactly matches the approved progression step and contains neither the repair snippet nor reference solution; otherwise it safely returns that approved fixture hint. Future hints no longer enter the challenge response or browser storage.
- **Finding (high reliability, fixture evidence drift):** fallback transcripts claimed 4–7 tests, but the visible pytest source contained only one or two test functions. The deterministic repair gate was real, but the visible suite did not substantiate the displayed count.
- **Repair:** expanded all nine visible pytest suites to the exact reported counts while preserving a single expected mutated failure. Added a registry invariant that test-function count equals the passing transcript and checks that hints are distinct and omit completed repairs.
- **Finding (low, stale code):** the unused first-slice evaluator still marked Inventory and Notification as `soon`, contradicting the live catalog.
- **Repair:** removed the obsolete evaluator and its superseded tests. Added route coverage for every one of the nine approved project-skill combinations and an E2E flow that forges Inventory and Notification workspaces.
- **Finding (low, observability):** the minimum anonymous event vocabulary in the PRD had no implementation.
- **Repair:** added a bounded browser-local event log containing only event names, timestamps, project/challenge identifiers, source, and short outcomes—never learner hypotheses or explanations. The primary E2E verifies the required event sequence and privacy boundary.
- **Finding (medium, rate limiting):** arbitrary malformed `x-forwarded-for` strings could create distinct unbounded in-memory keys.
- **Repair:** client addresses are normalized, the bucket registry is capped at 5,000 entries with expired-entry cleanup and an overflow bucket, and malformed-address rotation has a regression test.
- **Test self-healing:** corrected a copy-only recovery-notice assertion, an ambiguous Playwright `Beginner` locator, and a clean-session navigation race discovered by the new secondary-project loop. These were harness failures; each was reproduced and repaired before rerunning downstream gates.
- **Finding (medium, prompt separation):** mutation planning, hints, and assessment were separated, but validation evidence was still interpreted only by workflow code despite the PRD explicitly requiring a distinct validation-interpretation prompt and schema.
- **Repair:** added a server-only strict validation contract and a dedicated GPT-5.6 Responses prompt after the authoritative original-pass/mutated-fail/signature gates. The interpreter may reject and trigger the bounded retry, but cannot promote invalid evidence because it is never reached until deterministic validation succeeds. Added veto/retry and permissive-interpreter/invalid-evidence regressions.
- **Finding (high, fallback verification):** the non-executing fixture verifier recognized a repair by snippet presence. A comment or syntactically invalid program containing the approved snippet could therefore be falsely reported as passing.
- **Repair:** fallback verification now requires exact equality with the server-owned prevalidated repair snapshot. This preserves the no-host-execution boundary and trades unsupported alternative fixes for sound deterministic evidence; semantically equivalent alternatives remain available in live Code Interpreter mode. Added comment, syntax-error, and dead-code decoy regressions.
- **Finding (medium, assessment honesty):** deterministic fallback root-cause and concept scores rose mainly with explanation length, allowing verbose irrelevant prose to appear well-grounded.
- **Repair:** added server-only causal signal groups per challenge and made fallback reasoning scores depend on those signals plus causal language and revision evidence. The UI continues to identify the source as a deterministic fallback rubric. A passing repair with irrelevant prose stays verified by tests but receives low reasoning scores and an explicit improvement prompt.
- **Finding (low, report evidence completeness):** FR-010 names files changed as deterministic evidence, but only the aggregate changed-line count reached the assessor and report.
- **Repair:** derive changed file names and aggregate line changes across every allowlisted file on the server, include both in GPT evidence and the strict response, and display the file list in the report. The primary E2E now asserts the exact file evidence.
- **Test self-healing:** the full parallel gate reproduced a clean-session race in the two-project E2E. Clearing storage after a persisted workspace had already hydrated allowed the outgoing React tree to rewrite the old attempt before navigation. The helper now clears storage in an origin-scoped init script before application code runs, keyed to a one-use query token that is removed before refresh testing.
- **Finding (medium, fallback evidence wording):** fixture mode was visibly tagged, but its panels still used generic “executed tests” language even though the secure fallback performs server-owned snapshot verification and never runs learner Python on the host.
- **Repair:** workspace and report evidence labels now branch on execution mode. Fallback summaries disclose the prevalidated snapshot comparison and host non-execution; live results retain explicit Code Interpreter wording. E2E assertions lock the distinction.
- **Evidence:** 36 unit/integration tests, five Playwright workflows, seven production routes, client-bundle leakage scan, production API smoke across all nine labs plus separate hint delivery and revision-aware assessment, and manual 1440 × 900 plus 390 × 844 visual review passed.

## Review record

- **Primary reviewer/builder:** Codex.
- **Scope:** functional behavior, contracts, OpenAI path, deterministic policy, security/privacy, injection and leakage, accessibility, responsive UX, dependencies, test adequacy, and submission compliance.
- **Blocker/high findings:** none unresolved in the local release candidate; the fixture-evidence drift was repaired before this checkpoint.
- **Medium findings repaired:** dependency advisories, test-runner overlap, contrast, document landmarks, and recovery/persistence polish.
- **Accepted external review findings:** none; no secondary review was performed.
- **Rejected findings:** none.
- **Remaining external gates:** live API smoke, app deployment/public availability, tester study, recording/publication, and feedback Session ID.

## July 18, 2026 — Public GitHub development baseline

- **Authorization:** the user explicitly requested repository initialization and publication for organized ongoing development. Public visibility follows the locked PRD submission requirement.
- **Repository:** initialized Git on `main`, committed the complete 64-file audited baseline as `660eff7`, created `https://github.com/Anish-Guntreddi/FaultSmith`, and configured `origin/main` tracking.
- **Development workflow:** added GitHub Actions CI, Dependabot for npm and Actions, CODEOWNERS, issue forms, a pull-request template, contribution guidance, private vulnerability-reporting guidance, squash-only merging, automatic branch deletion, issues, projects, topics, secret scanning, and push protection.
- **Publish safety:** ignored dependencies, builds, test output, local env files, and compiler caches; staged and public-source scans found no credential beyond deliberate synthetic redaction tests. The full pre-push gate passed: lint, types, 36 unit/integration tests, production build, 17-artifact client leakage scan, five E2E workflows, and zero audit vulnerabilities.
- **Remote verification:** GitHub Actions baseline run [29650774197](https://github.com/Anish-Guntreddi/FaultSmith/actions/runs/29650774197) completed successfully on public `main` using the checked-in clean-install workflow.
- **Dependency-policy self-heal:** the initial Dependabot scan opened isolated React/React DOM updates and unsupported ESLint/TypeScript major upgrades, producing expected red PR checks. Updated the policy to group coupled React and development-tool minor/patch updates while leaving all major upgrades for explicit compatibility work; security updates remain independent of these version-update ignores.
- **Direction:** the initial baseline necessarily landed directly on the empty `main`. Future work should use focused branches and pull requests governed by the checked-in template and CI gate.

## July 18, 2026 — Final local handoff rehearsal

- **Full gate:** reran `npm run quality`; lint, typecheck, 36 unit/integration tests, production build, the 17-artifact client leakage scan, and all five Playwright workflows passed.
- **Manual primary workflow:** completed the Expense Approval boundary-condition fixture from selection through hypothesis, a progressive hint, minimal repair, six-pass evidence, and the verified report. The browser console contained no warnings or errors.
- **Adversarial check:** an intentionally overbroad whitespace edit was rejected by the fixture's exact-snapshot boundary; the one-token `>` to `>=` repair then passed. This confirms the fallback verifier does not accept merely plausible or overbroad patches.
- **Regression hardening:** extended the primary Playwright workflow to reload the completed report and assert restored challenge identity, six-pass evidence, and hypothesis-revision evidence. The complete five-workflow E2E suite passed after the change.
- **Direction review:** the local release candidate and preserved prevalidated fallback remain ready for user testing. Remaining gates are external: live credential smoke, deployment approval/public URL, five-person study, recording/publication, and the primary `/feedback` Session ID.
