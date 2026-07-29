---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 01.1-05-PLAN.md
last_updated: "2026-07-19T18:48:06.654Z"
last_activity: July 19, 2026 — Plan 01.1-05 froze the triple-approved offline runtime SHA ae39503 after independent reviews, four low-finding repairs with regressions, canonical documentation updates, and full local/emulator + GitHub-check gates on that exact SHA.
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 18
  completed_plans: 16
  percent: 89
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated July 18, 2026)

**Core value:** Learners must practice reading real failure evidence, reasoning about root causes, and proving minimal repairs instead of receiving an answer that bypasses the debugging process.
**Current focus:** Phase 01.1 — Personalized Learner Accounts, Cloud Progress, and Metrics Dashboard

## Current Position

Phase: 01.1 of 5 (Personalized Learner Accounts, Cloud Progress, and Metrics Dashboard)
Plan: 5 of 6 complete; Plan 06 (human credential checkpoint: real Firebase configuration and proof) is next
Status: Executing; the credential-free offline candidate ae39503 is frozen, fully gated, and triple-approved — real Firebase configuration is now the legitimate dependency
Last activity: July 19, 2026 — Plan 01.1-05 froze the triple-approved offline runtime SHA ae39503 after independent reviews, four low-finding repairs with regressions, canonical documentation updates, and full local/emulator + GitHub-check gates on that exact SHA.

Progress: [█████████░] 89%

## Performance Metrics

**Velocity:**
- Total plans completed: 6
- Average duration: 16 min
- Total execution time: 94 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 1 | 6 | 94 min | 16 min |

**Recent Trend:**
- Last 5 plans: 26 min, 25 min, 40 min, 48 min (01.1 P02–P05)
- Trend: Phase 01.1 credential-free scope complete and frozen; the private Firebase credential checkpoint (Plan 06) is the next legitimate dependency

*Updated after each plan completion*
| Phase 01 P01 | 8 min | 4 tasks | 5 files |
| Phase 01 P02 | 11 min | independent product review | 2 files |
| Phase 01 P03 | 13 min | independent QA/accessibility review | 2 files |
| Phase 01 P04 | 15 min | independent security/adversarial review | 2 files |
| Phase 01 P05 | 34 min | 13 findings disposition, repairs, regressions, rechecks | 24 files |
| Phase 01 P06 | 13 min | canonical evidence, manual production review, remote CI/protection | 13 files + GitHub state |
| Phase 02 P01 | 25 min | strict route lifecycle and evidence core | 2 files |
| Phase 02 P02 | 20 min | submission/UAT readiness validator and protocol | 4 files |
| Phase 02 P03 | 8 min | explicit fallback/live operator CLI | 2 files |
| Phase 02 P04 | 10 min | production smoke and deployment/rollback runbook | 3 files |
| Phase 02 P05 | 31 min | integration, adversarial self-heal, full local/remote gates | 14 files + GitHub state |
| Phase 01.1 P01 | 19 min | 2 tasks | 11 files |
| Phase 01.1 P02 | 26 min | 2 tasks | 18 files |
| Phase 01.1 P03 | 25 min | 2 tasks | 13 files |
| Phase 01.1 P04 | 40 min | 2 tasks | 13 files |
| Phase 01.1 P05 | 48 min | 3 tasks | 22 files |

## Accumulated Context

### Decisions

Decisions are logged in `.planning/PROJECT.md`. Recent decisions affecting current work:

