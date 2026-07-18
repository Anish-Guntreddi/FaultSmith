# Project Research Summary

**Project:** FaultSmith
**Domain:** Evidence-first AI debugging education and submission hardening
**Researched:** July 18, 2026
**Confidence:** HIGH for the repository-local product and architecture; MEDIUM for unobserved live, deployed, and human behavior

## Executive Summary

FaultSmith is already a defensible release candidate: it creates controlled Python failures, requires learners to inspect evidence and state a causal hypothesis, provides bounded coaching without revealing the repair, and accepts completion only when deterministic tests prove the exact submitted snapshot. The guided nine-lesson roadmap grounds beginners in curated, zero-token exercises, while the direct catalog and GPT-5.6 path retain flexibility for advanced practice. Expert implementation here means preserving strict browser/server/provider boundaries and treating AI as a proposal and explanation layer—not as verification authority.

The recommended milestone is proof and release hardening, not feature expansion. Keep the pinned Next.js/TypeScript/OpenAI stack, merge the guided experience, make GSD a thin development control plane, split CI into independently visible gates, and use separate product, QA/accessibility, and security/adversarial reviews against one stable SHA. Every repair should receive a narrow regression, affected-gate reruns, and objective evidence in the canonical documentation.

The main risks are scope expansion, self-certification, confusing prevalidated fixture evidence with fresh execution, live-provider drift, deployment controls that differ from local assumptions, and leaving external submission work too late. Mitigate them by keeping `docs/PRD.md` locked, maintaining deterministic test authority, preserving and visibly labeling the real fixture fallback, gating live and deployment work on authorization, and moving through four ordered phases from release integration to final human evidence.

## Key Findings

### Recommended Stack

Preserve the existing single-package application and lockfile. No database, account system, queue, runtime agent framework, package-manager migration, or alternate test runner is justified before submission. Add orchestration and deployment controls around the proven stack: four unique parallel GitHub Actions jobs, a full Node.js deployment, server-only configuration, and provider/edge rate limiting for public traffic.

**Core technologies:**

- Node.js `>=20.9.0`, Next.js 16.2.10, and React 19.2.4: full-stack application and Route Handler runtime—already validated and compatible with the required server features.
- TypeScript 5 and Zod 4: strict contracts at browser, API, persistence, model, and fixture boundaries—central to rejecting malformed or widened inputs.
- OpenAI JavaScript SDK 6.x: bounded GPT-5.6 Responses API and Code Interpreter adapter—kept optional behind deterministic policy and recovery.
- Vitest 4: fast domain, schema, route, fixture-lifecycle, and adversarial evidence.
- Playwright 1.61 and axe: primary workflow, accessibility, persistence, fallback, responsive, and guided-flow verification.
- npm lockfile and `npm ci`: reproducible local, CI, and deployment installs.

See [STACK.md](./STACK.md) for the detailed CI, deployment, security, and compatibility recommendations.

### Expected Features

**Must have (table stakes):**

- Guided beginner roadmap with nine ordered lessons and sequential unlocks.
- Direct project, skill, difficulty, prevalidated, and live-plus-fallback practice for advanced learners.
- Realistic inspect–hypothesize–repair–explain workspace with refresh-safe bounded local state.
- Reproducible original-pass, mutated-fail, expected-signature, and repaired-pass fixture lifecycles.
- Hypothesis-gated progressive hints that never disclose hidden root causes or reference repairs.
- Exact-snapshot deterministic repair verification and a report separating execution evidence from AI assessment.
- Verified-only progress, reinforcement, and deterministic next-step recommendation.
- Accessible, responsive, anonymous use with a visibly labeled prevalidated fallback.

**Should have (competitive):**

- Fault generation instead of answer generation.
- Deterministic evidence authority over model confidence.
- Mandatory causal hypothesis before assistance or submission.
- Curated zero-token foundations plus adaptive live practice.
- Process evidence—hints, revisions, patch discipline, reasoning, and test runs—instead of completion theater.
- Transparent, functional fallback that preserves the full learning loop during provider failure.

**Defer (v2+):**

- Novel reinforcement variants, evidence-based mastery, confidence calibration, misconception feedback, and spaced mixed practice.
- Constrained custom goals only after a new schema, allowlist, cost, fallback, and adversarial review.
- Instructor-authored labs and optional account sync only as separately governed milestones.
- Open-ended prompting, arbitrary repository ingestion, additional languages, runtime learner swarms, auto-fix, certification claims, and host execution remain out of scope.

