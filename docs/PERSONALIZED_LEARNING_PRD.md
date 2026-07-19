# Personalized Learning, Cloud Progress, and Metrics PRD

**Scope change requested:** July 19, 2026  
**Target:** OpenAI Build Week submission on July 21, 2026  
**Status:** Credential-free implementation complete and frozen as an independently reviewed offline/emulator candidate (July 19, 2026). Acceptance criteria 1–19 have local/emulator evidence (see `docs/TESTING.md` and the `.planning` Phase 01.1 review reports); criterion 20 (Netlify preview) and the real-Firebase/real-provider portions of criteria 3, 4, and 6 remain human-gated and are claimed nowhere. Emulator proof is never presented as real-provider proof.  
**Hosting:** Netlify for the Next.js application; Firebase Authentication and Cloud Firestore for optional identity and cloud progress  
**Product boundary:** Preserve anonymous access, the validated fixture fallback, deterministic test authority, and every hidden-answer and host-execution invariant.

## 1. Decision

FaultSmith will add an optional personalized learner profile without turning sign-in, Firebase, or the network into a prerequisite for learning.

The product will have two persistence modes and three access paths:

1. **Guest mode:** the existing browser-local attempt and roadmap progress remains the default and continues to work with no account, Firebase configuration, OpenAI credential, or network dependency beyond loading the application.
2. **Synced mode:** a learner may create or sign in to an email/password account, or continue with Google, through Firebase Authentication to synchronize bounded progress and attempt metrics across devices. FaultSmith's Next.js server verifies the Firebase ID token and performs all Cloud Firestore learning-data writes. Email/password accounts must verify their email before cloud learning-data access is enabled; until then, the complete local guest path remains available.

The application will add a **My Progress** dashboard that works in both modes. Personalization remains deterministic and explainable; it does not call a model, award a credential, rank learners, or make academic decisions.

## 2. Why this matters

The guided roadmap currently recommends the next lesson from a learner's most recent verified result, but its evidence is visible mainly at the lesson and final-report level. A dedicated progress surface makes the core educational value legible:

- learners see what they completed and what evidence supports that progress;
- learners see where they relied on hints or needed several test iterations;
- learners receive a transparent reinforcement or next-lesson recommendation;
- returning learners can continue on another device after optional sign-in;
- the demo can show longitudinal value without requiring paid AI calls.

Authentication and storage support personalization; they do not become the product. The differentiator remains evidence-first debugging with validated failures.

## 3. Goals

### 3.1 Submission goals

- Keep the final judging URL usable without creating an account.
- Add optional email/password account creation and login plus Google sign-in for durable, cross-device progress.
- Persist only bounded learning metadata after server-side identity verification.
- Display useful personal metrics in guest and synced modes.
- Preserve the existing verified-only lesson completion rule.
- Make Firebase absence, quota exhaustion, timeout, or misconfiguration degrade to local progress without blocking a challenge.
- Keep the complete fixture path at zero OpenAI token cost.
- Remain compatible with Netlify's Next.js/OpenNext deployment path.

### 3.2 Success signals

- A new visitor can start Lesson 1 without seeing a login wall.
- A guest can complete a verified lesson and immediately see updated personal metrics.
- A signed-in learner can reload on a clean browser and recover synchronized progress.
- A failing or unsubmitted repair never creates a completed lesson.
- One user cannot read, write, delete, or infer another user's learning records.
- Cloud records contain no source code, hypothesis, explanation, hint text, hidden answer, raw test output, prompt, OpenAI identifier, Firebase token, or service credential.
- Disabling Firebase configuration restores the existing local-only behavior without a code rollback.

## 4. Non-goals

- Mandatory registration or a login-protected judging URL.
- Phone, school SSO, multi-factor authentication, or instructor-managed accounts in this release.
- Cohorts, classrooms, assignments, teacher dashboards, or organization administration.
- Leaderboards, competitive ranking, grading, certification, employment claims, or academic-integrity judgments.
- Storing learner source code, hypotheses, explanations, raw test output, prompts, or provider responses in Firebase.
- Firebase Hosting, Cloud Functions, Cloud Storage, BigQuery, or Firebase AI Logic. Netlify remains the application host.
- Machine-learned curriculum sequencing. Recommendations remain deterministic.
- Removing or weakening browser-local persistence.