- Use GSD as the development control plane; runtime product authority remains deterministic.
- Stabilize and independently review one SHA before accepting live, deployment, UAT, or video evidence.
- Preserve and visibly label the real prevalidated fixture fallback through every phase.
- Defer custom prompts, repository ingestion, runtime swarms, and other material product expansion until a later PRD cycle.
- Phase 01.1 inserted after Phase 1: Personalized learner accounts, cloud progress, and metrics dashboard (URGENT).
- Keep guest/local progress as the default reliability path; optional verified email/password or Google identity and Firestore synchronization are configuration-gated and server-mediated.
- Firebase owns passwords, verification, reset, and provider identity. Unverified password accounts stay local; provider collisions cannot silently merge or split progress.
- If real Firebase or preview gates miss the release cutoff, disable cloud mode and retain the local personalized dashboard on the last known-green candidate.
- [Phase 01.1]: Keep v1 learning-progress key untouched; v2 learner profile composes v1 completions plus a dedicated bounded attempt-history key, migrating deterministically without fabricating history
- [Phase 01.1]: Certified progress metrics count only server_verified verified attempts; migrated/local-import data advances the roadmap but never verified score averages
- [Phase 01.1]: Test-run counts are descriptive process evidence only and never enter any score computation
- [Phase 01.1]: Node runtime raised to engines >=22.0.0 with .nvmrc 24 to match Firebase Admin 14 support while CI stays Node 24 — Firebase Admin 14 requires Node 22+; CI/workstation already run Node 24
- [Phase 01.1]: Transitive @opentelemetry/core and uuid pinned via npm overrides for a zero-vulnerability audit instead of downgrading firebase-tools — Plan forbids vulnerable or audit-skipping dependency states
- [Phase 01.1]: Only the exact NEXT_PUBLIC_FIREBASE_API_KEY name is scanner-allowlisted as public metadata; variants and publicized server secrets still fail closed — Firebase web API key is public project metadata, not authorization
- [Phase 01.1]: Provider link attempts that would change the UID sign out and report link_unavailable; password reset reports generic success to prevent account enumeration — Progress must never migrate across UIDs and auth flows must stay enumeration-resistant
- [Phase 01.1]: Identity DAL requires email_verified true provider-independently, rejecting unverified email/password identities without provider literals in server code — Fail-closed, satisfies AUTH requirements, and keeps the password-boundary scanner clean
- [Phase 01.1]: Persisted attempt summaries record challengeSource prevalidated and take lesson difficulty from the unique challenge-to-lesson registry mapping — The server never accepts source, lesson, or difficulty authority from a progress-write client
- [Phase 01.1]: cloudSync is an optional bounded enum on the shared assessment response; it is descriptive only and can never change completion or test authority — Legacy saved responses still parse strictly while cloud-aware clients get the sync fact
- [Phase 01.1]: Cloud profile lives in one transactional learningProfiles/{uid} document with a localImportedAt marker enforcing the bounded one-time import (409 on replay) — Makes replay collapse, retention, isolation, and deletion trivially verifiable
- [Phase 01.1]: Cloud-merged progress renders from React state only; device localStorage keeps device-only progress plus one identity-free opt-in boolean, so sign-out structurally returns to guest data — No Firebase user/token/identity material may enter FaultSmith persistence and shared machines must stay clean
- [Phase 01.1]: Attempt dedupe uses a bounded outcome identity mirroring the server SHA-256 idempotency material, collapsing local and server copies of one attempt with server_verified preferred — Prevents duplicated attempts and false provenance in cloud merges
- [Phase 01.1]: CSP widens only in cloud-configured builds by exact empirically proven origins (identitytoolkit/securetoken connect-src, validated auth-domain frame-src, apis.google.com script-src); COOP relaxes to same-origin-allow-popups only then — The popup flow fails closed without the gapi loader origin and the opener relationship; cloud-off production headers stay byte-identical to baseline
- [Phase 01.1]: Provider linking stays behind the NEXT_PUBLIC_FAULTSMITH_PROVIDER_LINKING capability flag (default unsupported) until Plan 06 real-provider proof; collisions receive safe existing-method guidance — Linking may ship only after emulator and real-provider proof are green
- [Phase 01.1]: Same-origin containment applies to every token-accepting route via one shared server-only assertSameOrigin guard — The assess route can trigger authenticated cloud writes; duplicated security logic drifts
- [Phase 01.1]: Canonical docs never embed run-volatile evidence numbers; exact scan counts live only in SHA-bound review reports — Embedded counts drifted between runs and failed final doc-accuracy review
- [Phase 01.1]: Reviewed offline runtime SHA is ae39503; the review-report metadata commit a507af8 is evidence-only and no later runtime candidate may publish without repeating all three reviews and full gates — Binds deployment/runtime evidence to one independently approved candidate

### Roadmap Evolution

- Phase 01.1 inserted after Phase 1: Personalized learner accounts, cloud progress, and metrics dashboard (URGENT)

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 2 Plan 06 requires the user to privately configure a valid funded server-only `OPENAI_API_KEY`, confirm only the live health boolean, and later privately remove it before final source scanning.
- Real Phase 01.1 cloud proof requires the user to create a Firebase Spark project, enable email/password and Google Authentication plus Firestore, configure the password policy, enumeration protection, reviewed domains/action URLs, and privately configure client/server values; emulator and local-only work do not require those credentials.
- Phase 3 requires explicit deployment approval and access to the selected host configuration.
- Phase 4 requires five external testers, video publication, and the primary Codex `/feedback` Session ID.
- The submission deadline is July 21, 2026 at 5:00 PM Pacific; release proof takes priority over feature breadth.

## Session Continuity

Last session: 2026-07-19T18:48:06.652Z
Stopped at: Completed 01.1-05-PLAN.md
Resume file: None
