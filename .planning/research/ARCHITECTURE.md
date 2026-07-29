# Development Orchestration Architecture

**Research date:** July 18, 2026  
**Scope:** Remaining FaultSmith Build Week milestone  
**Authority:** `docs/PRD.md` and `docs/EXECUTION_GOAL.md` remain canonical; this document defines only the development control plane.

## Architectural Decision

Use GSD as a thin development control plane around the existing Next.js application. Run one coordinator/integrator and three independent, read-only review streams: product completeness, QA/accessibility, and security/adversarial. Reviewers return evidence-backed findings; they do not edit code, documentation, CI, or their own verdicts. The coordinator reproduces and adjudicates findings, assigns each repair to one exclusive owner, integrates changes, and owns the final quality decision.

This architecture introduces no learner-facing agent, runtime orchestration service, queue, database, or new execution path. Runtime product authority stays exactly where it is today:

```text
learner request
  -> strict public schema and request guard
  -> server workflow
  -> approved fixture + deterministic evidence authority
  -> optional GPT-5.6 / Code Interpreter adapter
  -> explicit prevalidated fixture fallback on provider failure
```

Models may propose or explain, but only server-owned policy and deterministic test evidence may release a challenge or mark a repair verified. The validated fallback remains a required product capability and release gate.

## Invariants

Every GSD phase and agent work packet must carry these non-negotiable constraints:

1. No learner Python or learner-supplied command executes on the Next.js host.
2. Hidden root causes, reference repairs, rubrics, and future hints stay server-only and absent from public payloads, storage, imports, and bundles.
3. Original-pass, mutated-fail, failure-signature, repaired-pass, and final verified status remain deterministic.
4. GPT assessment can veto or explain but cannot promote failing evidence.
5. `OPENAI_API_KEY` remains server-only and absent from commits, client bundles, prompts, and logs.
6. Missing credentials and provider faults recover to a visibly labeled, real prevalidated fixture.
7. The guided nine-lesson roadmap and direct advanced catalog remain the submission scope; open prompting, repository ingestion, arbitrary execution, and a runtime swarm remain deferred.
8. Framework changes require reading the relevant Next.js 16.2.10 documentation under `node_modules/next/dist/docs/` first.

## Control-Plane Components

### 1. Canonical Product and Completion Sources

- `docs/PRD.md`: locked product decisions and acceptance criteria.
- `docs/EXECUTION_GOAL.md`: completion loop, security gate, QA gate, and Definition of Finished.
- `docs/ROADMAP.md` and `docs/COMPLETION_REPORT.md`: delivery truth and branch-specific completion evidence.
- `.planning/PROJECT.md`: GSD project framing and links to the canonical sources; it must not become a competing PRD.
- `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, and `.planning/STATE.md`: milestone ordering, traceability, and current execution state once generated.

The coordinator resolves conflicts in that order and pauses only for the authority boundaries defined in the execution goal.

### 2. Coordinator / Integrator

The coordinator is the sole development authority for the milestone. It:

- snapshots the branch, commit SHA, working-tree state, open PR/check state, and current objective evidence before each wave;
- chooses the smallest unfinished milestone and maps it to PRD/Definition-of-Finished criteria;
- creates bounded work packets with acceptance criteria, allowed files, forbidden files, required commands, and invariants;
- allocates non-overlapping ownership and prevents parallel writes in the shared workspace;
- reproduces every blocker/high finding before acceptance;
- records accepted and rejected findings with technical rationale;
- performs or exclusively assigns repairs, adds regressions, and reruns affected downstream gates;
- updates canonical evidence documents only after validation;
- owns commits, pushes, PR changes, merge readiness, and the final release verdict.

The coordinator must not claim that an independent gate passed merely because its own implementation tests passed. The relevant reviewer or CI gate must re-evaluate the stable repair.

### 3. Product-Completeness Review Stream

Read-only scope:

- trace the current branch against the locked PRD, guided-learning amendment, complete learning loop, primary demo, and Definition of Finished;
- inspect user-visible truthfulness, fallback labeling, recovery states, beginner guidance, advanced catalog continuity, and submission claims;
- identify missing behavior, misleading claims, branch/document drift, and demo risk.

It returns structured findings only. It does not edit product source, tests, or product documents and does not propose material PRD expansion as a release repair.

### 4. QA / Accessibility Review Stream

Read-only scope:

- map each acceptance criterion to unit, contract, route, fixture, browser, accessibility, build, startup, or manual evidence;
- run non-mutating tests and inspect failure, retry, refresh, reset, duplicate submission, narrow viewport, keyboard, focus, labels, reduced-motion, and recording-layout behavior;
- identify missing regressions, flaky assumptions, false positives, and evidence gaps.

It returns reproducible steps, expected/actual behavior, severity, and the narrowest suggested regression layer. It never edits the tests that will later certify the repair.

### 5. Security / Adversarial Review Stream

Read-only scope:

- inspect browser/server/provider trust boundaries, strict schemas, allowlists, hidden-state projection, secret handling, output sanitation, rate limits, fixed execution commands, and evidence authority;
- attempt bounded input, path, prompt-injection, overbroad-patch, malformed-model, timeout/expiration, storage-tampering, bundle-leakage, dependency, and repository-history attacks;
- distinguish accepted MVP residuals from blocker/high vulnerabilities.

It returns the affected asset and boundary, exploit or failure path, severity, proposed mitigation, and verification method. It cannot approve its own remediation.

## Ownership and Concurrency Rules

The four available slots are used as one coordinator plus three reviewers. This is the smallest useful swarm because the reviews are independent and read-heavy while implementation touches shared central files.

| Role | May read/run non-mutating checks | May edit | May commit/push | May issue final verdict |
|---|---:|---:|---:|---:|
| Coordinator / integrator | Yes | Yes, or delegates one exclusive repair packet | Yes | Yes, after independent evidence |
| Product reviewer | Yes | No | No | Product-gate recommendation only |
| QA/accessibility reviewer | Yes | No | No | QA-gate recommendation only |
| Security/adversarial reviewer | Yes | No | No | Security-gate recommendation only |

After triage, repairs run in serial by default. Parallel repair is allowed only when the coordinator proves the file sets, generated artifacts, commands, and state are disjoint. `src/components/faultsmith-app.tsx`, `src/server/workflows.ts`, shared contracts, CI configuration, lockfiles, and canonical documentation are single-owner surfaces and must never be edited concurrently.

Each work packet must include:

- finding or requirement ID;
- source criterion and current branch SHA;
- exact acceptance criteria and reproduction;
- owned files and explicitly excluded files;
- required narrow regression and downstream gates;
- security and fallback invariants;
- expected evidence return, with no authorization to commit unless assigned by the coordinator.

## Evidence and Decision Flow

```text
Canonical PRD + Execution Goal
          |
          v
