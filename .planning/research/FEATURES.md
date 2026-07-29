# FaultSmith Feature Research

**Milestone:** Build Week submission hardening  
**Date:** July 18, 2026  
**Lens:** Educational product value, evidence-first debugging, and resistance to passive AI dependence

## Executive conclusion

FaultSmith already has the feature set needed to make a defensible hackathon product. Its strongest claim is not that it teaches Python or that it has an AI chat interface. It is that it creates a controlled failure, makes the learner inspect evidence and state a hypothesis before receiving help, withholds the repair, and accepts success only when deterministic tests prove the submitted snapshot. The guided roadmap makes that loop approachable for beginners; the direct catalog and live GPT-5.6 path preserve flexibility for advanced practice.

The submission-critical work is therefore proof, integration, and explanation—not a broader feature surface. V1 should merge and release the guided branch, close the few remaining regression-evidence gaps, verify the real live path, deploy, and collect learner evidence. New prompt surfaces, repository ingestion, runtime agent swarms, accounts, additional languages, or more content would dilute the central story and increase failure modes before judging.

Complexity below means expected remaining engineering effort, not the effort already invested:

- **S:** hours; localized test, copy, or release work.
- **M:** roughly one focused day; touches multiple layers or needs new validation.
- **L:** multiple days; new architecture, threat model, or product contract.
- **XL:** a separate milestone with operational and safety ownership.

## Product thesis and defensible learning loop

The educational problem is not merely that learners use AI. It is that answer-first tools can remove the cognitive steps needed to maintain unfamiliar code: reproducing a failure, parsing test evidence, forming a falsifiable hypothesis, limiting the repair, and explaining causality. FaultSmith counters that failure mode with a deliberate-practice loop:

1. **Observe:** begin with an actual failing signature, not a blank prompt.
2. **Hypothesize:** require a nontrivial causal diagnosis before hints or submission.
3. **Investigate:** reveal bounded, sequential guidance without exposing the patch.
4. **Repair:** edit only an allowlisted source snapshot and run tests.
5. **Explain:** submit a root-cause explanation, not code alone.
6. **Prove:** let deterministic execution evidence control verification.
7. **Reflect and continue:** report process evidence and recommend reinforcement or the next skill.

That sequence is the product. AI contributes mutation planning, interpretation, hints, and reasoning assessment, but does not replace the learner's reasoning or the deterministic authority.

## Table stakes already satisfied

| Capability | Why learners expect it | Current objective evidence | Remaining complexity | Dependencies / caveats |
| --- | --- | --- | --- | --- |
| Clear beginner entry point | Novices need structure rather than prompt-engineering skill | Guided roadmap is the visible default with three phases and nine ordered lessons | None for feature; S to merge/release | Guided implementation is on the release-candidate branch/draft PR, so release integration remains a dependency |
| Coherent curriculum | A roadmap must teach concepts in a deliberate order | Nine unique lesson IDs cover boundary, Boolean, validation, rule, fallback, idempotency, authorization, transition, and data-validation skills | None | Each lesson maps to exactly one server-owned project-skill fixture |
| Realistic debugging workspace | Learners must inspect and modify code in context | Brief, objective, files, editor, test output, journal, hints, explanation, reset, refresh restoration, and report are implemented | None | Anonymous browser-local state is appropriate for the hackathon scope |
| Proven failing exercise | A debugging lab must begin from reproducible evidence | Every fixture has original-pass, mutated-fail, expected-signature-match, and repaired-pass lifecycle tests | None | Live provider lifecycle still needs credential-controlled proof |
| Help without answer leakage | Coaching must preserve productive struggle | Hypothesis-gated, explicit, sequential hints; distinct hint tests; hidden repair and future hints excluded from public payloads/storage/bundles | None | Continue to describe hints as coaching, not solution generation |
| Verified repair | A passing-looking answer is not enough | Exact submitted snapshot is rerun; failing evidence forces `not_verified`; incorrect, broad, comment, syntax, and dead-code decoys are rejected | None | Deterministic authority must remain unchanged in every future mode |
| Meaningful completion report | Learners need feedback beyond a green check | Report separates executed-test evidence from assessment and includes reasoning, patch discipline, hints, revisions, changed files, time, and next practice | None | Report is skill evidence, not certification |
| Progress and continuation | A roadmap needs persistence and next-step guidance | Strict bounded local progress, verified-only completion, sequential unlock, reinforcement rule, and next lesson recommendation | S for a few missing branch tests | Current mastery rule is intentionally simple and deterministic |
| Beginner reliability | First-time use cannot depend on credentials or model availability | Guided launch uses a visibly labeled real prevalidated lab and makes no OpenAI request | None | Preserve fallback as a first-class mode, not a fake/live claim |
| Advanced flexibility | Experienced learners should not be trapped in a linear course | Practice by skill preserves project, skill, difficulty, prevalidated, and live-plus-fallback choices | None | Actual live provider behavior remains unverified without credentials |
| Accessible, resilient UI | Education tooling must work with keyboard and common screen sizes | Keyboard, axe, reduced motion, refresh, 390 × 844 layout, and production-build evidence are documented green | S for public-environment recheck | Recheck after deployment at the recording viewport |

