FaultSmith Persistent Execution Goal

## Goal

Complete FaultSmith as a secure, validated, polished, and submission-ready OpenAI Build Week Education project. Continue through implementation, testing, security review, quality assurance, adversarial validation, repair, regression testing, and engineering-direction loops until every completion criterion in this document and `docs/PRD.md` has objective evidence.

Do not stop after planning, scaffolding, writing a report, identifying failures, or producing recommendations. When an in-scope issue is found, diagnose it, repair it, add or improve regression coverage, rerun the relevant quality gates, and continue to the next highest-priority gap.

## Sources of Truth

Read these before making changes:

1. `AGENTS.md`
2. `docs/PRD.md`
3. `docs/BUILD_LOG.md`
4. `README.md`
5. The current repository, tests, git history, and runtime behavior

Priority order when instructions differ:

1. Current user instruction
2. Safety, sandbox, authorization, and competition rules
3. `docs/PRD.md` locked product decisions
4. This execution goal
5. Existing implementation conventions

Do not silently expand or change the locked product concept. Record implementation discoveries in `docs/BUILD_LOG.md`. Ask before changing a product decision that materially affects the target user, competition track, primary demo, privacy posture, or deployment model.

## Required Outcome

FaultSmith must provide a complete learning loop:

1. Select a curated Python project, target skill, and difficulty.
2. Use GPT-5.6 to produce a schema-valid, minimal, single-root-cause mutation contract.
3. Prove that the original project passes.
4. Prove that the mutated project fails with the expected signature.
5. Present a debugging workspace without leaking the solution.
6. Let the learner inspect code, run tests, record hypotheses, and request progressive hints.
7. Execute learner code only in OpenAI Code Interpreter.
8. Verify the final patch using deterministic tests.
9. Assess the learner's explanation with GPT-5.6 without overriding test evidence.
10. Present a clear skill-evidence report.
11. Preserve a real, prevalidated fixture fallback when live API functionality is unavailable.

## Applicable Skills and Capabilities

Use applicable installed skills and native Codex capabilities when they improve correctness or verification.

### OpenAI API implementation

- Use the OpenAI Docs skill before implementing or changing Responses API, GPT-5.6, Structured Outputs, container, file-upload, or Code Interpreter integrations.
- Treat current official documentation as authoritative.
- Do not invent endpoints, parameters, response fields, model names, or SDK behavior.
- Keep `OPENAI_API_KEY` server-only and out of all prompts, commits, client bundles, and logs.

### Code review

- Perform a focused review after every stable feature milestone.
- Use Codex review capabilities or `/review` checkpoints when appropriate.
- Review the actual diff, affected call paths, tests, failure states, and surrounding assumptions.
- Do not accept a review finding without reproducing or technically validating it.

### Security review

- Use the Codex Security capability or plugin if it is available in the current environment.
- If it is unavailable, complete the equivalent manual threat-model and security-review checklist in this document.
- Security review must produce actionable findings, severity, affected files, exploit or failure path, proposed mitigation, and verification evidence.

### Secondary Claude Code review

Claude Code may review architecture, security, accessibility, performance, edge cases, code quality, and test gaps only after Codex has implemented a stable checkpoint.

Claude Code is not the primary builder. Do not depend on Claude Code to complete the goal. Bring its findings back into the primary Codex thread, validate each finding, implement accepted fixes through Codex, and record accepted and rejected findings in `docs/BUILD_LOG.md`.

## Continuous Engineering Loop

Repeat this loop until the Definition of Finished is satisfied.

### Phase 1: Observe

1. Inspect repository and git status.
2. Run the current verification suite.
3. Inspect runtime behavior relevant to the next milestone.
4. Compare implementation evidence against the PRD and completion matrix.
5. Identify the highest-impact unresolved gap.

### Phase 2: Decide

Select the smallest milestone that materially improves the probability of a successful submission.

Use this priority order:

1. Reliable Expense Approval end-to-end flow
2. Live GPT-5.6 mutation generation
3. Code Interpreter execution
4. Hidden-state and solution-leak prevention
5. Deterministic patch verification
6. Structured final assessment
7. Fixture fallback reliability
8. Inventory and Notification labs
9. Automated test depth
10. Security and accessibility hardening
11. Submission documentation and demo reliability
12. Nonessential polish

State the selected milestone, its acceptance criteria, affected surfaces, and verification plan in the working plan. Do not create speculative abstractions without an immediate MVP use.