## 5. User experience

### 5.1 Guest learner

1. The learner opens FaultSmith and sees the Guided Roadmap without authentication.
2. The learner completes challenges using the current local persistence path.
3. **My Progress** shows local completion and learning metrics.
4. A non-blocking control explains that creating an account, logging in, or continuing with Google enables cross-device synchronization.
5. If the learner never signs in, every current core workflow remains available.

### 5.2 Email/password learner

1. The learner chooses **Create account** or **Log in** from My Progress; neither action blocks guest access.
2. Firebase Authentication—not FaultSmith's server—receives and manages the email and password.
3. New accounts receive an email-verification message. Until verification is complete, the learner can continue locally but cannot read, import, write, or delete cloud learning data.
4. A verified learner's Firebase ID token is sent only to FaultSmith's same-origin API over HTTPS.
5. **Forgot password** requests a Firebase password-reset email and always returns a bounded generic confirmation state.
6. Signing out returns the browser to guest mode without deleting cloud data.

### 5.3 Google learner

1. The learner chooses **Continue with Google**.
2. Firebase completes Google authentication through an accessible popup, with a redirect fallback only if verified on the selected browsers.
3. The browser sends the Firebase ID token to FaultSmith's same-origin API over HTTPS.
4. The server verifies the token and returns only that UID's bounded progress DTO.
5. Local and cloud progress are merged deterministically. Imported local records are labeled `local_import`; future server-persisted results are labeled `server_verified`.
6. Future verified assessments update cloud progression. Failed assessments may update private attempt history but never completion.
7. Signing out returns the browser to guest mode without deleting cloud data.

### 5.4 Provider continuity

- Email/password and Google use the same UID-keyed profile schema and metrics implementation.
- The Firebase project uses one-account-per-email behavior. A provider collision is handled explicitly: the learner is asked to authenticate with the existing method before any linking attempt.
- Provider linking is allowed only from an already authenticated, recently reauthenticated account and must preserve the same Firebase UID. It is not required for the primary submission workflow and ships only if emulator and real-provider tests are green.
- FaultSmith never silently merges or deletes two Firebase identities, guesses ownership from an email string, or copies progress between UIDs. If safe linking is unavailable, the UI gives deterministic existing-provider guidance and leaves both records unchanged.

### 5.5 Progress dashboard

The dashboard displays:

- lessons completed out of nine;
- phase completion across Read the Evidence, Reason About Behavior, and Defend Real Systems;
- average overall score across verified attempts;
- root-cause, causal-reasoning, concept-understanding, and patch-discipline averages;
- hints used and independent-solve rate;
- test-run history as a process signal, never as a penalty for experimentation;
- strongest practiced skill and skill needing reinforcement;
- recent bounded attempt history;
- the deterministic next recommendation and the evidence behind it;
- storage mode: **On this device**, **Verification required**, **Synced to account**, or **Saved on this device—cloud unavailable**.

Metrics must use plain language and state that they are practice evidence, not grades or certification.

## 6. Product rules

1. Authentication is optional. Core UI and challenge API routes remain usable without an identity token.
2. Completion remains test-authoritative. Only a `verified` assessment can complete a roadmap lesson.
3. Model output cannot change progress authority. GPT scores may contribute to displayed reasoning dimensions, but deterministic test status controls completion.
4. Cloud persistence is best-effort. A Firebase failure produces a visible, non-alarming local-only status and never discards newer local data.
5. Local state remains the immediate write path. Cloud synchronization happens after local success so network latency cannot block the report.
6. Sync is idempotent. Repeating the same assessment or retrying a timed-out request cannot double-count an attempt.
7. Progress merge is monotonic. A remote record cannot erase a newer local verified completion, and an older local record cannot replace newer cloud evidence.
8. Imported local records are not misrepresented as server-verified history.
9. No metric encourages learners to avoid tests. Test-run count is descriptive evidence, not a negative scoring component.
10. Data minimization takes priority over analytics breadth.

## 7. Technical architecture