See [FEATURES.md](./FEATURES.md) for acceptance evidence, anti-features, dependencies, and submission positioning.

### Architecture Approach

Use GSD only as the development control plane around the existing runtime. One coordinator owns integration, finding adjudication, exclusive repair assignments, evidence, commits, and release decisions; three independent read-only streams review product completeness, QA/accessibility, and security/adversarial behavior against the same SHA. Runtime flow remains strict public schema → request guard → server workflow → approved fixture and deterministic evidence authority → optional GPT-5.6/Code Interpreter adapter → explicit prevalidated fixture fallback. Models may propose, veto, assess, or explain, but cannot release a challenge or promote failing evidence.

**Major components:**

1. Canonical product and completion sources—`docs/PRD.md` and `docs/EXECUTION_GOAL.md` govern scope and finish criteria; GSD records traceability without replacing them.
2. Coordinator/integrator—snapshots the SHA, bounds work, reproduces findings, owns non-overlapping changes, and records objective evidence.
3. Independent product, QA/accessibility, and security reviewers—return reproducible findings without editing or self-certifying repairs.
4. Existing browser/client workbench—holds only bounded public challenge and learner state, never hidden answers or verification authority.
5. Existing server workflow and fixture registry—owns allowlists, public projection, fixed execution policy, deterministic gates, and fallback.
6. Optional OpenAI adapter—performs schema-bound GPT-5.6 and Code Interpreter work without becoming authoritative.
7. Named CI and controlled external checkpoints—separate static, unit, build/security, browser/accessibility, live, deployment, and human evidence.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for ownership, concurrency, evidence packets, CI topology, and self-healing rules.

### Critical Pitfalls

1. **Expanding product breadth instead of proving the core loop**—keep the locked PRD and guided amendment authoritative; reject work that does not unblock a Definition of Finished criterion.
2. **Presenting fixture evidence as fresh live execution**—retain mode in contracts, UI, reports, tests, documentation, and narration; call it “prevalidated fixture evidence.”
3. **Self-certifying security and QA**—use independent read-only review streams, reproduce material findings, add regressions, and require stable-SHA rechecks.
4. **Discovering live provider drift during recording**—run a credential-controlled current-provider smoke before deployment and prove fallback independently.
5. **Assuming production matches local controls**—verify runtime, unauthenticated access, headers, secret scope, function duration, rate limits, health, and fallback on the public URL.
6. **Leaving external submission tasks until the final hours**—prepare tester and recording procedures now and begin them immediately after the deployment candidate is stable.

See [PITFALLS.md](./PITFALLS.md) for warning signs, recovery strategies, and phase mapping.

## Implications for Roadmap

Based on research, use four phases.

### Phase 1: Release Integration and Objective-Gate Hardening

**Rationale:** All later evidence must bind to one stable, reviewable release candidate.
**Delivers:** Guided-branch integration; GSD requirement traceability; independently named static, unit/integration, build/security, and browser/accessibility jobs plus a release aggregator; product, QA, and security audits; accepted blocker/high repairs with regressions; corrected canonical evidence.
**Addresses:** Beginner roadmap, advanced catalog continuity, fixture truthfulness, release evidence gaps, accessibility, security, and documentation drift.
**Avoids:** Scope expansion, fixture/live ambiguity, self-certification, and evidence bound to an unstable SHA.

### Phase 2: Credential-Controlled Live Integration Proof

**Rationale:** Mocks prove local contracts but not current GPT-5.6, Code Interpreter, output parsing, timing, or provider recovery.
**Delivers:** Sanitized live generation and original-pass/mutated-fail/signature/repaired-pass evidence; exact-snapshot learner verification; explicit forced-failure fallback proof; any provider-specific regression repairs.
**Uses:** Existing OpenAI SDK adapter, strict Zod schemas, fixed server-owned command, timeouts, deterministic gates, and fixture fallback.
**Implements:** The controlled live-provider checkpoint without adding paid calls to normal CI.

### Phase 3: Public Deployment and Production Verification

**Rationale:** Deployment is meaningful only after the release SHA and live status are known, and requires explicit approval.
**Delivers:** Exact-SHA Node.js deployment; server-only secret scope; edge/provider abuse controls; unauthenticated root and health access; secure headers; primary Expense Approval flow; labeled fallback; responsive recording layout; production evidence.
**Addresses:** Multi-instance rate-limit risk, runtime/version differences, environment scoping, public accessibility, and demo reliability.