### Phase 3: Implement

1. Make the smallest cohesive change that satisfies the milestone.
2. Preserve working behavior and fallback paths.
3. Keep secrets and hidden answers server-side.
4. Add error, timeout, loading, empty, expired-container, and missing-key states as part of the feature rather than postponing them.
5. Add or update tests with the implementation.
6. Follow current project conventions and relevant framework documentation.

### Phase 4: Validate

Run the narrowest relevant checks first, followed by broader checks once the change is stable.

Required validation layers:

1. Static analysis and TypeScript correctness
2. Linting
3. Unit tests
4. Schema and contract tests
5. Integration tests with OpenAI calls mocked
6. Fixture original-pass, mutated-fail, and repaired-pass tests
7. Critical end-to-end workflow
8. Production build
9. Production-server smoke test
10. Manual UX validation at the intended recording resolution

Do not treat generated prose, model confidence, or a successful HTTP response as proof that the feature works.

### Phase 5: Review

Review the milestone from each perspective:

- Functional correctness
- PRD and acceptance-criteria compliance
- Error handling and recoverability
- Security and privacy
- Hidden-state and solution leakage
- API and schema correctness
- Test adequacy
- Accessibility
- User comprehension
- Performance and cost exposure
- Demo reliability
- Build Week submission compliance

Classify findings as blocker, high, medium, low, or informational. Repair blockers and high-severity findings before moving to a new milestone.

### Phase 6: Adversarial Validation

Attempt to break the feature using relevant cases, including:

- Missing or invalid API key
- Malformed GPT-5.6 output
- Schema-valid but semantically invalid mutation
- Original fixture that unexpectedly fails
- Mutation that does not fail
- Mutation that creates multiple root causes
- Changes outside allowlisted files
- Learner attempts to submit arbitrary files or commands
- Code Interpreter timeout
- Expired or incorrect container identifier
- Oversized inputs or outputs
- Prompt injection embedded in project files or learner text
- Attempts to reveal hidden root causes or reference solutions
- Correct-looking explanation with failing tests
- Passing tests produced through an overbroad or destructive patch
- Refresh, back navigation, duplicate submission, and retry behavior
- Narrow viewport, keyboard-only navigation, and reduced-motion preferences

Add regression tests for every material failure discovered.

### Phase 7: Self-Heal

When validation or review fails:

1. Reproduce the exact failure.
2. Identify the root cause rather than patching the symptom.
3. Determine whether the failure is implementation, architecture, prompt, schema, fixture, environment, or test related.
4. Make the smallest safe repair.
5. Add or strengthen a regression test.
6. Rerun the failed layer.
7. Rerun all downstream quality gates affected by the change.
8. Record the failure, repair, and evidence in `docs/BUILD_LOG.md`.

Do not repeatedly apply the same unsuccessful approach. After three failed attempts on the same issue, pause implementation of that approach, write a concise root-cause analysis, compare at least two materially different solutions, select the safest feasible alternative, and continue. If live API behavior remains blocked, preserve the working fixture path and continue every other completion task.

### Phase 8: Quality Gate

A milestone passes only when:

- Acceptance criteria have objective evidence.
- Relevant tests pass.
- No unresolved blocker or high-severity finding remains.
- Security boundaries remain intact.
- User-visible states are coherent.
- Build log and documentation reflect the change.
- The working tree contains no accidental secrets, debug artifacts, or unrelated changes.

After a milestone passes, create an incremental git commit with a descriptive message.

### Phase 9: Loop Engineering and Direction Review

After every stable milestone, decide the next direction using current evidence rather than the original plan alone.

Update or maintain `docs/ROADMAP.md` with:

- Completed milestone and evidence
- Remaining PRD gaps
- Current highest technical risk
- Current highest demo risk
- Current highest security risk
- Current highest judging-criteria opportunity
- API-credit and time constraints
- Recommended next milestone
- Explicitly deferred scope

Evaluate future direction against the four equally weighted judging criteria:

1. Technological implementation
2. Design
3. Potential impact
4. Quality of the idea

Prefer completing and proving the primary demo over expanding feature breadth. Do not change the Education track, product concept, primary audience, or core learning mechanism without user approval.

Then begin the next Observe phase automatically.

## Security Gate

The following conditions are mandatory:

