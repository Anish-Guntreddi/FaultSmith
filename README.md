# FaultSmith

[![CI](https://github.com/Anish-Guntreddi/FaultSmith/actions/workflows/ci.yml/badge.svg)](https://github.com/Anish-Guntreddi/FaultSmith/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

FaultSmith turns working Python projects into validated debugging labs. A guided nine-lesson roadmap helps students build evidence-first debugging habits before they rely on open-ended AI, while the direct skill catalog preserves optional constrained GPT-5.6 validation and scoring for advanced learners. FaultSmith introduces one controlled root cause, proves the failure with tests, coaches the learner without revealing the answer, and evaluates both the repaired code and the learner's reasoning.

> AI that breaks your code on purpose so you learn how to fix it.

FaultSmith is an Education-track OpenAI Build Week project. The primary demonstration is the Expense Approval boundary-condition lab; Inventory Service and Notification Preferences provide six additional prevalidated scenarios, for nine challenge fixtures across three projects.

## Learning loop

1. Follow the zero-token guided roadmap or choose a project, skill, and difficulty directly.
2. Load a preserved prevalidated challenge or request the constrained live validation path.
3. Inspect the mutated project and authoritative failing evidence from the prevalidated gate or live Code Interpreter tests.
4. Record a hypothesis, request up to three progressive hints, edit only the allowlisted source, and rerun tests.
5. Submit the exact code snapshot with a root-cause explanation.
6. Receive a report that clearly separates executed-test evidence from model assessment.

A failing suite can never receive verified status, regardless of the explanation or model response.

## Runtime architecture

- **Browser:** a Next.js client workspace with browser-local anonymous attempt and curriculum progress. Guided progress contains only bounded lesson IDs and evidence metrics; attempt storage contains only public challenge fields, learner code, journal revisions, revealed hints, and the report. A separate capped event log contains no learner prose.
- **Server routes:** strict Zod contracts, JSON/content-size checks, per-route request limiting, safe error responses, and no-store responses.
- **GPT-5.6:** separate Responses API prompts/schemas emit the exact approved mutation contract, interpret validation evidence, deliver one approved progressive hint at a time, and return only bounded rubric scores after tests execute. Learner-facing feedback prose remains server-owned.
- **Code Interpreter:** in live mode, original, mutated, and learner Python snapshots execute in an ephemeral OpenAI Code Interpreter container. The client cannot supply commands or container identifiers.
- **Fixture fallback:** a deterministic, prevalidated evaluator keeps the full learning loop demonstrable when the key or live service is unavailable. The UI labels this mode.

Learner Python is never executed by the Next.js host. Hidden root causes and reference fixes remain in server-only modules and are stripped from every public DTO.

## Requirements

- Node.js 20.9 or newer
- npm
- A current Chromium browser. Chrome and Edge are supported for the submission build; Playwright Chromium is the tested browser. Firefox and Safari are best-effort for the MVP.
- Optional: an OpenAI API key for controlled live verification

## Run locally

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Set `OPENAI_API_KEY` in `.env.local` to enable the live GPT-5.6 and Code Interpreter path. Leave it blank to exercise the real fallback. Never use a `NEXT_PUBLIC_` prefix for this credential.

Open [http://localhost:3000](http://localhost:3000). No account is required.

Install the browser once before running E2E tests:

```bash
npx playwright install chromium
```

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

`npm run quality` runs the complete sequence. The normal automated suite mocks or avoids external OpenAI calls; a live API smoke test is intentionally separate so it cannot spend credits unexpectedly.

With a production server already running, release operators can use:

```bash
npm run smoke:fallback
npm run smoke:production
npm run readiness:prepare
```

`npm run smoke:live` is the only provided command that opts into the paid provider proof. It first requires the server health route to report live configuration and never accepts an API key argument. OpenAI API usage is billed separately from a ChatGPT subscription, so configure the server-only key privately only when the reviewed offline checkpoint is green. Optional sanitized evidence must be written under the ignored `test-results/` directory.

See [docs/TESTING.md](docs/TESTING.md) for the QA matrix and manual procedures, and [docs/COMPLETION_REPORT.md](docs/COMPLETION_REPORT.md) for Definition of Finished evidence.

## Security model

- Strict schemas bound IDs, files, text, scores, file count, file size, and total request size.
- Server-side allowlists constrain editable and executable files.
- Mutation plans are accepted only when they exactly match an approved server-owned contract and pass original-pass/mutated-fail validation.
- Test results are authoritative; assessment cannot promote failing code.
- Output is length-limited and sanitized for ANSI control sequences, key-shaped strings, and local absolute paths.
- Rate and execution-time limits reduce abuse and runaway-cost exposure.
- Security headers include CSP, HSTS, frame denial, MIME sniffing protection, and restrictive browser permissions.
- `.env.local` and generated artifacts are ignored. `.env.example` contains no credential.

Residual risks and verification evidence are documented in [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md).

## Build Week provenance

Codex is the primary implementation environment and this task is the primary build record. Codex implemented the application, API integration, fixtures, validation, security hardening, tests, browser review, and documentation. GPT-5.6 is substantive optional runtime functionality for constrained contract emission, validation interpretation, approved hint delivery, and bounded explanation scoring; Code Interpreter is the live Python execution boundary.

No secondary Claude Code review was performed. That absence is recorded rather than represented as completed. The fixture fallback is a reliability feature, not a claim that live verification occurred without a credential.

## Documentation

- [Product requirements](docs/PRD.md)
- [Guided learning MVP](docs/GUIDED_LEARNING_MVP.md)
- [Sample project catalog](docs/SAMPLE_PROJECTS.md)
- [Persistent execution goal](docs/EXECUTION_GOAL.md)
- [Build and review log](docs/BUILD_LOG.md)
- [Roadmap and direction review](docs/ROADMAP.md)
- [Threat model](docs/THREAT_MODEL.md)
- [Testing guide and QA matrix](docs/TESTING.md)
- [Deployment and rollback runbook](docs/DEPLOYMENT.md)
- [Five-tester UAT protocol](docs/UAT_PROTOCOL.md)
- [Demo script](docs/DEMO_SCRIPT.md)
- [Devpost submission draft](docs/SUBMISSION.md)
- [Completion report](docs/COMPLETION_REPORT.md)

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md) for the branch, review, validation, and product-boundary workflow. Report vulnerabilities privately according to [SECURITY.md](SECURITY.md); do not place credentials or exploit details in public issues.

## License

FaultSmith is available under the [MIT License](LICENSE).
