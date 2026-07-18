# Devpost Submission Draft

## Project name

FaultSmith

## Tagline

AI that breaks your code on purpose so you learn how to fix it.

## Track

Education

## Elevator pitch

FaultSmith transforms small working Python projects into deliberate debugging labs. GPT-5.6 selects a minimal, single-root-cause mutation through a strict structured contract; OpenAI Code Interpreter proves the original passes and the mutation fails; then the learner investigates, patches, and explains the failure. Deterministic tests control verification, while GPT-5.6 evaluates reasoning without being allowed to override the evidence.

## Inspiration

Most programming education shows the happy path. Real engineering work is dominated by ambiguous symptoms, boundary cases, state transitions, and incomplete mental models. FaultSmith makes debugging itself the exercise: it gives learners a safe failure that has already been proven reproducible, then asks them to reason from evidence.

## What it does

- Offers three curated Python systems: Expense Approval, Inventory Service, and Notification Preferences.
- Forges one validated bug aligned to a chosen skill and difficulty.
- Verifies original-pass and mutated-fail behavior before presenting the lab.
- Provides an allowlisted editor, authoritative test output, a revision-aware hypothesis journal, and separately delivered progressive hints.
- Reruns the exact submitted snapshot and blocks verified status whenever tests fail.
- Uses GPT-5.6 for bounded feedback on the learner's root-cause explanation.
- Recovers to nine real prevalidated fixtures when a key or live service is unavailable.

## How it was built

FaultSmith is a Next.js 16 and TypeScript application. Zod defines every request, public response, mutation plan, execution result, and assessment. Server-only fixture modules contain hidden root causes and reference repairs; public DTO construction strips those fields. The OpenAI Responses API uses separate GPT-5.6 Structured Outputs for mutation planning, validation interpretation, progressive hint delivery, and assessment. Python execution uses the Code Interpreter tool with a fixed server-owned test command, ephemeral containers, bounded execution time, and sanitized output.

The browser stores anonymous progress locally so a refresh does not erase a lab. It never stores the API key, hidden answer, reference solution, internal prompt, or provider container identifier.

## How OpenAI is substantive

GPT-5.6 is part of the product's control plane, not a decorative chatbot. It returns a schema-valid mutation contract, interprets authoritative validation evidence through a separate strict contract, receives structured feedback when release is rejected, and can retry once. Code Interpreter supplies execution evidence for original, mutated, and learner snapshots. GPT-5.6 then delivers an approved progressive hint or assesses the learner's explanation through separate bounded contracts, but deterministic tests retain final authority.

## How Codex was used

The majority of core functionality was built in the primary Codex task: architecture, contracts, fixtures, OpenAI gateway, route guards, UI workflow, tests, adversarial validation, accessibility repairs, security hardening, browser validation, and submission documentation. Codex also caught and repaired runner separation, dependency-audit, contrast, landmark, persistence, and narrow-layout issues through repeated validation loops.

No secondary Claude Code review was performed. This is disclosed explicitly.

## Challenges

The hardest design constraint was combining generative behavior with trustworthy evidence. A model response alone cannot prove a debugging challenge is valid. FaultSmith solves this by constraining generation to an approved contract, executing before presentation, and making tests—not the assessment model—the verification authority. A second challenge was keeping the demo reliable without misrepresenting the live path, which led to an explicitly labeled, fully functional fixture fallback.

## Accomplishments

- Nine prevalidated single-root-cause challenges across three domains
- A complete selection-to-report workflow with refresh recovery
- Hidden-answer stripping and server-side file allowlists
- Adversarial coverage for injection-shaped text, traversal, arbitrary commands, container IDs, malformed plans, timeouts, and failing-patch promotion
- Automated keyboard, axe accessibility, and mobile-overflow checks
- Zero known npm audit vulnerabilities at the release-candidate checkpoint

## What we learned

AI-generated educational content becomes trustworthy only when its claims are independently testable. Structured output narrows what the model may propose, sandbox execution supplies evidence, deterministic policy resolves conflicts, and careful fallback design makes the experience resilient.

## What's next

After the Build Week MVP, FaultSmith could add instructor-authored fixture packs, cohort analytics, more Python domains, and carefully reviewed repository ingestion. Arbitrary code execution and arbitrary repository mutation remain intentionally outside this release.

## Links and submission fields

- **Public demo URL:** `[ADD AFTER DEPLOYMENT APPROVAL]`
- **Public source repository:** `[ADD AFTER REPOSITORY IS PUBLISHED]`
- **Demo video:** `[ADD AFTER RECORDING AND PUBLICATION]`
- **Primary Codex /feedback Session ID:** `[ADD FROM PRIMARY BUILD TASK]`
- **Five-tester result:** `[ADD AFTER EXTERNAL STUDY]`
- **License:** MIT

## Disclosure

The application has a production-ready local fallback and automated mocked coverage. At the July 18 release-candidate checkpoint, the live OpenAI smoke test was not run because `OPENAI_API_KEY` was not present, and deployment had not been authorized. These fields must be updated with objective evidence before final submission.

### Dependencies and assistance

- Runtime: Next.js, React, OpenAI JavaScript SDK, Zod, Tailwind CSS, and `server-only`.
- Development verification: TypeScript, ESLint, Vitest, Playwright, and axe-core.
- Transitive dependency licenses were reviewed; see `docs/THREAT_MODEL.md`.
- Codex is the primary builder and reviewer. No Claude Code or other secondary code-review agent was used.
- The application contains no third-party project content, music, school records, learner accounts, or paid analytics service.
