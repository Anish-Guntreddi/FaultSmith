# FaultSmith Product Requirements Document

> **Approved July 18, 2026 scope amendment:** The submission build adds a guided learning roadmap over the existing nine validated fixtures while preserving the direct skill catalog. Guided lessons default to the zero-token prevalidated path, store bounded anonymous progress, and provide deterministic next-step recommendations. Open-ended custom prompting remains deferred. See `docs/GUIDED_LEARNING_MVP.md` for the locked requirements and acceptance criteria.
>
> **Approved July 19, 2026 scope amendment:** The submission candidate may add a configuration-gated personalized progress dashboard plus optional Firebase Authentication and Cloud Firestore synchronization while preserving unauthenticated guest use and browser-local fallback. `docs/PERSONALIZED_LEARNING_PRD.md` overrides the authentication, persistence, analytics, delivery, and locked-decision sections below where they conflict. Cloud synchronization is not allowed to block the validated local experience or the submission freeze.

**Document status:** Locked for OpenAI Build Week MVP  
**Version:** 1.0  
**Date:** July 17, 2026  
**Track:** Education  
**Submission deadline:** July 21, 2026 at 5:00 p.m. PT  
**Working tagline:** AI that breaks your code on purpose so you learn how to fix it.

## 1. Executive Summary

FaultSmith is an AI-powered debugging education platform that converts a working Python project into a controlled debugging exercise. A learner chooses a project, target skill, and difficulty. GPT-5.6 analyzes the code, designs a minimal bug mutation, validates that the original project passes and the mutated project fails, and presents the learner with an interactive debugging lab. The learner investigates the failure, records hypotheses, requests progressive hints, submits a patch, and explains the root cause. FaultSmith then verifies the patch and produces an evidence-based skill report.

FaultSmith is intentionally different from an AI code repair assistant. The product does not solve the challenge for the learner. It creates safe, reproducible failures that require the learner to practice debugging, causal reasoning, test interpretation, and code comprehension.

The Build Week MVP will support curated Python and pytest projects. The architecture should preserve a future path to user-provided repositories, additional languages, instructor-created curricula, and organization-level skill analytics without adding those features to the competition scope.

## 2. Problem Statement

AI coding tools make it increasingly easy to generate working code without developing the ability to understand, diagnose, and maintain it. Existing coding education products usually teach through blank-slate exercises, static bugs, quizzes, or AI-generated explanations. These approaches have three limitations:

1. Static exercises do not adapt to a learner's target skill or current difficulty.
2. AI assistants often reveal or implement the solution before the learner has reasoned through the failure.
3. Passing a final test does not show whether the learner understood the root cause or used a sound debugging process.

FaultSmith addresses these limitations by generating validated failures, withholding the solution, adapting hints to the learner's investigation, and assessing both the final patch and the reasoning that produced it.

## 3. Product Vision

FaultSmith will become a personalized debugging gym where learners build engineering judgment by repairing realistic failures inside complete, working projects.

The long-term product can serve:

- Students practicing debugging and software engineering.
- Professors generating controlled labs from course repositories.
- Bootcamps assessing applied code comprehension.
- Engineering teams onboarding developers to unfamiliar systems.
- Organizations measuring practical debugging competencies.

## 4. Product Principles

1. **Learning before automation:** FaultSmith coaches the learner but does not automatically repair the active challenge.
2. **Every failure must be proven:** A challenge is not released unless the unmodified project passes and the mutated project fails reproducibly.
3. **Minimal mutations:** Each challenge should target one primary learning objective and change the smallest reasonable amount of code.
4. **Evidence over impression:** Assessment combines executed tests, the submitted patch, and the learner's written causal explanation.
5. **Progressive disclosure:** Hints begin with investigation strategy and reveal implementation detail only at the final level.
6. **Reliable demo over broad claims:** The MVP supports a narrow, polished Python workflow rather than unsafe or unreliable arbitrary-code execution.

## 5. Goals and Success Criteria

### 5.1 MVP Goals

- Generate a valid debugging challenge from a curated Python/pytest project.
- Allow a learner to investigate and edit the mutated code in a coherent browser experience.
- Run tests in an isolated OpenAI Code Interpreter container.
- Provide three progressive hints without exposing the final patch prematurely.
- Verify the learner's patch by executing the project tests.
- Assess the learner's root-cause explanation against a structured rubric.
- Produce a visually compelling skill-evidence report.
- Deliver a complete end-to-end demo in less than three minutes.
- Clearly demonstrate substantive use of GPT-5.6 and Codex.