- No learner Python executes on the Next.js host.
- No arbitrary shell command is accepted from the client.
- `OPENAI_API_KEY` is never exposed to the client.
- `.env.local` is ignored and never committed.
- Hidden root causes and reference solutions never appear in client props, client imports, browser storage, visible API responses, or production bundles before final submission.
- Editable files are allowlisted and validated server-side.
- Inputs have file-count, file-size, text-length, request-rate, execution-time, and output-size limits.
- Test output is sanitized before rendering.
- Executed tests are authoritative and cannot be overridden by GPT assessment.
- Container identifiers and challenge identifiers are validated and cannot access another challenge's state.
- Prompt-injection content in project files is treated as untrusted data, not instructions.
- Errors do not reveal secrets, internal prompts, hidden solutions, stack traces, or provider internals.
- Dependencies and licenses are reviewed before submission.
- The repository is scanned for committed secrets and sensitive files.

Create or update `docs/THREAT_MODEL.md` covering assets, trust boundaries, entry points, abuse cases, mitigations, residual risks, and verification steps.

## Quality-Assurance Gate

The final system must include evidence for:

- Schema validation
- Hidden-field stripping
- Allowlist enforcement
- Original-pass validation
- Mutated-fail validation
- Failure-signature matching
- Repaired-pass validation
- Incorrect-patch rejection
- Assessment score bounds
- Failing tests never receiving verified status
- Missing-key fallback
- Malformed-model-output recovery
- Code Interpreter timeout and expiration recovery
- Refresh and reset behavior
- Keyboard accessibility
- Responsive recording layout
- Production build and server startup

External OpenAI calls must be mocked in the normal automated test suite. Live API verification is a separate, explicitly controlled smoke test.

## Persistence and Progress

Maintain these artifacts as the work proceeds:

- `docs/BUILD_LOG.md`
- `docs/ROADMAP.md`
- `docs/THREAT_MODEL.md`
- `docs/TESTING.md`
- `docs/DEMO_SCRIPT.md`
- `docs/SUBMISSION.md`
- `.env.example`
- `LICENSE`

At each checkpoint, preserve:

- What changed
- Why it changed
- Tests executed
- Review findings
- Security findings
- Repairs made
- Remaining risks
- Next direction

## Blocker Policy

Continue autonomously through safe, in-scope work. Do not stop merely because one optional path is blocked.

If `OPENAI_API_KEY` is missing:

- Complete schemas, routes, mocks, fixtures, UI, error handling, tests, documentation, and fallback behavior.
- Mark only the live API smoke test as blocked.
- Continue all other work.

Pause and request user input only when:

- A required credential cannot be replaced by a safe fallback.
- An irreversible external action or deployment needs authorization.
- A product decision would materially change the locked PRD.
- Competition eligibility or ownership is genuinely ambiguous.
- A destructive action or new authority is required.

Goal mode does not expand permissions. Never bypass sandbox, approval, ownership, privacy, or competition constraints in order to keep the loop running.

## Definition of Finished

The goal is complete only when all of the following are true:

1. Expense Approval works from selection through final report.
2. GPT-5.6 produces a strict, schema-valid mutation contract.
3. Original-pass, mutated-fail, and repaired-pass evidence is captured.
4. Python executes only in Code Interpreter.
5. Hidden answers are absent from client payloads, storage, imports, and bundles.
6. Correct patches pass and incorrect patches cannot be verified.
7. GPT assessment cannot override deterministic test evidence.
8. Missing-key and live-service failures recover to a real fixture challenge.
9. Inventory and Notification each have functioning prevalidated challenges.
10. Security review and threat model have no unresolved blocker or high finding.
11. Quality-assurance matrix is complete.
12. Lint, type checks, automated tests, production build, and server smoke test pass.
13. The primary workflow has been manually tested at recording resolution.
14. Accessibility checks for keyboard use, labels, focus, contrast, and reduced motion pass.
15. README, testing guide, build log, roadmap, threat model, demo script, and Devpost submission text are complete.
16. The repository contains no secrets, accidental artifacts, misleading claims, or fake features.
17. The project is deployment-ready.
18. Every feature intended for the video works consistently.
19. The majority of core functionality is documented as built in the primary Codex thread.
20. The final report lists objective evidence for every completed criterion and clearly identifies anything requiring the user's credential or deployment approval.

Do not clear the persistent goal merely because implementation appears complete. Run the final full validation, security review, quality review, documentation review, and submission-readiness review first. Clear the goal only after the Definition of Finished has been evidenced or the user explicitly ends it.