```text
Browser
  ├─ Guest progress → validated localStorage
  ├─ Firebase Auth → optional email/password or Google ID token
  └─ Same-origin Next.js API + optional Bearer token
          ├─ strict Zod request/response contracts
          ├─ Firebase Admin ID-token verification
          ├─ deterministic assessment authority
          └─ Cloud Firestore bounded progress repository

Netlify
  ├─ Next.js 16 through OpenNext
  ├─ server-only Firebase/OpenAI credentials
  └─ edge/shared rate and spend controls

Firebase Spark project
  ├─ Authentication: email/password + Google providers
  └─ Cloud Firestore: deny direct browser access; server-mediated records
```

Firebase's current Admin Node.js SDK documentation requires Node.js 22 or newer. The implementation and Netlify runtime must therefore use a reviewed Node 22-or-newer configuration. Netlify officially supports major Next.js features through its OpenNext adapter. See [Firebase Admin setup](https://firebase.google.com/docs/admin/setup) and [Next.js on Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/).

### 7.1 Configuration modes

The application must derive one of three public health states without returning configuration values:

- `local_only`: Firebase configuration is absent; local progress is fully ready.
- `cloud_ready`: Firebase client and server configuration are present.
- `cloud_degraded`: Firebase was configured but the current request could not use it; local progress remains ready.

No Firebase credential value, project identifier, auth token, UID, or failure detail appears in `/api/health`.

### 7.2 Environment contract

Public Firebase web configuration, which Firebase necessarily exposes to the browser:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FAULTSMITH_CLOUD_PROGRESS`

Server-only configuration:

- `FIREBASE_PROJECT_ID`
- one reviewed Netlify-compatible service-account credential secret, preferably a single encoded JSON value rather than a repository file;
- existing `OPENAI_API_KEY`, configured independently.

Public Firebase configuration is not authorization. Firebase identity, server token verification, strict data contracts, and server-only Firestore access provide the trust boundary. Service-account material must never enter a `NEXT_PUBLIC_` variable, committed file, build artifact, screenshot, log, or evidence manifest.

### 7.3 Data model

Cloud Firestore stores two bounded record families:

```ts
type CloudLearningProfile = {
  schemaVersion: 1;
  updatedAt: number;
  completions: Array<{
    stepId: LearningStepId;
    completedAt: number;
    overallScore: number; // 0..100
    hintsUsed: number; // 0..3
    testRuns: number; // 0..100
    evidenceTier: "server_verified" | "local_import";
  }>;
};