### 5.2 MVP Success Metrics

- 100% of included challenge fixtures pass before mutation.
- 100% of released mutations produce the expected failing-test signature.
- 100% of reference solutions return the project to a passing state.
- Median challenge generation time is no more than 60 seconds during the demo path.
- Test execution completes within 20 seconds for included projects.
- At least five external testers complete one challenge before submission.
- At least four of five testers understand the product's purpose without additional explanation.
- The complete primary demo can be shown in 2 minutes and 45 seconds or less.

### 5.3 Non-Goals for Build Week

- Supporting arbitrary public GitHub repositories.
- Supporting languages other than Python.
- Building GitHub OAuth or a GitHub App.
- Providing real-time multiplayer classrooms.
- Building certification or course-standard mappings.
- Automatically fixing the challenge for the learner.
- Providing a production billing system.
- Building a full learning management system.
- Making employment, academic-integrity, or certification decisions automatically.

## 6. Target Users

### 6.1 Primary Persona: Computer Science Learner

The learner understands Python syntax and can write basic programs but struggles to debug unfamiliar code, interpret tests, isolate root causes, and explain why a fix works.

**Primary need:** Practice realistic debugging without receiving the solution immediately.

### 6.2 Secondary Persona: Instructor

The instructor wants practical debugging exercises that are consistent, validated, and connected to observable skills.

**Primary need:** Generate and evaluate applied exercises without manually creating and maintaining many broken repository variants.

### 6.3 Future Persona: Engineering Manager

The manager wants evidence that a developer can understand and repair code inside an unfamiliar system.

This persona is out of scope for the Build Week interface but informs the skill-report design.

## 7. Core User Journey

1. The learner opens FaultSmith without creating an account.
2. The learner selects one of three curated projects.
3. The learner selects a target skill and difficulty.
4. FaultSmith asks GPT-5.6 to create a structured mutation contract.
5. FaultSmith validates the original and mutated projects in an isolated container.
6. If validation succeeds, the learner enters the debugging workspace.
7. The learner reviews the symptom and failing test output.
8. The learner records an initial hypothesis.
9. The learner inspects and edits the allowed source files.
10. The learner may request up to three progressive hints.
11. The learner submits a patch and root-cause explanation.
12. FaultSmith executes the test suite against the submitted patch.
13. GPT-5.6 assesses the explanation using the challenge rubric and test evidence.
14. FaultSmith displays the final skill report.
15. The learner may restart the lab or return to project selection.

## 8. MVP Content

The MVP must include three curated projects with deterministic tests:

### 8.1 Expense Approval API

**Skills:** Boundary conditions, authorization logic, business-rule interpretation.  
**Primary demo mutation:** Finance approval is required only when `amount > 500` instead of `amount >= 500`.

### 8.2 Inventory Reservation Service

**Skills:** State transitions, idempotency, defensive validation.  
**Example mutation:** A repeated reservation request decrements inventory twice.

### 8.3 Notification Preference Engine

**Skills:** Boolean logic, fallback behavior, data validation.  
**Example mutation:** A user's explicit opt-out is overwritten by the system default.

Each project must contain:

- A short learner-facing description.
- A small, understandable source tree.
- A complete pytest suite.
- At least three approved target mutations.
- Reference solutions for every approved mutation.
- Stable expected failure signatures.
- A list of allowed editable files.

## 9. Functional Requirements

### FR-001: Project Selection

The learner must be able to view and select one of the curated projects. Each project card must show its domain, approximate difficulty, supported skills, and estimated completion time.

**Acceptance criteria:**

- Three project cards render without an API request.
- Selecting a project persists through the challenge-generation flow.
- The learner can return and choose another project before generation begins.

### FR-002: Skill and Difficulty Selection

The learner must select one target skill and one difficulty level before generating a challenge.

Supported MVP difficulty levels:

- Beginner
- Intermediate
- Advanced

**Acceptance criteria:**

- The Generate Challenge action remains disabled until both values are selected.
- The selected skill and difficulty are included in the generation request.
- Unsupported project-skill combinations are not displayed.

