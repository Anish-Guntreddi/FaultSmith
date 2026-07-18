# FaultSmith Roadmap and Direction Review

**Last direction review:** July 18, 2026  
**Locked track:** Education  
**Locked primary demo:** Expense Approval boundary condition  
**Current state:** Local release candidate; live credential smoke and external submission actions pending

## Completed milestones

| Milestone | Evidence |
| --- | --- |
| Secure challenge domain | Strict contracts, public DTO stripping, nine fixtures, allowlisted edits, exact prevalidated repair matching, challenge-grounded fallback scoring, sanitized output, 36 passing unit/integration tests |
| Validated generation | Separate GPT-5.6 mutation and validation schemas are constrained by approved contracts; deterministic original-pass/mutated-fail/signature checks remain authoritative and one retry precedes fallback |
| Isolated execution | Live Python path uses Code Interpreter only; client has no command or container-ID input; local fallback is deterministic and explicitly labeled |
| Deterministic assessment | Exact submitted snapshot is rerun; failing evidence forces `not_verified`; model scores are bounded and subordinate |
| Complete learning UI | Project/skill/difficulty selection, forge state, editor, tests, revision-aware hypothesis journal, separately delivered hints, explanation, evidence report, reset and refresh restoration |
| Reliability breadth | Three projects and three scenarios per project; missing-key, malformed plan, timeout, expiration, and invalid patch paths covered |
| Quality hardening | Keyboard and axe checks, secondary-project E2E, narrow viewport check, reduced-motion CSS, secure headers, bounded local telemetry/rate buckets, zero-audit dependency state, production build |
| Submission package | README, build log, testing guide, threat model, demo script, Devpost draft, license, and completion report |

## Remaining PRD gaps requiring external action

1. Run the controlled live GPT-5.6 and Code Interpreter smoke test with a valid `OPENAI_API_KEY`.
2. Obtain deployment approval, deploy, and verify the public URL without authentication.
3. Create or connect the public source repository and preserve it through judging. This workspace currently has no `.git` directory.
4. Run the study with at least five external testers and record comprehension results.
5. Record and publish the under-three-minute demonstration.
6. Capture the primary Codex `/feedback` Session ID and place it in the submission.

These are intentionally not marked complete by local fallback evidence.

## Current risks

- **Highest technical risk:** live provider response or container behavior can drift from mocked/typed expectations. Mitigation: strict parse/validation, timeout, one retry, safe recovery, and a separate live smoke procedure.
- **Highest demo risk:** network or credential failure during recording. Mitigation: the primary lab is prevalidated and automatically recovers to fixture mode with visible labeling.
- **Highest security risk:** the in-memory rate limiter is per process and not globally coordinated across a multi-instance deployment. Mitigation: conservative route limits now; add provider/edge rate limiting before high-traffic public use.
- **Highest judging opportunity:** show that GPT does more than chat—it creates a constrained mutation plan, Code Interpreter proves the failure, and deterministic evidence controls the final result.
- **API-credit constraint:** live generation can require original and mutated executions, plus assessment. The fixture path allows unlimited rehearsal without spend.
- **Time constraint:** prioritize the public deployment, five-tester study, and concise recording over new product breadth.

## Recommended next milestone

With user authorization and a server-only API key, deploy a preview release, run the live smoke checklist, resolve any environment-specific failure, and then complete the five-person usability pass. If the live service is unstable near recording time, record the labeled fixture path while accurately describing the live architecture and separate live evidence.

## Explicitly deferred scope

- Arbitrary repository upload or arbitrary Python execution
- Accounts, cross-device synchronization, cohorts, and instructor dashboards
- Languages other than Python
- Learner-supplied shell commands, dependencies, file IDs, or container IDs
- Competitive scoring, leaderboards, and unverifiable certification claims
- Additional projects beyond the three curated MVP projects

## Judging-criteria direction review

- **Technological implementation:** strongest when the validated GPT contract, sandbox boundary, deterministic override rule, and recovery states are demonstrated together.
- **Design:** strongest when the learner moves from evidence to hypothesis to minimal repair without premature answer leakage.
- **Potential impact:** a reusable practice loop can turn passive tutorials into deliberate debugging exercises.
- **Quality of idea:** the deliberate, validated failure is the differentiator; adding broad project ingestion before submission would weaken reliability and safety.

Direction remains aligned with the locked PRD. No material product change is recommended.