Coordinator snapshots branch/SHA and opens one bounded phase
          |
          +------> Product review ------+
          +------> QA/accessibility ----+--> structured findings
          +------> Security/adversarial +
                                          |
                                          v
                         Coordinator reproduces and adjudicates
                                          |
                         accepted blocker/high findings only
                                          v
                     Exclusive repair owner + regression test
                                          |
                       narrow gate -> affected downstream gates
                                          |
                           independent reviewer re-check
                                          |
                   named CI gates -> release-gate aggregation
                                          |
                    canonical docs + GSD requirement evidence
```

A finding packet should contain `id`, `criterion`, `branch_sha`, `severity`, `affected_files`, `reproduction`, `expected`, `actual`, `risk`, `suggested_fix`, and `verification`. A completion evidence packet should contain `criterion`, `branch_sha`, `command_or_manual_procedure`, `result`, `artifact_or_link`, `reviewer`, `date`, and `residual_or_blocker`.

Evidence is valid only for the named SHA and environment. A later functional change invalidates affected evidence and requires rerunning the relevant gate. Store concise durable evidence and links in `docs/BUILD_LOG.md`, `docs/TESTING.md`, `docs/THREAT_MODEL.md`, `docs/ROADMAP.md`, and `docs/COMPLETION_REPORT.md`; keep phase traceability in GSD planning files. Do not commit secrets, raw provider payloads, unbounded logs, local paths, or screenshots containing sensitive data.

## CI Architecture

Keep `npm run quality` unchanged as the complete local developer gate. Replace the single remote `Quality gate` job with independent named jobs so failures isolate quickly and safe work runs in parallel:

### Static analysis

- `npm ci`
- `npm run lint`
- `npm run typecheck`

### Unit and integration

- `npm ci`
- `npm test`
- Covers schemas, routes, workflows with mocked OpenAI, fixture lifecycle, progress integrity, and adversarial request behavior.

### Production build and security

- `npm ci`
- `npm run build`
- `npm run security:bundle`
- `npm audit --audit-level=moderate`
- Add or retain targeted repository/worktree secret and prohibited-host-execution scans with tightly documented expected test-fixture matches.
- Run the production server smoke for root, health, fallback generation, secure headers, and absence of powered-by disclosure.

### Browser and accessibility

- `npm ci`
- Install only Playwright Chromium and required OS dependencies.
- `npm run test:e2e`
- Covers the primary workflow, guided verified and failed paths, fallback, secondary projects, refresh restoration, keyboard/axe, and narrow recording layout.

### Release gate

A lightweight `release-gate` job depends on all four jobs and succeeds only when every required job succeeds. Branch protection should require the stable named release gate and, preferably, each independently visible job. Do not let the release gate use `always()` to convert cancelled, skipped, or failed dependencies into success.

Remote CI continues to avoid paid OpenAI calls. Do not put `OPENAI_API_KEY` in pull-request CI, upload `.next` contents indiscriminately, or reuse untrusted artifacts in credentialed jobs.

## Controlled External Checkpoints

### Live provider checkpoint

Run only after local and PR CI are green and the user supplies/authorizes a server-only credential. Prefer a separately dispatched workflow or local release procedure protected by an environment secret. It must:

1. assert the health endpoint reports live configuration without exposing the key;
2. exercise GPT-5.6 mutation generation and Code Interpreter original-pass/mutated-fail/repaired-pass evidence;
3. prove the response is live rather than silently accepting fallback as live evidence;
4. separately force or remove live availability and prove fixture fallback still succeeds and is visibly labeled;
5. sanitize captured evidence and stop on provider/schema/timeout ambiguity.

A failed live smoke blocks only live-verification claims. It must never trigger removal or weakening of the fixture path and must not block remaining offline, documentation, or submission preparation.

### Deployment checkpoint

Deployment requires explicit user approval after the release gate and live checkpoint status are recorded. Use an environment-protected deployment with a reversible release. Verify the public unauthenticated root, `/api/health`, secure headers, primary Expense Approval workflow, explicit fallback, narrow recording layout, and absence of secrets/hidden answers. Deployment-provider rate limits or edge controls must compensate for the accepted per-process limiter residual before public promotion.

### Human and submission checkpoint

After production verification, collect five independent tester results, repair any reproducible blocker/high issue through the same loop, rerun affected gates, then record the under-three-minute video from the verified deployment. Capture the primary Codex `/feedback` Session ID and complete submission placeholders last so URLs and claims point to the validated release SHA.

## Suggested Build Order

1. **Stabilize the release branch.** Review and land the guided-learning change, resolve branch/PR supersession, and record the exact baseline SHA. Do not mix control-plane work into an unstable feature diff.
2. **Finish GSD traceability.** Generate requirements, roadmap, state, and atomic phases that link to the canonical PRD and execution goal. Treat external checkpoints as explicit blocked requirements, not reasons to halt offline work.
3. **Split CI and repair documentation drift.** Introduce the four named gates plus aggregator; update repository-era and branch-specific claims only after the new checks pass.
4. **Run the three independent reviews in one parallel wave.** Review the same stable SHA and return findings without edits.
5. **Adjudicate and repair.** Reproduce every blocker/high finding, reject false positives with rationale, repair accepted findings one exclusive packet at a time, and add regressions.
6. **Re-review and execute the full quality gate.** Have the relevant independent stream re-check each repair, then run local `npm run quality`, production/security smoke, all named CI jobs, and documentation review.
7. **Run the live checkpoint.** Requires the server-only credential; preserve and separately re-prove fallback.
8. **Deploy and verify.** Requires approval; validate the public release and recording layout.
9. **Collect human evidence and submit.** Testers, repairs if needed, video, `/feedback`, final completion matrix, and submission fields.

This ordering maximizes submission probability: it makes current work reviewable first, accelerates independent discovery second, and defers credentialed/external state changes until the deterministic release candidate is green.

## Failure Containment and Self-Healing

- **Agent error:** Reviewer output is advisory and untrusted until the coordinator reproduces it. Agents cannot merge, certify their own fix, or expand the PRD.
- **Shared-workspace collision:** One owner per writable file set; reviewers remain read-only; generated lockfiles, snapshots, and canonical docs are single-owner. Stop and resnapshot if unexpected modifications appear.
- **Stale review:** Findings and evidence bind to a commit SHA. Any affected change invalidates the verdict and triggers targeted re-review.
- **CI failure:** Independent jobs expose the failing layer while unrelated evidence continues. Repair the narrowest root cause, add a regression, rerun that job and every dependent gate, then rerun the aggregator.
- **Provider failure:** Recover to the prevalidated fixture for product continuity, but record live verification as failed or blocked. Never relabel fallback as live proof.
- **Security failure:** Any reproducible blocker/high issue freezes merge/deploy/video for the affected SHA. The security reviewer verifies the stable remediation after the coordinator's repair.
- **Accessibility/QA failure:** A blocker/high workflow or accessibility defect freezes release claims, receives a regression where automatable, and is manually rechecked at recording resolution.
- **Secret exposure:** Stop the affected workflow, prevent artifact publication, rotate the credential with user participation, remove exposure from the current tree, inspect history, and only then resume. History rewriting remains destructive and requires explicit approval.
- **Deployment failure:** Keep the last verified release, do not mutate production blindly, and diagnose through read-only health/header/log evidence before a reversible redeploy.
- **Repeated repair failure:** After three failed attempts, preserve the working baseline, write a concise root-cause analysis, compare at least two materially different approaches, choose the safest in-scope alternative, and continue.
- **External blocker:** Missing credentials, deployment approval, tester availability, video publication, or `/feedback` access blocks only its named criterion. All other safe work continues and the final report states the boundary precisely.

## Architecture Quality Gate

The development architecture is functioning only when:

- every active requirement maps to an atomic GSD phase and objective evidence;
- product, QA, and security reviewers evaluated the same stable SHA independently;
- no reviewer edited or self-certified the implementation it judged;
- accepted blocker/high findings have reproductions, repairs, regressions, and independent re-checks;
- all four named CI jobs and the release aggregator are green;
- the fixture fallback, deterministic evidence authority, server-only secret boundary, and no-host-execution rule remain proven;
- canonical documents distinguish local, mocked, live, deployed, and external-human evidence without misleading claims;
- live, deployment, and submission checkpoints remain separately gated by credential, approval, and external evidence.

---
*This architecture accelerates development only. It does not add a runtime agent swarm or change FaultSmith's deterministic learning and execution model.*