### FR-003: Structured Mutation Planning

GPT-5.6 must generate a mutation contract that conforms to the schema in Section 12.

**Acceptance criteria:**

- Invalid or incomplete model output is rejected.
- No mutation is applied outside the contract's allowlisted files.
- The mutation contains one primary root cause.
- Hidden solution fields are never returned to the learner-facing client before submission.

### FR-004: Challenge Validation Gate

FaultSmith must validate each generated challenge before presenting it.

Validation sequence:

1. Run the original project tests.
2. Confirm all original tests pass.
3. Apply the proposed mutation.
4. Run the same tests again.
5. Confirm at least one expected test fails.
6. Confirm the failure matches the expected signature.
7. Store the validated challenge snapshot.

**Acceptance criteria:**

- A challenge is never released if the original tests fail.
- A challenge is never released if the mutation does not fail.
- Validation attempts are capped at two regeneration attempts.
- After two failures, the user receives a clear retry message and can select a fixture-backed challenge.

### FR-005: Debugging Workspace

The learner must receive a cohesive workspace containing:

- Challenge brief.
- Learning objective.
- File navigator.
- Code editor.
- Test-output panel.
- Hypothesis journal.
- Hint controls.
- Submit Patch action.

**Acceptance criteria:**

- Only allowlisted files are editable.
- The learner can reset edited files to the initial challenge state.
- The current edits survive accidental page refresh using local session persistence.
- Hidden solution content is not present in the browser payload.

### FR-006: Test Execution

The learner must be able to execute the test suite against the current code state.

**Acceptance criteria:**

- Code executes only inside the configured Code Interpreter container.
- The interface shows pass/fail status and sanitized pytest output.
- Test execution has a visible loading, success, failure, and timeout state.
- A client cannot provide an arbitrary shell command.

### FR-007: Hypothesis Journal

The learner must enter an initial diagnosis before unlocking the first hint or final submission.

**Acceptance criteria:**

- Empty or trivial whitespace-only hypotheses are rejected.
- Hypothesis revisions are stored as part of the attempt.
- The final assessment can compare the initial hypothesis with the submitted explanation.

### FR-008: Progressive Hints

Each challenge must provide three progressively more specific hints:

1. Investigation direction.
2. Relevant concept or file area.
3. Near-solution guidance without providing the completed patch.

**Acceptance criteria:**

- Hints unlock sequentially.
- The learner must explicitly request each hint.
- The report records the number of hints used.
- No hint includes the exact reference solution.

### FR-009: Patch Submission

The learner must submit the edited source and a root-cause explanation.

**Acceptance criteria:**

- Submission is blocked until an explanation is provided.
- The submitted patch is checked against the allowlisted file set.
- Tests execute against exactly the submitted code snapshot.
- The submission result cannot be overridden by the model's narrative judgment.

### FR-010: Assessment

FaultSmith must assess the learner using deterministic and model-based evidence.

Deterministic evidence:

- Test result.
- Files changed.
- Patch size.
- Time spent.
- Number of test runs.
- Number of hints used.

GPT-5.6 assessment dimensions:

- Root-cause accuracy.
- Explanation quality.
- Understanding of the relevant concept.
- Scope discipline of the patch.
- Quality of the debugging process.

**Acceptance criteria:**

- A failing test result can never receive a successful completion status.
- The model assessment must conform to a strict schema.
- The report distinguishes test evidence from model-evaluated reasoning.
- The learner receives actionable feedback instead of only a numeric score.

### FR-011: Skill-Evidence Report

The completed report must show:

- Challenge and target skill.
- Final pass/fail status.
- Root-cause assessment.
- Reasoning score.
- Patch-discipline score.
- Hints used.
- Key strength.
- Primary improvement area.
- Evidence from the executed test result.

**Acceptance criteria:**

- The report is visually understandable within five seconds.
- The learner can restart or choose another challenge.
- The report does not claim formal certification or employment readiness.

### FR-012: Demo Reliability Mode

The application must contain a reliable path using prevalidated mutation fixtures.

**Acceptance criteria:**

- If live mutation generation is unavailable, the selected demo project can load a prevalidated challenge.
- The fallback is a real, functioning challenge rather than mocked output.
- The UI labels generated and prevalidated challenges accurately.

## 10. User Experience Requirements

