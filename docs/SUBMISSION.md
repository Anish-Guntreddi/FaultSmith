# Devpost Submission Draft

## Project name

FaultSmith

## Tagline

AI that breaks your code on purpose so you learn how to fix it.

## Track

Education

## Elevator pitch

FaultSmith transforms small working Python projects into deliberate debugging labs. Beginners follow nine zero-token, prevalidated lessons; advanced learners can request an optional live path where GPT-5.6 emits an exact, server-approved mutation contract and OpenAI Code Interpreter proves the original passes and mutation fails. The learner then investigates, patches, and explains the failure. Executed or prevalidated evidence controls verification, while live GPT-5.6 may contribute only bounded reasoning scores.

## Inspiration

Most programming education shows the happy path, while increasingly capable AI can hand students a patch before they learn to parse a failure. That dependency becomes expensive when they inherit unfamiliar software and cannot reproduce, explain, or safely repair it. FaultSmith makes debugging itself the exercise: it gives learners an organized evidence-first roadmap and safe failures that have already been proven reproducible, then asks them to reason before AI can help.

## What it does

- Opens with a judge-facing public story that explains the AI-dependency problem, demonstrates FaultSmith's evidence-first method with fictional case data, and routes directly into the complete learning lab.
- Offers three curated Python systems: Expense Approval, Inventory Service, and Notification Preferences.
- Organizes the nine validated labs into a three-phase beginner-to-advanced roadmap with concept guides, investigation checklists, local mastery evidence, and deterministic next-step recommendations.
- Preserves a direct Practice by skill catalog for advanced learners and an optional constrained GPT-5.6 live path.
- Loads one validated bug aligned to the chosen system and skill; the current practice-level control labels the attempt rather than changing fixture content.
- Verifies original-pass and mutated-fail behavior before presenting the lab.
- Provides an allowlisted editor, authoritative test output, a revision-aware hypothesis journal, and separately delivered progressive hints.
- Reruns the exact submitted snapshot and blocks verified status whenever tests fail.
- In live mode, uses GPT-5.6 for three bounded rubric scores; server-owned templates provide learner-facing feedback.
- Recovers to nine real prevalidated fixtures when a key or live service is unavailable.
- Shows a guest-first My Progress dashboard: phase completion, verified score dimensions, independent-solve rate, descriptive test-run evidence, strongest practiced skill, reinforcement priority, and an explained deterministic next step — derived entirely from validated local state with no account, model call, or network.
- Optionally (configuration-gated and emulator-proven; real Firebase configuration is a separate private operator step) lets a learner create a verified email/password account or continue with Google to sync the same bounded metrics across devices, with server-verified identity, one-time labeled local import, and explicit cloud-data/account deletion. Guest mode remains the default and no login wall exists anywhere.

## How it was built

FaultSmith is a Next.js 16 and TypeScript application. Zod defines every request, public response, mutation plan, execution result, and assessment. Server-only fixture modules contain hidden root causes and reference repairs; public DTO construction strips those fields. The OpenAI Responses API uses separate GPT-5.6 Structured Outputs for exact approved-contract emission, validation interpretation, progressive hint delivery, and score-only assessment. Python execution uses the Code Interpreter tool with a fixed server-owned test command, ephemeral containers, bounded execution time, and sanitized output.

The browser stores anonymous attempt and curriculum progress locally so a refresh does not erase a lab or roadmap. Guided progress contains only approved lesson IDs and bounded evidence metrics. It never stores the API key, hidden answer, reference solution, internal prompt, provider container identifier, learner prose, or source code.

## How OpenAI is substantive

GPT-5.6 is an optional constrained part of the live control plane, not a decorative chatbot. It emits a schema-valid contract that must exactly match the server-approved challenge, interprets authoritative validation evidence through a separate strict contract, receives bounded retry feedback, and can retry once. Code Interpreter supplies execution evidence for original, mutated, and learner snapshots. GPT-5.6 can then deliver exactly one approved progressive hint or return three bounded explanation scores; deterministic policy supplies feedback prose and retains final authority.

## How Codex was used

The majority of core functionality was built in the primary Codex task: architecture, contracts, fixtures, OpenAI gateway, route guards, UI workflow, tests, adversarial validation, accessibility repairs, security hardening, browser validation, and submission documentation. Codex also caught and repaired runner separation, dependency-audit, contrast, landmark, persistence, and narrow-layout issues through repeated validation loops.

