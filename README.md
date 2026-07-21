# FaultSmith

[![CI](https://github.com/Anish-Guntreddi/FaultSmith/actions/workflows/ci.yml/badge.svg)](https://github.com/Anish-Guntreddi/FaultSmith/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Live app:** [faultsmith.netlify.app](https://faultsmith.netlify.app) — no account or API key required, works immediately in guest mode.

FaultSmith turns working Python projects into validated debugging labs instead of another AI code-fixer. A learner picks a project, skill, and difficulty; the app introduces one controlled root cause, proves with pytest that the original passes and the mutation fails, and then makes the learner do the work: read the evidence, write a hypothesis, request bounded hints, edit only the allowlisted files, and explain the root cause before a patch can be verified. A guided nine-lesson roadmap builds this evidence-first habit for beginners; the direct skill catalog and an optional live GPT-5.6 path serve advanced learners. Deterministic test execution — never the model — decides whether a lesson is complete.

> AI that breaks your code on purpose so you learn how to fix it.

FaultSmith is an Education-track OpenAI Build Week project. The primary demonstration is the Expense Approval boundary-condition lab; Inventory Service and Notification Preferences provide six additional prevalidated scenarios, for nine challenge fixtures across three projects.

## Quickstart

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No account, no API key, and no Firebase configuration are required — the app boots straight into the guest-first learning loop. See [Run locally](#run-locally) below for the full environment-variable reference.

## Testing this submission

The fastest path to seeing the whole loop is the live guest deployment; nothing below requires a login or an OpenAI key.

1. Open [faultsmith.netlify.app](https://faultsmith.netlify.app) and click into the app (`/learn`). No sign-in prompt should ever block you.
2. Pick **Guided Roadmap → Lesson 1** (or any card in **Practice by skill**). This loads a real, prevalidated challenge fixture — not a mock — at zero OpenAI cost. `/api/health` reports `fixtureFallback: "ready"`; the UI visibly labels prevalidated evidence as such.
3. **Observe:** read the failing pytest evidence in the workspace evidence well.
4. **Hypothesize:** write an initial hypothesis in the journal, then try **Check my reasoning** — the new hypothesis-coaching feature (see below) gives three-axis feedback (locus / mechanism / trigger) without ever revealing the fix.
5. **Repair:** edit only the allowlisted source file(s) and rerun tests.
6. **Verify:** submit the patch with a root-cause explanation. A failing test can never produce a `verified` report, regardless of what the explanation says.
7. Optional: open **My Progress** to see the guest-mode dashboard (local-only, no account) — completion by phase, score dimensions, and a deterministic next-lesson recommendation with its reason shown.
8. Optional: **Create account / Continue with Google** in My Progress to see cross-device sync; this is entirely optional and never gates the core loop.

If you have a funded `OPENAI_API_KEY`, setting it server-side (never `NEXT_PUBLIC_`) switches Practice-by-skill generation to the live GPT-5.6 + Code Interpreter path; everything above still works identically without one.

## Learning loop

1. Follow the zero-token guided roadmap or choose a project, skill, and difficulty directly.
2. Load a preserved prevalidated challenge or request the constrained live validation path.
3. Inspect the mutated project and authoritative failing evidence from the prevalidated gate or live Code Interpreter tests.
4. Record a hypothesis, request up to three progressive hints, edit only the allowlisted source, and rerun tests.
5. Submit the exact code snapshot with a root-cause explanation.
6. Receive a report that clearly separates executed-test evidence from model assessment.

A failing suite can never receive verified status, regardless of the explanation or model response.

## My Progress and optional accounts

The **My Progress** dashboard derives bounded practice evidence — lesson completion by phase, verified score dimensions, independent-solve rate, test-run process evidence, strongest practiced skill, reinforcement priority, recent attempts, and a deterministic next-step recommendation with a plain-language reason — entirely from validated local state. It works with no account, no Firebase configuration, and no network. Metrics are practice evidence, not grades or certification, and test-run counts never lower a score.

Three access paths exist when cloud sync is configured: **Continue as guest** (the default; never gated), **Create account / Log in** with email and password, and **Continue with Google**. Accounts are optional and appear only inside My Progress — no login wall exists anywhere. Key boundaries:

- Firebase Authentication owns passwords, password policy, email verification, password reset, and provider identity. Password material never reaches the FaultSmith server, localStorage, logs, or evidence, and account-existence responses stay generic.
- New email/password accounts must verify their email before cloud sync starts; learning continues locally in the meantime.
- The server verifies every Firebase ID token, derives identity only from the verified UID, and mediates all Cloud Firestore writes. Direct browser Firestore access is denied by deployed deny-all rules.
- Cloud storage holds only a strict bounded learning profile (nine lesson completions maximum, 50 attempt summaries maximum) — never source code, learner prose, hints, hidden answers, tokens, or credentials. Local history can be imported into an account exactly once, labeled as an import; learners can explicitly delete their cloud data and then their account.
- Signing out returns to guest/device data without deleting cloud data. Any auth or cloud failure visibly degrades to "Saved on this device" and never blocks a challenge or report.
- With cloud configuration absent (the default), the build is byte-identical to the local-only baseline: no Firebase code loads, no Firebase origin appears in the CSP, and zero Firebase network requests occur.

Real Firebase project configuration is a private operator step described in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md); the credential-free emulator suites in [docs/TESTING.md](docs/TESTING.md) prove the same flows without any real project.

## Runtime architecture

- **Browser:** a Next.js client workspace with browser-local anonymous attempt and curriculum progress. Guided progress contains only bounded lesson IDs and evidence metrics; attempt storage contains only public challenge fields, learner code, journal revisions, revealed hints, and the report. A separate capped event log contains no learner prose.
- **Server routes:** strict Zod contracts, JSON/content-size checks, per-route request limiting, safe error responses, and no-store responses.
- **GPT-5.6:** separate Responses API prompts/schemas emit the exact approved mutation contract, interpret validation evidence, deliver one approved progressive hint at a time, and return only bounded rubric scores after tests execute. Learner-facing feedback prose remains server-owned.
- **Code Interpreter:** in live mode, original, mutated, and learner Python snapshots execute in an ephemeral OpenAI Code Interpreter container. The client cannot supply commands or container identifiers.
- **Fixture fallback:** a deterministic, prevalidated evaluator keeps the full learning loop demonstrable when the key or live service is unavailable. The UI labels this mode.
- **Hypothesis coaching (`/api/challenges/hypothesis`):** an optional, additive GPT-5.6 coach that scores a learner's hypothesis on three independent axes — locus (which code?), mechanism (why does it misbehave?), trigger (which input exposes it?) — and asks one Socratic question at the weakest axis. It never gates completion or touches the assess contract; deterministic tests remain the sole authority. See "Hypothesis coaching containment" below.

Learner Python is never executed by the Next.js host. Hidden root causes and reference fixes remain in server-only modules and are stripped from every public DTO.

### Hypothesis coaching containment

The coach's prompt receives only observed evidence (mutated source, test source, the expected failure signature, and the learner's hypothesis history) — never the hidden root cause, reference solution, mutation patch, or hints. A typed projection (`buildCoachContext`) enforces that strip, and a unit test asserts the forbidden fields are absent from its output.

Answer-blindness alone is not treated as sufficient containment, because a capable model can often derive a root cause from buggy source plus a failing test. The actual containment mechanism is an **output denylist filter**: every candidate response is checked against the fixture's hidden answer (`assertNoLeak`) before it can reach the learner. A response containing a near-verbatim line from the reference solution, either side of the mutation diff, or a long contiguous span of the hidden root cause is rejected — one regeneration is attempted under a stricter instruction, and a second rejection degrades to a deterministic, evidence-grounded fallback response labeled `deterministic_fallback`. A leak is designed to never reach the learner. See `docs/superpowers/specs/2026-07-21-hypothesis-coaching-design.md` for the full design.

## Requirements

- Node.js 22 or newer (`.nvmrc` pins 24; Firebase Admin 14 requires Node 22+)
- npm
- A current Chromium browser. Chrome and Edge are supported for the submission build; Playwright Chromium is the tested browser. Firefox and Safari are best-effort for the MVP.
- Optional: an OpenAI API key for controlled live verification
- Optional (emulator test suites only): a Java 21+ JDK for the Firebase Auth/Firestore emulators

## Run locally

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Set `OPENAI_API_KEY` in `.env.local` to enable the live GPT-5.6 and Code Interpreter path. Leave it blank to exercise the real fallback. Never use a `NEXT_PUBLIC_` prefix for this credential.

Cloud sync stays off by default: with `NEXT_PUBLIC_FAULTSMITH_CLOUD_SYNC` unset the app is fully local-only. The Firebase client values (`NEXT_PUBLIC_FIREBASE_*`) are public project metadata, while `FIREBASE_PROJECT_ID`/`FIREBASE_SERVICE_ACCOUNT` are server-only; see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) before configuring any real project.

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
npm run test:firebase
npm run build
npm run security:bundle
npm run test:e2e
```

`npm run quality` runs the complete sequence, and `npm run security:source` scans the working tree plus reachable history. `npm run test:firebase` and `npm run test:e2e:firebase` run the Firestore-rules, cloud-persistence, and browser account/sync suites against local Firebase emulators under the fake `demo-faultsmith` project — they need a Java 21+ JDK and never contact real Firebase. The normal automated suite mocks or avoids external OpenAI calls; a live API smoke test is intentionally separate so it cannot spend credits unexpectedly.

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
- Security headers include CSP, HSTS, frame denial, MIME sniffing protection, and restrictive browser permissions. When cloud sync is configured the CSP widens only by the exact Firebase/Google origins the approved sign-in flow empirically requires — never a wildcard; cloud-off production headers are byte-identical to the baseline.
- Cloud identity is server-verified: bounded Authorization parsing, Firebase Admin token verification, verified-email enforcement, UID-only path authority, strict exact-key DTOs, same-origin containment on token-accepting routes, and deny-all direct-client Firestore rules.
- `.env.local` and generated artifacts are ignored. `.env.example` contains no credential.

Residual risks and verification evidence are documented in [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md).

## Built with Codex — how we collaborated with Codex

FaultSmith's roughly 99 commits span four days (July 18–21, 2026). Codex was the primary implementation environment for essentially the whole product: the Next.js/TypeScript application, the nine-fixture challenge domain, the strict Zod contract layer, the GPT-5.6 + Code Interpreter gateway, every route guard and security hardening pass, the automated test suites, and the optional Firebase accounts/cloud-progress boundary. `docs/BUILD_LOG.md` is the day-by-day provenance record, and `.planning/phases/` holds the GSD execution plans plus independent product/QA/security review reports that back it up.

### Where Codex accelerated the workflow

- **Day one, the full secure domain.** On July 18 Codex built the entire secure challenge domain in one day — strict Zod contracts, nine single-root-cause fixtures across three projects, server-only hidden-field modules, and the GPT-5.6 + Code Interpreter gateway with retry/fallback — then hardened it with adversarial tests for prompt injection, path traversal, arbitrary command/container-ID fields, and rate-limit-key abuse.
- **Self-directed audits that found real defects.** The July 18 "requirement-level completion audit" logged in `docs/BUILD_LOG.md` is representative: Codex reread every functional, AI, and security requirement against the running code and found — then fixed and regression-tested — a high-severity fallback-verification gap (a comment or syntactically invalid file containing the approved repair snippet could be misreported as a passing patch), a fixture transcript/evidence mismatch, missing prompt separation for hint delivery and validation interpretation, and a rate-limiter key-exhaustion path. None of these were filed as human bug reports; Codex surfaced them by auditing its own prior work against the PRD.
- **Independent review rounds, not self-grading.** Using a GSD (get-stuff-done) execution framework, Codex ran separate product-completeness, QA/accessibility, and security/adversarial review passes against frozen commit SHAs at the close of Phase 1 and Phase 01.1 (see `.planning/phases/01-*/01-04-SECURITY-REVIEW.md` and `01.1-05-SECURITY-REVIEW.md`). The Phase 1 security review found a high-severity issue — live assessment input included hidden fixture knowledge — repaired by excluding hidden answers from model input, constraining the model to three bounded numeric scores, and keeping completion authority, evidence, and learner-facing prose entirely server-owned.
- **Phase 01.1 accounts/cloud progress across three implementation waves.** Codex built the entire optional Firebase Authentication + Cloud Firestore boundary — versioned local-progress migration, a lazy browser Auth adapter, a server-only Admin gateway, a transactional Firestore repository with SHA-256 idempotency and 50-record retention, default-deny security rules, and 23 Firebase-emulator integration tests plus 16 emulator-mode Playwright/axe scenarios — while keeping the guest/local path the unconditional default and free of any Firebase network request.
- **Objective, repeated gate evidence.** Every phase closed on the same green bar: lint/typecheck clean, the full Vitest suite (325 tests at the latest presentation checkpoint), Firebase emulator integration, a production build, a client-bundle leakage scan for hidden fixture answers, the Playwright/axe suite at desktop and mobile viewports, and a zero-vulnerability dependency audit. Exact per-checkpoint numbers are in `docs/TESTING.md`.

### Decisions the human made

Product scope, track, and risk posture were human calls that Codex then executed inside: locking to three curated Python/pytest projects instead of arbitrary-repository ingestion (`docs/PRD.md` §5.3, §21); making the prevalidated-fixture fallback a first-class, permanently supported mode rather than a demo crutch, so the whole product works at zero API cost; keeping guest mode the unconditional default and never gating the core loop behind sign-in, even after optional Firebase accounts shipped (`docs/PERSONALIZED_LEARNING_PRD.md` §1); and, on submission day, replacing the fixture-mode hypothesis scorer — originally keyword/substring matching, which was gameable ("boolean and condition because" scored like a deep explanation) and brittle — with an AI hypothesis coach that is explicitly additive, cannot affect completion, and is contained by an output-denylist filter rather than by prompt omission alone (`docs/superpowers/specs/2026-07-21-hypothesis-coaching-design.md`). The Forensic Workbench visual system and its later typography/motion refinement were a human-directed design pass, executed with a secondary AI design collaborator working alongside Codex and reviewed and hardened by Codex before shipping (see the July 19–20 entries in `docs/BUILD_LOG.md`).

### How GPT-5.6 and Codex contributed to the final result

Codex is the build tool: it wrote the application, the tests, the security hardening, and most of the documentation, and ran the review loops that caught the defects described above before they shipped. GPT-5.6 is the runtime AI inside the shipped product, used in four deliberately separated, schema-constrained roles rather than one monolithic prompt: emitting the exact approved mutation contract for a challenge, interpreting validation evidence, delivering one progressive hint at a time, and returning three bounded 0–100 rubric scores after tests have already executed. In every one of those roles, GPT-5.6's output is checked against deterministic evidence or an exact server-approved contract before it can affect what the learner sees — a failing test result can never be overridden into a `verified` report by model output, in either the live or fixture-fallback path. Today's hypothesis-coaching feature extends that same pattern: an answer-blind prompt (`buildCoachContext`) strips the hidden root cause, reference solution, mutation patch, and hints before the model ever sees them, and a hard output-denylist filter (`assertNoLeak`) checks every candidate response against the fixture's actual hidden answer before it can reach the learner. That lets GPT-5.6 reason freely over buggy source and a failing test — the exact capability that makes grey-area feedback like "you found the right function but misidentified the mechanism" possible — while making a leaked answer structurally unreachable rather than merely unlikely.

## Documentation

- [Product requirements](docs/PRD.md)
- [Personalized learning, accounts, and cloud progress PRD](docs/PERSONALIZED_LEARNING_PRD.md)
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