### 10.1 Visual Direction

FaultSmith should feel like a modern engineering laboratory rather than a generic course dashboard.

Visual motifs:

- Dark neutral workspace with high-contrast code surfaces.
- Amber for active investigation.
- Red for observed failures, not user punishment.
- Green for verified evidence.
- Clear distinction between symptoms, hypotheses, evidence, and conclusions.

### 10.2 Required Screens

1. Product landing and project selection.
2. Skill and difficulty configuration.
3. Challenge generation and validation progress.
4. Debugging workspace.
5. Final skill-evidence report.

### 10.3 Accessibility

- All primary actions must be keyboard reachable.
- Color cannot be the only indicator of pass/fail status.
- Loading states must have visible text.
- Code and terminal text must meet readable contrast standards.
- Motion should be minimal and nonessential.

## 11. Technical Architecture

### 11.1 Application Stack

- Next.js with TypeScript.
- Tailwind CSS.
- Zod for request and response validation.
- OpenAI JavaScript SDK.
- OpenAI Responses API using `gpt-5.6`.
- OpenAI Code Interpreter for isolated Python execution.
- Browser local storage for anonymous attempt persistence.
- Vercel-compatible deployment.

### 11.2 High-Level Components

1. **Web Client:** Project selection, configuration, code editing, test output, hints, and report.
2. **Generation Route:** Creates the mutation contract using GPT-5.6 Structured Outputs.
3. **Validation Route:** Sends project files and validation instructions to Code Interpreter.
4. **Execution Route:** Executes the learner's current project snapshot in an isolated container.
5. **Assessment Route:** Combines deterministic evidence with GPT-5.6 rubric assessment.
6. **Fixture Registry:** Stores curated projects, approved mutations, failure signatures, and reference solutions.

### 11.3 State Strategy

The MVP does not require account authentication or a persistent database. Anonymous attempt state is stored in the browser and recreated from server-safe challenge identifiers. Hidden root-cause and reference-solution fields remain server-side.

If server persistence becomes necessary, add a small managed Postgres store only after the complete in-browser workflow is functional.

## 12. Core Data Contracts

### 12.1 Mutation Contract

```ts
type MutationContract = {
  challengeId: string;
  projectId: string;
  title: string;
  targetSkill: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  learningObjective: string;
  learnerBrief: string;
  allowedFiles: string[];
  mutationPatch: string;
  expectedFailureTests: string[];
  expectedFailureSignature: string;
  hiddenRootCause: string;
  hiddenReferenceSolution: string;
  hints: [string, string, string];
  rubric: {
    rootCauseCriteria: string[];
    conceptCriteria: string[];
    patchDisciplineCriteria: string[];
  };
};
```

### 12.2 Test Result

```ts
type TestResult = {
  status: "passed" | "failed" | "timeout" | "error";
  passedCount: number;
  failedCount: number;
  durationMs: number;
  sanitizedOutput: string;
  matchedExpectedFailure: boolean;
};
```

### 12.3 Assessment Result

```ts
type AssessmentResult = {
  completionStatus: "verified" | "not_verified";
  rootCauseScore: number;
  reasoningScore: number;
  patchDisciplineScore: number;
  conceptUnderstandingScore: number;
  strengths: string[];
  improvementAreas: string[];
  evidenceSummary: string;
  nextPracticeRecommendation: string;
};
```

All scores use a 0-100 range. Structured output schemas must constrain scores to that range.

## 13. AI System Requirements

### 13.1 Model Responsibilities

GPT-5.6 may:

- Analyze project structure and learning objectives.
- Select or design an appropriate minimal mutation.
- Generate schema-conforming challenge metadata.
- Produce progressive hints.
- Evaluate the learner's written reasoning.
- Recommend the next practice area.

GPT-5.6 may not:

- Override executed test results.
- Return hidden solution fields before submission.
- Apply changes outside allowlisted files.
- Execute learner code on the application host.
- Claim that the learner has earned a formal credential.

### 13.2 Validation and Self-Correction

- The mutation planner receives the project contents, skill target, constraints, and schema.
- The validator runs the original and mutated project states.
- If the failure is invalid or ambiguous, the model receives structured validation feedback and may retry once.
- After two failed generation attempts, FaultSmith loads a prevalidated fixture.
- All visible success claims must be grounded in test results.

