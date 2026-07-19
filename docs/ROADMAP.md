# FaultSmith Roadmap and Direction Review

**Last direction review:** July 19, 2026
**Locked track:** Education  
**Locked primary demo:** Expense Approval boundary condition  
**Current state:** Phase 01.1, the Forensic Workbench design, and the isolated Debugging Case File motion pass are complete locally. The guest-first My Progress dashboard, optional verified email/password and Google accounts, server-verified identity, server-mediated Firestore progress, configuration-off rollback, and presentation-only scroll narrative pass the complete local/emulator gate set (272 unit, 23 emulator-integration, 18 default browser, 16 Firebase-mode browser tests, production build, 23-artifact bundle scan, and zero-vulnerability audit). A private Firebase Spark project is configured and its sanitized automated real-project smoke passed 22/22 stages; Google popup/cancel/collision, real inbox links, clean-browser UI restoration, and the private credential-removal/cloud-off checkpoint remain pending human proof. Netlify deployment, live OpenAI proof, external UAT, recording, and final submission actions are still pending.

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
| Phase 01.1 accounts and cloud progress (offline candidate) | Guest-first My Progress dashboard with deterministic explained metrics; optional verified email/password + Google accounts via a lazy browser Firebase adapter; server-only identity DAL (bounded token parsing, verified-email enforcement, UID-only paths); transactional Firestore repository with SHA-256 idempotency, 50-attempt retention, one-time labeled import, explicit deletion; deny-all direct-client rules; exact-origin cloud CSP widening; tested cloud-off rollback; 23 emulator-integration and 16 emulator-browser scenarios; three independent reviews with all accepted findings repaired |
| Real Firebase automated proof | Sanitized 22/22 real-project stages covering password/email identity, verified/unverified boundaries, cloud persistence, idempotency/import/restore/isolation, deployed direct-client denial, bounded usage, degraded local fallback, deletion/cleanup, and secret-free logs; human Google/inbox/browser and cloud-off checkpoints remain open |
| Forensic Workbench design system | Locked visual principles/tokens in `docs/DESIGN_SYSTEM.md`; unified roadmap, skill practice, progress/account sync, workspace, validation, and both report states; Observe → Hypothesize → Repair → Verify rhythm; desktop/mobile visual review plus keyboard/axe/overflow gates green; no new dependency or remote asset |
| Debugging Case File motion narrative | Presentation-only GSAP/ScrollTrigger split chunks dynamically load near one desktop explanatory section; native CSS-sticky scroll demonstrates the four-step investigation loop; mobile/reduced-motion/static fallbacks, teardown transitions, compositor-only properties, no-overflow, and bundle-leakage regressions pass; core practice and fixture fallback remain independent |

## Remaining PRD gaps requiring external action

1. ~~Complete Phase 01.1 credential-free contracts, metrics/dashboard, Firebase adapters, emulator tests, regression gates, and independent QA/security review.~~ **Done** — frozen offline candidate with three independent approvals; see `docs/TESTING.md` and the phase review reports.
2. ~~Create/configure the Firebase Spark project and complete automated real-project verification.~~ **Automated portion done (22/22).** Still required: real Google popup/cancel/collision, emailed verification/reset links, clean-browser signed-in UI restoration at both target viewports, and the private configuration-off cleanup/rollback gate.
3. Privately configure a funded `OPENAI_API_KEY` and run the single controlled local GPT-5.6 and Code Interpreter smoke command on the post-Phase-01.1 candidate; clean up the credential before repository scanning.
4. Obtain Netlify deployment approval, configure shared/edge abuse controls, deploy a preview, and verify both guest and signed-in workflows before production promotion.
5. Run the study with at least five external testers and record comprehension results.
6. Record and publish the under-three-minute demonstration.
7. Capture the primary Codex `/feedback` Session ID and place it in the submission.

These are intentionally not marked complete by local fallback evidence.

## Current risks

- **Highest technical risk:** live provider response or container behavior can drift from mocked/typed expectations. Mitigation: strict parse/validation, timeout, one retry, safe recovery, and a separate live smoke procedure.
- **Highest demo risk:** network or credential failure during recording. Mitigation: the primary lab is prevalidated and automatically recovers to fixture mode with visible labeling; the explicit live proof is performed before recording rather than improvised on camera.
- **Highest security risk:** the in-memory rate limiter is per process and not globally coordinated across a multi-instance deployment. Mitigation: conservative route limits now; add provider/edge rate limiting before any public exposure of a paid server credential.
- **Highest new privacy risk:** cloud persistence and multiple providers can accidentally widen learner-data collection, expose account existence, split progress, or permit cross-user access. Mitigation: guest default, Firebase-owned password/verification/reset, enumeration-resistant responses, explicit provider-collision handling, server-derived UID, strict bounded DTOs, server-mediated writes, direct-client Firestore denial, no source/prose/password storage, deletion, emulator isolation tests, and independent adversarial review.
- **Highest judging opportunity:** accurately show the zero-token guided curriculum, then—only after credentialed proof—show GPT emitting the exact approved live contract, Code Interpreter producing execution evidence, and deterministic policy controlling release.
- **API-credit constraint:** live generation can require original and mutated executions, plus assessment. The fixture path allows unlimited rehearsal without spend.
- **Curriculum boundary:** guided metadata must never contain hidden answers or become an alternate execution authority. Mitigation: lesson data references only public project-skill IDs; fixtures and assessments remain server-owned.
- **Time constraint:** Phase 01.1 has a mandatory configuration-off rollback. If real Firebase identity, isolation, CSP, preview, or complete gates miss the July 20 cutoff, ship the local personalized dashboard on the last known-green baseline.
- **Competition access requirement:** the [official rules](https://openai.devpost.com/rules) require working project access through a website, functioning demo, or test build plus a public repository/video. For this browser application, a stable unauthenticated HTTPS deployment is the safest compliance path even though the rules do not name Vercel specifically.

## Recommended next milestone

The local implementation, automated Firebase proof, Forensic Workbench design, and judge-facing motion narrative are ready. Next: complete the remaining human real-Firebase browser checks, privately omit/remove the credential file long enough to prove the canonical cloud-off/source-scan rollback, then run the separately credentialed OpenAI smoke. After explicit Netlify approval, configure platform controls, deploy a preview, run production smoke, and complete five-person UAT. If any cloud checkpoint fails, disable sync through configuration and retain the local dashboard, fixture fallback, and validated learning loop.

## Explicitly deferred scope

- Natural-language custom challenge prompting
- Arbitrary repository upload or arbitrary Python execution
- Cohorts, assignments, instructor dashboards, organization administration, and mandatory accounts
- Languages other than Python
- Learner-supplied shell commands, dependencies, file IDs, or container IDs
- Competitive scoring, leaderboards, and unverifiable certification claims
- Additional projects beyond the three curated MVP projects

## Judging-criteria direction review

- **Technological implementation:** strongest when the validated GPT contract, sandbox boundary, deterministic override rule, and recovery states are demonstrated together.
- **Design:** the locked Forensic Workbench and isolated Debugging Case File make the evidence → hypothesis → minimal repair → exact verification loop visible in both the working product and a memorable scroll narrative without premature answer leakage, scroll-jacking, or novelty-terminal effects.
- **Potential impact:** a reusable practice loop can turn passive tutorials into deliberate debugging exercises.
- **Quality of idea:** the deliberate, validated failure is the differentiator; adding broad project ingestion before submission would weaken reliability and safety.

Direction is aligned with the approved July 19 personalized-learning PRD amendment. No additional material product expansion is recommended before submission.