## Differentiators that matter for judging

### 1. Fault generation instead of answer generation

**Priority:** Highest  
**Status:** Implemented; live evidence pending  
**Remaining complexity:** M for credential-controlled smoke and any provider-specific repair  
**Dependencies:** `OPENAI_API_KEY`, GPT-5.6 Responses API behavior, Code Interpreter availability, strict schemas, fixture fallback

Most AI education tools explain or repair code. FaultSmith asks GPT-5.6 to design a minimal controlled defect, then releases it only after original-pass and mutated-fail evidence agrees with the approved contract. This directly supports the anti-dependence thesis: the model creates productive struggle instead of removing it.

**Submission proof:** Show the mutation contract and validation stages briefly, then show that the learner—not the model—performs the repair.

### 2. Evidence authority over model confidence

**Priority:** Highest  
**Status:** Implemented and adversarially tested locally  
**Remaining complexity:** S to preserve in release and mention in demo  
**Dependencies:** Exact submitted snapshot, allowlisted files, deterministic execution gate

A polished model explanation cannot promote failing code. This is both a technical and educational differentiator: it teaches learners that claims must be grounded in reproducible evidence.

**Submission proof:** Include one sentence and one visible report state: tests are authoritative, while GPT evaluates the written reasoning only after the deterministic gate.

### 3. Mandatory hypothesis before assistance

**Priority:** High  
**Status:** Implemented  
**Remaining complexity:** S for external-observation evidence  
**Dependencies:** Journal validation, hint gate, assessment/report fields

The learner must externalize a causal model before requesting a hint or submitting. This is the clearest interaction-level defense against passive answer consumption. Revision count and final explanation make the reasoning process visible without storing it in analytics.

**Submission proof:** In the demo, pause on the failing test, state a hypothesis, then reveal one strategy-level hint. In tester notes, record whether each learner can cite evidence for the hypothesis before editing.

### 4. Curated foundations plus adaptive AI practice

**Priority:** High  
**Status:** Implemented; live half awaits proof  
**Remaining complexity:** S for release integration, M for live smoke  
**Dependencies:** Nine validated fixtures, guided metadata, direct catalog, live generation adapter

Beginners do not need to invent prompts or spend tokens to learn the method. Advanced learners retain direct skill/difficulty selection and live generation. This hybrid is more credible than either a static tutorial catalog or an unbounded chatbot alone.

**Submission proof:** Open on the roadmap, launch the zero-token first lesson, and briefly point to Practice by skill as the advanced/live path. Do not attempt to demo every lesson.

### 5. Process evidence, not completion theater

**Priority:** High  
**Status:** Implemented  
**Remaining complexity:** S for usability validation  
**Dependencies:** Test runs, hints used, hypothesis revisions, patch/file metrics, final evidence report

FaultSmith distinguishes repaired-pass evidence from model-scored reasoning and shows how the learner worked. That is more educationally meaningful than points for arriving at an answer and more honest than a certification claim.

**Submission proof:** Make the final report readable within five seconds and name one strength, one improvement area, and the next lesson.

### 6. Transparent, real fallback

**Priority:** Medium as pedagogy; highest as demo reliability  
**Status:** Implemented and tested  
**Remaining complexity:** S for deployment smoke  
**Dependencies:** Server-owned fixture registry, accurate source labels, failure recovery

The fallback is not a screenshot or mocked response. It is a functioning, validated challenge with the same observe–hypothesize–repair–prove loop. It allows reliable rehearsal and beginner practice while reserving model use for dynamic work.

**Submission proof:** Describe it as a prevalidated lab, never as a live-generated result. Preserve it even after live verification succeeds.

## Acceptance evidence still missing

### Submission blockers and external proof