type CloudAttemptSummary = {
  schemaVersion: 1;
  attemptId: string;
  idempotencyKey: string;
  stepId?: LearningStepId;
  projectId: ProjectId;
  targetSkill: string;
  difficulty: Difficulty;
  challengeSource: "generated" | "prevalidated";
  completionStatus: "verified" | "not_verified";
  overallScore: number;
  rootCauseScore: number;
  reasoningScore: number;
  patchDisciplineScore: number;
  conceptUnderstandingScore: number;
  hintsUsed: number;
  testRuns: number;
  changedLines: number;
  durationBucket: "under_5m" | "5_to_15m" | "over_15m";
  completedAt: number;
};
```

The profile contains at most nine completions. Attempt history contains at most 50 summaries per user. The server deletes the oldest excess records without using paid Firestore TTL, backup, clone, or PITR features.

The data model intentionally excludes names, email addresses, password material, and provider identifiers. Firebase Authentication may hold identity data and password credentials under Firebase's own account record; FaultSmith does not duplicate them into Firestore, localStorage, logs, evidence, or its server persistence layer.

### 7.4 API surface

- `GET /api/progress`: optional authenticated read of the caller's cloud DTO.
- `POST /api/progress/import`: one bounded, idempotent import of validated local progress, stored as `local_import`.
- `DELETE /api/progress`: delete the caller's Firestore learning records after explicit confirmation.
- Existing `POST /api/challenges/assess`: when a valid Firebase identity is present, persist the bounded assessment summary after deterministic assessment policy completes.

All progress endpoints require a verified Firebase ID token and return `Cache-Control: no-store`. Missing tokens return an authentication error only for progress routes; they do not affect challenge routes. Invalid, expired, wrong-project, malformed, or oversized authorization values fail closed with sanitized responses.

Firebase documents the supported custom-backend flow as sending an ID token over HTTPS and verifying it server-side before using its UID. See [Verify Firebase ID tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens).

## 8. Metrics and recommendation policy

Metrics are derived from strict DTOs and never from raw learner prose.

- Overall score uses the existing bounded assessment aggregation.
- Dimension averages use verified attempts only.
- Independent-solve rate is the percentage of verified attempts completed with zero hints.
- Strongest skill is the practiced skill with the highest verified average after at least one verified attempt.
- Reinforcement priority is the most recent practiced skill with an overall score below 80, more than one hint, or an unverified final assessment.
- If no reinforcement condition exists, recommend the first incomplete unlocked lesson.
- After all roadmap lessons are complete, recommend direct-catalog practice at a higher difficulty.

Every recommendation displays its reason. No opaque model-generated recommendation is introduced.

## 9. Security and privacy requirements

- The server verifies every Firebase ID token and derives the UID from the verified token; it never accepts a UID from the client body or URL.
- Cloud routes reject unverified email/password identities; the learner remains in the local path until a refreshed token confirms email verification.
- Firestore document paths are constructed only from verified server identity and allowlisted record types.
- Direct browser Firestore access is denied by deployed Security Rules. Firebase Admin bypasses rules, so server repository tests and schemas remain mandatory.
- The service account receives only the permissions required for Authentication verification and the FaultSmith Firestore data path where practicable.
- Email/password and Google are the only enabled providers; Google authorized domains and email-action continue URLs include only localhost and the reviewed Netlify domains.
- Firebase owns password storage, verification, reset, and provider credentials. FaultSmith's server never receives a password, and client errors never echo one.
- A Firebase password policy is enforced and mirrored through `validatePassword` guidance; email-enumeration protection is enabled and the application does not depend on provider-specific account-existence errors.
- Verification and reset requests use generic responses, bounded retries, cooldowns, and rate controls so the UI does not become an account-discovery or email-flooding oracle.
- Provider collisions and linking require explicit authentication and preserve the verified Firebase UID; no email-string-based or automatic cross-UID merge is permitted.
- Netlify and application-level rate limiting protects auth/progress routes; paid OpenAI routes retain their stricter shared/edge budget controls.
- CSP changes allow only the exact Firebase/Google origins required by the tested auth flow. No wildcard origin is accepted.
- Logs contain route outcome and bounded timing only—never ID tokens, UID values, email, display name, Firebase credential fragments, learner prose, source, or Firestore document contents.
- Error messages never expose Firebase project names, internal document paths, service-account data, or provider stack traces.
- Account and progress deletion are supported. A failed deletion cannot silently claim success.
- The source and client-bundle security scanners receive Firebase-specific regression cases, including service-account/private-key material and public-config false-positive handling.
- App Check may be observed in preview, but enforcement is enabled only after legitimate local, preview, and mobile flows are proven. App Check supplements rather than replaces authentication, server authorization, rules, and rate limiting.

## 10. Reliability and fallback

- Firebase modules initialize lazily and only when configuration is complete.
- Missing or partial configuration must not crash `next build`, static rendering, local startup, health, Guided Roadmap, Practice by Skill, or any fixture workflow.
- Cloud reads have a bounded timeout and never delay challenge startup.
- Local progress is updated before cloud synchronization.
- Failed sync requests remain retryable and visibly local; they do not generate duplicate attempts.
- Signing out or deleting cloud progress never removes the local fallback unless the learner separately chooses **Reset this device**.
- Rollback is configuration-first: disable `NEXT_PUBLIC_FAULTSMITH_CLOUD_PROGRESS` and remove server Firebase credentials. The same reviewed application must continue in local-only mode.
- The validated fixture fallback is never conditional on Firebase status.

## 11. Free-tier boundary

The Firebase Spark plan currently provides no-cost access to most Authentication options and a daily Cloud Firestore quota. Current official documentation lists one free Firestore database per project, 1 GiB storage, 50,000 reads/day, 20,000 writes/day, 20,000 deletes/day, and 10 GiB monthly outbound transfer. These limits are sufficient for submission testing but are quotas, not a guarantee of unlimited free production use. See [Firebase pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans) and [Firestore usage and limits](https://firebase.google.com/docs/firestore/quotas).

The implementation must:

- remain on Spark unless the user explicitly approves billing;
- avoid Cloud Functions, paid backups, PITR, clone, TTL, and unrelated Firebase products;
- monitor Firestore usage during testing;
- cap reads, writes, history size, retries, and sync frequency;
- fail back to local mode if quota is unavailable.

## 12. Testing and quality gates

### 12.1 Unit and contract tests

- Strict parsing of cloud profiles, attempt summaries, tokens, imports, and metrics.
- Version-1 local progress migration remains valid.
- Merge precedence, idempotency, retention cap, and deterministic recommendations.
- No failing assessment creates completion.
- Metric calculations avoid divide-by-zero, score inflation, and penalizing test runs.

### 12.2 Firebase emulator integration

- Authentication and Firestore emulator setup uses a demo project ID so tests cannot mutate production accidentally.
- Valid token reads and writes only the same user's data.
- Missing, invalid, expired-shaped, wrong-project, or cross-user identity is rejected.
- Replayed idempotency keys do not double-count.
- Direct browser Firestore reads and writes are denied by Security Rules.
- Deletion removes only the authenticated user's cloud records.

Firebase identifies the Local Emulator Suite as the preferred environment for local Security Rules testing. See [Firebase Local Emulator Suite](https://firebase.google.com/docs/emulator-suite) and [Firestore Rules testing](https://firebase.google.com/docs/firestore/security/test-rules-emulator).

### 12.3 Browser and accessibility

- Guest can complete the primary guided workflow without Firebase.
- Cloud-configured app still permits **Continue as guest**.
- Email/password account creation, login, verification, resend cooldown, reset, invalid credentials, and sign-out have clear generic states.
- Google sign-in success, cancellation, popup blocking, provider collision/failure, optional linking, and sign-out have clear states.
- Dashboard is keyboard reachable, axe-clean, and usable at 1440 × 900 and 390 × 844.
- Offline/degraded cloud state never loses the current report or progress.
- A clean signed-in browser restores the cloud profile.

### 12.4 Security and release gates

- Lint, typecheck, unit/integration, production build, bundle leakage, source/history scan, dependency audit, Playwright/axe, fallback smoke, production smoke, and primary demo remain green.
- Add explicit scans for Firebase service-account JSON, private keys, bearer tokens, UID leakage in evidence, and unsafe public-secret variables.
- Inspect `.next` to ensure Admin SDK and service credential markers are absent from client bundles.
- Run an independent security/adversarial review and an independent QA/accessibility review on the same candidate SHA.
- Credentialed Firebase preview smoke remains separate from offline CI.

## 13. Implementation roadmap

### Wave 1 — Credential-free domain and dashboard

- Define strict cloud-progress and attempt-summary contracts.
- Preserve and migrate the current local progress schema.
- Implement deterministic metric selectors and dashboard presentation.
- Add unit and accessibility tests with fixture data.

### Wave 2 — Firebase boundary

- Add configuration-gated Firebase Auth client and server-only Firebase Admin modules.
- Add email/password create/login/verify/reset, Google sign-in, sign-out, and same-origin ID-token transport.
- Configure a required Firebase password policy, email-enumeration protection, approved email-action URLs, and explicit provider-collision behavior.
- Add the Firestore repository, progress APIs, assessment persistence, idempotency, retention, and deletion.
- Configure emulators and test cross-user isolation and failure recovery.

### Wave 3 — Synchronization and hardening

- Merge local and cloud progress without data loss or false verification claims.
- Add sync status and deterministic personal insights to the UI.
- Add CSP, rate, secret, bundle, logging, and degraded-mode regressions.
- Run independent product, QA/accessibility, and security reviews and self-heal accepted findings.

### Wave 4 — Credentialed preview and release decision

- The user creates the Firebase Spark project, enables email/password and Google Authentication, configures the password policy and email-enumeration protection, creates Firestore, configures approved domains/action URLs, and privately configures credentials.
- Run one credentialed local Firebase smoke, then a Netlify Deploy Preview smoke after separate deployment approval.
- Verify usage dashboards, no-billing state, rate rules, public guest access, account sync, local fallback, OpenAI live/fallback behavior, and recording layouts.
- Freeze the candidate only if every gate is green.

## 14. Schedule and stop/go gates

### July 19 — Build

- Lock this amendment and GSD execution plans.
- Implement credential-free contracts, metrics, dashboard, Firebase adapters, and emulator tests.
- Keep cloud mode disabled by default.

### July 20 — Integrate and test

- Configure the user's Firebase Spark project privately.
- Run local signed-in, cross-user, degraded-mode, security, accessibility, and full regression gates.
- If green, obtain explicit Netlify preview approval and run production-shaped smoke.

### July 21 — Freeze and submit

- No new functionality after the morning freeze.
- Complete external UAT, fix only reproduced blocker/high defects, record the demo, and finish submission evidence.

### Mandatory fallback decision

If Firebase credentials, email/password auth, Google auth, cross-user isolation, CSP, preview behavior, or full quality gates are not objectively green by the July 20 release cutoff, disable cloud mode and submit the local personalized dashboard on the last known-green baseline. Do not weaken authentication, Firestore authorization, privacy, fallback, or release gates to keep cloud sync enabled.

## 15. Acceptance criteria

1. The final app opens and runs a guided lab without authentication.
2. The dashboard works from current validated local progress with Firebase absent.
3. A learner can create an email/password account, verify it, log in, request a password reset, sign out, and synchronize progress without any FaultSmith server, database, log, or evidence artifact receiving password material.
4. Optional Google sign-in can synchronize the same bounded metrics model across clean browser sessions.
5. Unverified email/password identities cannot use cloud progress; verification resend and password reset are bounded, generic, and do not reveal account existence.
6. Provider collisions never silently create, merge, overwrite, or delete learning profiles; optional linking preserves the authenticated Firebase UID and ships only after dedicated tests pass.
7. The server rejects missing, unverified, invalid, wrong-project, expired, oversized, and cross-user auth attempts.
8. A verified assessment records one idempotent attempt summary and may complete one approved lesson.
9. A failing, abandoned, test-only, or unsubmitted attempt never records completion.
10. Local import is bounded, schema-valid, explicitly marked, and cannot introduce unknown lessons or private learner content.
11. Cloud failure never discards or blocks local progress, challenge execution, assessment, or reports.
12. Personal metrics are correct, deterministic, explained, accessible, and do not claim certification.
13. No Firestore record, log, public DTO, evidence file, or client bundle contains forbidden learner, answer, provider, auth-token, password, or credential data.
14. One user cannot access another user's data; direct browser Firestore access is denied.
15. Cloud history is capped, duplicate writes are idempotent, and free-tier usage is bounded.
16. The validated fixture fallback and zero-token guided lessons remain functional and visibly labeled.
17. The existing OpenAI live path remains optional, server-only, and subordinate to deterministic tests.
18. All unit, emulator integration, route adversarial, E2E/accessibility, build, security, dependency, fallback, production, and primary-demo gates pass on one reviewed SHA.
19. Removing Firebase configuration returns the reviewed local-only app without a code rollback.
20. Netlify preview passes public guest, email/password sync, Google sync, security-header, timeout, rate-control, logging, and responsive-layout checks before production promotion.
21. PRD, roadmap, build log, testing guide, threat model, deployment runbook, demo script, submission draft, and completion report accurately distinguish local, cloud, live OpenAI, and fallback evidence.

## 16. Definition of Finished

This scope is finished only when every acceptance criterion has objective evidence, no accepted blocker/high product, QA, accessibility, privacy, or security finding remains open, and the original fixture fallback plus primary demo remain green.

Cloud synchronization is a release candidate, not a submission dependency. If its external gates are incomplete, the Definition of Finished for the hackathon reverts to the local personalized dashboard and the cloud feature remains disabled. This fail-safe is part of the approved design, not a hidden reduction in quality.

## 17. Explicitly deferred

- Instructor and cohort analytics
- Parent, school, or organization administration
- Phone, school SSO, multi-factor, passwordless email-link, and additional identity providers
- Public profiles, sharing, leaderboards, social features, and competitive scoring
- Formal mastery certification or academic grading
- Raw code/prose storage and instructor access to learner submissions
- Billing, subscriptions, premium tiers, and paid Firebase upgrades
- Firebase Cloud Functions, Cloud Storage, Hosting, BigQuery, and AI Logic
- Additional curriculum content and model-generated roadmap sequencing