### Phase 4: External Evidence and Final Submission

**Rationale:** Human comprehension, public video, and Codex provenance cannot be inferred from local tests and form the final critical path.
**Delivers:** Five tester records with at least four understanding the purpose; repairs for any reproduced blocker/high finding; under-three-minute public video; primary `/feedback` Session ID; resolved submission placeholders; final link, claim, and completion audit.
**Addresses:** Educational-thesis observation and every remaining external Definition of Finished criterion.

### Phase Ordering Rationale

- Stabilize and audit one SHA before external verification so live, deployed, human, and video evidence remains attributable and reproducible.
- Prove the provider before production recording, while separately re-proving fallback so network/model failure never becomes a demo dependency.
- Deploy only after explicit authorization and deterministic gates, then use the verified public candidate for testers and recording.
- Start tester recruitment and recording preparation in parallel with engineering, but capture final evidence only against the stable production SHA.
- Any blocker/high repair returns to the narrow gate, affected downstream gates, independent recheck, and release aggregator before advancing.

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 2:** Verify current official GPT-5.6 Responses API, structured-output, Code Interpreter, and SDK behavior before changing the adapter.
- **Phase 3:** Confirm the approved provider's Node runtime, function limits, environment scoping, WAF/rate-limit behavior, and any access protection.
- **Phase 4:** Confirm current competition submission fields, privacy/link requirements, `/feedback` flow, and tester evidence format.

Phases with standard patterns (skip research-phase unless implementation uncovers a contradiction):

- **Phase 1:** Existing repository scripts, tests, GitHub Actions primitives, and documented GSD review boundaries are sufficient.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Current versions, lockfile, local quality gates, and official Next.js/GitHub deployment guidance support preserving the stack. |
| Features | HIGH | The repository and tests objectively establish the core product; live, deployed, and human proof is explicitly separated. |
| Architecture | HIGH | Existing strict boundaries and deterministic workflow are documented and tested; GSD adds only a development control plane. |
| Pitfalls | HIGH locally / MEDIUM externally | Repository risks are evidence-backed; provider, hosting, and human behavior remain unobserved until Phases 2–4. |

**Overall confidence:** HIGH for the four-phase roadmap; MEDIUM for completion timing because external checkpoints require credentials, approval, provider availability, testers, and publication.

### Gaps to Address

- **Live provider compatibility:** Run the controlled smoke and record sanitized evidence without weakening or removing fixture fallback.
- **Production behavior:** Verify the exact deployed SHA, headers, rate limiting, unauthenticated access, health, primary flow, and recording viewport.
- **Independent audit results:** Reproduce and adjudicate all findings; no reviewer or coordinator may self-certify its own repair.
- **Educational impact evidence:** Record observable debugging behaviors and purpose comprehension, but do not claim longitudinal efficacy or certification.
- **External submission truth:** Verify current rules and replace URL, video, and Session ID placeholders only after the corresponding artifacts exist.

## Sources

### Primary (HIGH confidence)

- `docs/PRD.md`—locked scope, product requirements, risks, and submission criteria.
- `docs/EXECUTION_GOAL.md`—continuous completion loop, QA/security gates, authority boundaries, and Definition of Finished.
- `.planning/PROJECT.md`—brownfield milestone framing, validated and active requirements, constraints, and decisions.
- `.planning/research/STACK.md`, `FEATURES.md`, `ARCHITECTURE.md`, and `PITFALLS.md`—completed domain research synthesized here.
- Repository source, tests, `package.json`, lockfile, and CI configuration—objective implementation and quality evidence.
- [Next.js deployment guidance](https://nextjs.org/docs/app/getting-started/deploying)—Node.js deployment shape and framework support.
- [GitHub Actions concepts](https://docs.github.com/en/actions/get-started/understand-github-actions)—independent parallel jobs.
- [GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)—required and uniquely named checks.
- [OpenAI Code Interpreter guide](https://platform.openai.com/docs/guides/tools-code-interpreter)—live execution integration boundary.

### Secondary (MEDIUM confidence)

- [Vercel WAF rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting) and [Functions limits](https://vercel.com/docs/functions/limitations)—recommended provider controls pending deployment selection and authorization.
- Five-person tester results, public-host observations, and competition submission UI—required future evidence, not yet available.

### Tertiary (LOW confidence)

- None used. Product-impact claims beyond observed short-session behavior are intentionally deferred.

---
*Research completed: July 18, 2026*
*Ready for roadmap: yes*
