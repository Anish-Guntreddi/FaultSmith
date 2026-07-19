# FaultSmith Roadmap and Direction Review

**Last direction review:** July 18, 2026  
**Locked track:** Education  
**Locked primary demo:** Expense Approval boundary condition  
**Current state:** Phase 2 offline preparation complete on runtime SHA `5fcae2713e449dd0a7bc73c0a4858f476d60a7a1` and evidence head `953821e782531f59dcf5d21a3b76e7dc76dd1c38`: strict fallback/live/production smoke, sanitized evidence, UAT/readiness validation, and deployment/rollback procedures are implemented; 126 unit/integration tests, seven browser workflows, and four required GitHub jobs pass. Live credential proof, deployment approval, and remaining human submission actions are still pending.

## Completed milestones

| Milestone | Evidence |
| --- | --- |
| Secure challenge domain | Strict contracts, public DTO stripping, nine fixtures, allowlisted edits, exact prevalidated repair matching, score-only live assessment with server-owned prose, expanded sanitation, 63 passing unit/integration tests |
| Validated generation | Separate GPT-5.6 mutation and validation schemas are constrained by approved contracts; deterministic original-pass/mutated-fail/signature checks remain authoritative and one retry precedes fallback |
| Isolated execution | Live Python path uses Code Interpreter only; client has no command or container-ID input; local fallback is deterministic and explicitly labeled |
| Deterministic assessment | Exact submitted snapshot is rerun; failing or overbroad evidence forces `not_verified`; hidden answers are excluded from score-only model input; feedback prose remains server-owned |
| Complete learning UI | Project/skill/difficulty selection, forge state, editor, tests, revision-aware hypothesis journal, separately delivered hints, explanation, evidence report, reset and refresh restoration |
| Guided learning MVP | Three-phase, nine-lesson evidence-first roadmap; concept guides; investigation checklists; zero-token guided launches; bounded local progress; verified-only completion; deterministic reinforcement/next-step recommendations; direct catalog preserved |
| Reliability breadth | Three projects and three scenarios per project; missing-key, malformed plan, timeout, expiration, and invalid patch paths covered |
| Quality hardening | Independent product/QA/security reviews, duplicate-action single-flight, streamed request cap, keyboard/axe/mobile checks, all-fixture bundle and source/history scans, secure headers, bounded local telemetry/rate buckets, zero-audit dependency state |
| Submission package | README, build log, testing guide, threat model, demo script, Devpost draft, license, and completion report |
| Public development baseline | `Anish-Guntreddi/FaultSmith` on GitHub with tracked `main`, CI, Dependabot, CODEOWNERS, issue forms, pull-request template, security policy, and contribution workflow |
| Offline release readiness | Default-free seven-stage lifecycle smoke, explicit paid live gate, production HTML/header/cache smoke, strict safe evidence writer, honest submission/UAT validator, five-person protocol, and approval-gated deployment/rollback runbook; 63 focused tests and independent adversarial recheck green |

## Remaining PRD gaps requiring external action

1. Privately configure a funded `OPENAI_API_KEY` and run the single controlled local GPT-5.6 and Code Interpreter smoke command; clean up the credential before repository scanning.
2. Obtain deployment approval, configure edge/shared abuse controls, deploy, and verify the public URL without authentication.
3. Run the study with at least five external testers and record comprehension results.
4. Record and publish the under-three-minute demonstration.
5. Capture the primary Codex `/feedback` Session ID and place it in the submission.

These are intentionally not marked complete by local fallback evidence.

## Current risks

- **Highest technical risk:** live provider response or container behavior can drift from mocked/typed expectations. Mitigation: strict parse/validation, timeout, one retry, safe recovery, and a separate live smoke procedure.
- **Highest demo risk:** network or credential failure during recording. Mitigation: the primary lab is prevalidated and automatically recovers to fixture mode with visible labeling; the explicit live proof is performed before recording rather than improvised on camera.
- **Highest security risk:** the in-memory rate limiter is per process and not globally coordinated across a multi-instance deployment. Mitigation: conservative route limits now; add provider/edge rate limiting before any public exposure of a paid server credential.
- **Highest judging opportunity:** accurately show the zero-token guided curriculum, then—only after credentialed proof—show GPT emitting the exact approved live contract, Code Interpreter producing execution evidence, and deterministic policy controlling release.
- **API-credit constraint:** live generation can require original and mutated executions, plus assessment. The fixture path allows unlimited rehearsal without spend.
- **Curriculum boundary:** guided metadata must never contain hidden answers or become an alternate execution authority. Mitigation: lesson data references only public project-skill IDs; fixtures and assessments remain server-owned.
- **Time constraint:** prioritize the public deployment, five-tester study, and concise recording over new product breadth.
- **Competition access requirement:** the [official rules](https://openai.devpost.com/rules) require working project access through a website, functioning demo, or test build plus a public repository/video. For this browser application, a stable unauthenticated HTTPS deployment is the safest compliance path even though the rules do not name Vercel specifically.

## Recommended next milestone

First publish the offline checkpoint and wait for four green required checks. With user authorization and a server-only API key, run the one-command controlled local live smoke and resolve any provider-contract failure without weakening fallback. Then remove the key locally, obtain separate deployment approval, configure edge controls, publish the exact reviewed head, run production smoke, and complete the five-person usability pass. If the live service is unstable near recording time, record the labeled fixture path while accurately describing the separate live evidence.

## Explicitly deferred scope

- Natural-language custom challenge prompting
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

Direction remains aligned with the approved PRD amendment. No further material product expansion is recommended before submission.