### 13.3 Prompt Separation

Use separate prompts and schemas for:

1. Mutation planning.
2. Validation interpretation.
3. Hint delivery.
4. Final assessment.

Do not create one monolithic prompt containing the entire product workflow.

## 14. Security and Privacy

- Never expose `OPENAI_API_KEY` to the browser.
- Never execute submitted Python directly on the Next.js host.
- Use Code Interpreter containers for all Python execution.
- Do not allow learners to supply shell commands.
- Limit project files, file sizes, code length, test duration, and response size.
- Sanitize test output before rendering.
- Do not collect names, emails, school records, or protected educational data in the MVP.
- Do not place real student data in prompts or logs.
- Treat container state as ephemeral.
- Keep hidden challenge solutions in server-only code paths.

## 15. Analytics and Observability

Minimum internal events:

- Project selected.
- Challenge generation started.
- Generation succeeded or failed.
- Validation succeeded or failed.
- Test run completed.
- Hint requested.
- Patch submitted.
- Challenge verified or not verified.
- Challenge reset.

The MVP may log aggregated anonymous events. It must not require analytics infrastructure for the primary workflow to function.

## 16. Testing Strategy

### 16.1 Unit Tests

- Zod schema validation.
- Fixture registry loading.
- Hidden-field stripping.
- Patch allowlist enforcement.
- Score bounds.
- Failure-signature matching.

### 16.2 Integration Tests

- Original fixture passes.
- Mutation fixture fails as expected.
- Reference solution passes.
- Invalid mutation triggers fallback.
- Assessment cannot mark a failing submission verified.
- API errors return safe user-facing messages.

### 16.3 End-to-End Tests

- Select project and skill.
- Generate or load challenge.
- Enter workspace.
- Run failing tests.
- Record hypothesis.
- Request hint.
- Submit correct patch.
- View verified report.

### 16.4 Manual Demo Checklist

- Test in a clean browser session.
- Test without cached application state.
- Test at laptop resolution used for recording.
- Test API timeout behavior.
- Test the fixture fallback path.
- Confirm the full demo completes in less than three minutes.

## 17. Build Week Submission Requirements

The repository must include:

- Setup instructions.
- Environment-variable documentation.
- Supported browser and runtime information.
- Sample project documentation.
- Testing instructions.
- Public demo URL or judge credentials.
- Relevant open-source license if public.
- Description of how Codex was used.
- Description of how GPT-5.6 is used at runtime.
- Clear disclosure of any third-party dependencies or assistance.
- The Codex `/feedback` Session ID from the thread where the majority of core functionality was built.

The video must:

- Be public on YouTube.
- Be less than three minutes.
- Include audio.
- Show a functioning product.
- Explain both Codex and GPT-5.6 usage.
- Avoid unlicensed music and unauthorized third-party trademarks.

## 18. Codex and Secondary AI Assistance Policy

### 18.1 Primary Build Tool

Codex is the primary implementation environment. The majority of core functionality, including the main application architecture, core routes, interactive workspace, validation flow, testing, and integration work, must be implemented and recorded in the primary Codex project thread.

### 18.2 Permitted Claude Code Role

Claude Code may be used as a secondary reviewer for:

- Architecture critique.
- Security review.
- Edge-case discovery.
- Test-gap analysis.
- Code-quality review.
- Accessibility review.
- Performance observations.

Claude Code should not be used to author the majority of core features or replace the primary Codex build record.

### 18.3 Review Workflow

1. Codex implements a scoped feature.
2. Tests and acceptance criteria are recorded.
3. Claude Code may review the completed diff without becoming the primary author.
4. Review findings are returned to the Codex thread.
5. Codex evaluates and implements accepted changes.
6. The repository records the resulting changes and tests.

### 18.4 Provenance Record

Maintain `docs/BUILD_LOG.md` with:

- Date and feature.
- Codex session or task reference.
- Human product or engineering decision.
- Tests executed.
- Whether secondary review occurred.
- Accepted or rejected reviewer findings.

## 19. Delivery Plan

### July 17: Foundation

- Lock PRD.
- Initialize repository.
- Scaffold Next.js application.
- Create fixture registry and Expense Approval project.
- Implement project selection and configuration UI.
- Establish primary schemas.

### July 18: Core AI Loop