| Evidence | Objective acceptance condition | Complexity | Dependencies | Recommendation |
| --- | --- | --- | --- | --- |
| Release integration | Guided-learning change is merged, required GitHub checks are green, and the tested commit matches the release/deployment commit | S | PR review/merge authority, branch protection | **V1 required** |
| Real GPT-5.6 mutation proof | A controlled live request returns schema-valid planning/validation results or recovers safely; no hidden field reaches the client | M | Server-only API credential and provider availability | **V1 required**; run separately from normal tests |
| Real Code Interpreter isolation proof | Original, mutated, and repaired snapshots execute in Code Interpreter with captured pass/fail evidence and no host execution | M | Same credential/live smoke; fixed server-owned command | **V1 required** |
| Public no-account workflow | A fresh browser reaches the deployed app, health endpoint, primary lab, fallback, report, and secure headers without credentials | M | Explicit deployment approval and hosting environment | **V1 required** |
| Five-person usability study | At least five external testers complete one challenge; at least four can explain FaultSmith's purpose without added explanation | M coordination, S engineering | External participants and a simple results record | **V1 required** |
| Educational-thesis observation | For each tester, record whether they read the failure, wrote a causal hypothesis before editing, cited evidence in the explanation, and understood that tests—not GPT—verified success | S | Same five-person study | **V1 strongly recommended**; supports the impact claim without claiming long-term efficacy |
| Timed public demo | Public video with audio is under three minutes; target workflow is no more than 2:45 and accurately distinguishes live from prevalidated behavior | M coordination | Stable deployment/recording environment | **V1 required** |
| Primary Codex provenance | `/feedback` Session ID is captured and placed in submission materials | S | Primary task/user action | **V1 required** |

### Low-cost regression evidence gaps

These do not represent missing core functionality, but closing them would make the guided feature's acceptance record more complete.

| Gap | Concrete regression evidence | Complexity | Dependencies | V1 decision |
| --- | --- | --- | --- | --- |
| Roadmap-complete recommendation branch | Unit test completes all nine valid lessons and asserts the `catalog` recommendation | S | Existing pure learning-path helpers | Add before merge if the branch is still open |
| Oversized progress contract | Unit test supplies more than 50 entries and asserts safe empty recovery with no learner text retained | S | Existing Zod parser | Add before merge |
| Passing without submission | Browser test repairs/runs tests but leaves before assessment, then proves no lesson completion was recorded | S | Existing guided E2E fixture | Add if it does not materially slow CI |
| Reinforcement surfaced to learner | Unit coverage already proves the weak-score rule; one UI/browser assertion should prove the report/roadmap displays reinforcement after a verified weak attempt | S–M | Deterministic fixture assessment or controlled route mock | Nice-to-have before merge; do not delay live/deployment proof |
| Public recording layout | Manual check at the exact deployed recording resolution with no overflow, console errors, or blocked request | S | Deployment | Required as part of deployment smoke |

No longitudinal evidence currently proves that FaultSmith reduces AI dependence over time. The submission should frame this as the problem and product mechanism, supported by observed usability behavior, rather than claim a measured learning outcome that the five-person study cannot establish.

## V1 recommendation: submission release

V1 is the existing product plus objective release evidence. Do not add a new learner-facing feature family.

### Must ship

1. Guided roadmap as the default beginner entry and Practice by skill as the advanced entry.
2. All nine validated fixtures and the existing full workspace loop.
3. Hypothesis-gated progressive hints with no reference repair leakage.
4. Deterministic repair authority and evidence/assessment separation.
5. Verified-only progress, sequential unlock, reinforcement, and next-step recommendation.
6. Visibly labeled prevalidated fallback, preserved through live and deployment changes.
7. Credential-controlled live GPT-5.6/Code Interpreter proof.
8. Public no-account deployment, tester results, timed video, and Codex provenance.

### V1 quality gate

- Required CI jobs and complete local quality command green on the release commit.
- All nine fixture lifecycles remain original-pass → mutated-fail/signature-match → repaired-pass.
- Hidden-answer, bundle, storage, allowlist, prompt-injection, and failing-evidence regressions remain green.
- Guided regression gaps above are closed where they do not delay live/deployment work.
- Five tester records and one timed rehearsal are attached to submission documentation.
- Every public statement distinguishes verified fixture evidence, mocked integration evidence, and live provider evidence.

## V2 recommendation: deepen learning, not breadth

These features strengthen the educational outcome after the hackathon. They should be planned only after V1 is deployed and measured.