No secondary Claude Code review was performed. This is disclosed explicitly.

## Challenges

The hardest design constraint was combining model-assisted behavior with trustworthy evidence. A model response alone cannot prove a debugging challenge is valid. FaultSmith solves this by constraining live output to an exact approved contract, executing before presentation, and making deterministic policy—not the assessment model—the verification authority. A second challenge was keeping the demo reliable without misrepresenting the live path, which led to an explicitly labeled, fully functional fixture fallback.

## Accomplishments

- Nine prevalidated single-root-cause challenges across three domains
- A zero-token guided roadmap that makes evidence-first debugging accessible without requiring prompt-writing skill
- Verified-only local progress and deterministic recommendations that reserve live model use for explicitly selected advanced practice
- A complete selection-to-report workflow with refresh recovery
- Hidden-answer stripping and server-side file allowlists
- Adversarial coverage for injection-shaped text, traversal, arbitrary commands, container IDs, malformed plans, timeouts, and failing-patch promotion
- Automated keyboard, axe accessibility, and mobile-overflow checks
- Zero known npm audit vulnerabilities at the release-candidate checkpoint

## What we learned

AI-generated educational content becomes trustworthy only when its claims are independently testable. Structured output narrows what the model may propose, sandbox execution supplies evidence, deterministic policy resolves conflicts, and careful fallback design makes the experience resilient.

## What's next

After the Build Week MVP, FaultSmith could add instructor-authored fixture packs, cohort analytics, more Python domains, constrained natural-language challenge requests, and carefully reviewed repository ingestion. Arbitrary code execution and arbitrary repository mutation remain intentionally outside this release.

## Links and submission fields

- **Public demo URL:** `[ADD AFTER DEPLOYMENT APPROVAL]`
- **Public source repository:** [github.com/Anish-Guntreddi/FaultSmith](https://github.com/Anish-Guntreddi/FaultSmith)
- **Demo video:** `[ADD AFTER RECORDING AND PUBLICATION]`
- **Primary Codex /feedback Session ID:** `[ADD FROM PRIMARY BUILD TASK]`
- **Five-tester result:** `[ADD AFTER EXTERNAL STUDY]`
- **License:** MIT

The [official hackathon rules](https://openai.devpost.com/rules) require working project access through a website, functioning demo, or test build, plus a public repository and public video. They do not specifically require Vercel. Because FaultSmith is a browser application, the submission plan uses a stable unauthenticated HTTPS deployment as the safest judging-access path; that deployment has not yet been authorized or claimed.

## Disclosure

The application has a production-ready local fallback, a public landing surface, automated mocked coverage, a public source repository with GitHub Actions CI, and credential-safe release tooling. On the July 19 local candidate, 281 unit/integration tests, 23 Firebase emulator-integration tests, 20 default plus 16 emulator-mode browser/accessibility workflows, the production build, 24-artifact bundle security scan, source/history security scan, zero-vulnerability audit, and the complete fallback/production smoke passed. Independent product/QA/security/motion reviews found and closed landing fixture leakage, stale root-only smoke coverage, metadata-origin and route-specific social gaps, and a low-height motion edge case. A private Firebase project has passed the sanitized automated real-project smoke; its remaining Google/inbox/clean-browser/cloud-off checks are still human-gated. The live OpenAI smoke and deployment remain unperformed pending credentials/approval. If cloud checkpoints miss the deadline, the same build ships with cloud sync disabled and the full local personalized dashboard intact. The remaining placeholder fields must be updated with objective evidence before final submission.

### Dependencies and assistance

- Runtime: Next.js, React, OpenAI JavaScript SDK, Zod, Tailwind CSS, `server-only`, and the Firebase Web/Admin SDKs for optional configuration-gated identity and cloud progress.
- Development verification: TypeScript, ESLint, Vitest, Playwright, and axe-core.
- Transitive dependency licenses were reviewed; see `docs/THREAT_MODEL.md`.
- Codex is the primary builder. Independent Codex development agents performed the documented product, QA/accessibility, and security reviews; no Claude Code review was used.
- The application contains no third-party project content, music, school records, learner accounts, or paid analytics service.