- Implement mutation-generation route.
- Integrate Structured Outputs.
- Integrate Code Interpreter validation.
- Complete original-pass and mutated-fail gate.
- Complete one end-to-end Expense Approval challenge.

### July 19: Learning Experience

- Build debugging workspace.
- Implement test execution.
- Add hypothesis journal and progressive hints.
- Implement patch submission and assessment.
- Build the final skill report.

### July 20: Reliability and Polish

- Add remaining curated projects.
- Add prevalidated fallback fixtures.
- Run unit, integration, and end-to-end tests.
- Conduct secondary architecture/security review.
- Test with at least five learners or developers.
- Finish README and submission documentation.

### July 21: Submission

- Freeze features early.
- Verify clean deployment.
- Record a 2:35-2:45 demo.
- Complete submission text.
- Generate and preserve the primary Codex `/feedback` Session ID.
- Submit several hours before the deadline.

## 20. Three-Minute Demo Storyboard

### 0:00-0:18 — Problem

AI can write code instantly, but learners still need to understand, diagnose, and maintain it.

### 0:18-0:35 — Configure

Select the Expense Approval API, Boundary Conditions, and Intermediate difficulty.

### 0:35-1:05 — Generate and Validate

Show GPT-5.6 designing a controlled mutation and FaultSmith proving that the original passes while the mutated project fails.

### 1:05-1:45 — Investigate

Open the debugging workspace, run the tests, record a hypothesis, and request one non-spoiling hint.

### 1:45-2:10 — Repair

Change `amount > 500` to `amount >= 500`, explain the root cause, and rerun tests.

### 2:10-2:30 — Evidence

Show the verified skill report with test evidence, reasoning score, hint usage, and improvement recommendation.

### 2:30-2:50 — Technology

Explain that Codex built the application and test system, while GPT-5.6 creates structured challenges, validates them with Code Interpreter, delivers hints, and assesses reasoning.

### 2:50-2:58 — Closing

FaultSmith turns AI from an answer machine into a deliberate-practice engine.

## 21. Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Generated mutation is invalid | Broken demo | Require original-pass/mutated-fail validation and fixture fallback. |
| Model reveals the answer | Reduced learning value | Separate hidden server fields and use progressive hint schemas. |
| Test execution is slow | Poor product experience | Use small curated projects and strict execution limits. |
| Code execution becomes unsafe | Security issue | Use Code Interpreter containers and prohibit arbitrary shell commands. |
| Too much scope for four days | Incomplete submission | Lock Python-only, anonymous, curated-project MVP. |
| Model assessment conflicts with tests | Loss of trust | Executed tests are authoritative and cannot be overridden. |
| Claude Code becomes the primary builder | Submission/provenance risk | Restrict it to secondary review and implement accepted changes through Codex. |
| Live API failure during judging | Unusable project | Include prevalidated real challenge fixtures and clear recovery states. |

## 22. Locked Product Decisions

- Product: FaultSmith.
- Track: Education.
- Primary audience: Python learners practicing debugging.
- MVP content: Three curated Python/pytest projects.
- Primary runtime model: GPT-5.6.
- AI API: OpenAI Responses API.
- Code execution: OpenAI Code Interpreter.
- Frontend and server: Next.js with TypeScript.
- Persistence: Anonymous browser-local attempt state for MVP.
- Primary build environment: Codex.
- Claude Code role: Secondary codebase review only.
- Primary demo: Expense Approval boundary-condition mutation.
- Submission positioning: AI-generated, validated deliberate debugging practice.

## 23. Definition of Done

FaultSmith is ready for submission when:

1. A judge can open the deployed application without an account.
2. The Expense Approval challenge works from selection through final report.
3. The original project passes before mutation.
4. The mutation produces the intended failing test.
5. The learner can edit code and run tests.
6. The learner can record a hypothesis and request hints.
7. A correct patch returns the suite to passing.
8. A failing patch cannot receive verified status.
9. The final report separates deterministic evidence from AI assessment.
10. A real fallback challenge works if live generation fails.
11. Automated tests cover the critical application rules.
12. The README and build log document Codex, GPT-5.6, and any secondary review.
13. The public demo and repository remain available through the judging period.
14. The submission video is public, clear, and under three minutes.
15. The recorded `/feedback` Codex Session ID corresponds to the thread where the majority of core functionality was built.