| V2 feature | Educational value | Complexity | Dependencies / required guardrails |
| --- | --- | --- | --- |
| Novel reinforcement variants | Tests transfer rather than memorization by giving a second validated problem for the same misconception | L | More curated fixtures or live mutation contracts; lifecycle validation; no solution leakage |
| Evidence-based mastery model | Recommends practice from repeated performance instead of one score/hint threshold | M–L | Multiple attempts, versioned bounded progress, transparent deterministic rules, migration tests |
| Confidence calibration | Learner predicts cause/outcome and confidence before editing, then compares it with evidence | M | New bounded journal fields, accessible UI, assessment/report changes, privacy review |
| Misconception-specific feedback | Turns failed attempts into targeted concept practice without supplying a patch | L | Safe taxonomy, grounded evidence extraction, strict output schema, adversarial hint tests |
| Spaced retrieval and mixed practice | Revisits skills after time and interleaves project domains to improve transfer | M–L | Reliable attempt history and deterministic scheduling; avoid engagement-only streak mechanics |
| Constrained custom challenge goals | Lets advanced learners request a skill/domain within server-owned templates | L | New prompt/schema, allowlist, abuse/cost controls, validation retry/fallback, live security review |
| Instructor-authored curated labs | Extends content while keeping deterministic lifecycle proof | XL | Authoring workflow, fixture signing/versioning, sandboxed validation, moderation and content ownership |
| Optional account sync | Supports cross-device continuity after anonymous local learning is proven | XL | Authentication, database, privacy/retention policy, deletion/export, abuse protection |

V2 should continue to make tests and bounded policy authoritative. Models may propose practice or feedback, but must not unlock, verify, or certify outcomes without deterministic evidence.

## Anti-features before submission

| Anti-feature | Why it is harmful now | Complexity / risk | Recommendation |
| --- | --- | --- | --- |
| Open-ended natural-language challenge prompting | Makes prompt skill a prerequisite, widens injection and hidden-answer risk, and weakens demo determinism | L | Out of V1; consider only constrained V2 goals |
| Arbitrary repository upload/ingestion | Introduces untrusted dependencies, secrets, licensing, scale, and execution-policy problems | XL | Out of scope until a separate sandbox/security milestone |
| Learner-facing runtime agent swarm | Adds cost, latency, contradictory guidance, and nondeterministic authority without improving the core practice loop | L–XL | Use agents for development/review only |
| Auto-fix, patch reveal, or “ask AI for answer” | Directly defeats the anti-dependence thesis and productive struggle | M | Do not build |
| Unlimited conversational hints | Can leak the repair and rewards prompt persistence rather than investigation | L | Keep bounded progressive hints; research safe dialogue later |
| More projects/languages before release | Adds shallow breadth and multiplies fixture, test, copy, and demo risk | L per content family | Keep three Python projects/nine validated scenarios for V1 |
| Leaderboards, streaks, and speed-first scoring | Incentivize completion proxies, guessing, and hint avoidance rather than causal understanding | M | Defer; if revisited, reward evidence quality and reflection |
| Formal certification or employability claims | Current evidence supports practice, not high-stakes validity | XL research/legal risk | Explicitly prohibit |
| Accounts, cohorts, instructor dashboard, LMS integration | Does not strengthen the three-minute core story and adds privacy/operations work | XL | Post-submission product milestones only |
| Model-controlled verification or sequencing | Allows persuasive output to override evidence and obscures why a learner progressed | L and high integrity risk | Keep deterministic gates and explainable recommendations |
| Host execution or learner-supplied commands/dependencies | Violates the locked safety boundary | Critical security risk | Never add to the current architecture |

## Feature dependency map

```text
Nine curated projects/skills
  -> deterministic fixture lifecycles
      -> guided lesson mapping
          -> verified-only progress
              -> unlock + reinforcement + next recommendation

Strict live mutation contract
  -> original-pass / mutated-fail / signature validation
      -> Code Interpreter challenge snapshot
          -> exact learner snapshot execution
              -> deterministic completion authority

Failing evidence
  -> hypothesis journal
      -> bounded progressive hints
          -> allowlisted repair + explanation
              -> evidence-separated skill report

Release commit + green gates
  -> live credential smoke
      -> approved deployment
          -> external tester study
              -> recording + final submission
```

The final chain is the critical path. Feature work that does not unblock one of those nodes should not preempt live verification, deployment, testers, or recording.

## Recommended submission positioning

Use one consistent claim:

> FaultSmith turns AI from an answer machine into a deliberate-practice engine: it creates a validated failure, requires the learner to reason from evidence, and lets tests—not model confidence—prove the repair.

Support it with three visible moments:

1. The organized roadmap removes prompt-writing and API cost from beginner practice.
2. The learner writes a hypothesis and receives only progressive guidance.
3. The report separates deterministic execution evidence from GPT-based reasoning feedback.

This is enough to demonstrate a focused, technically substantive solution to AI dependence without overclaiming measured learning outcomes or expanding beyond the locked PRD.
