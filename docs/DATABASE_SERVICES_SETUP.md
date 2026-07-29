# FaultSmith Database and Authentication Services Setup

**Last reviewed:** July 19, 2026  
**Target:** Firebase Spark + Firebase Authentication + Cloud Firestore, with Netlify hosting  
**Current state:** Console setup can begin, but Phase 01.1 application code and emulator gates must land before credentials, rules, or a live deployment are connected.

This is the operator checklist for the remaining cloud setup behind FaultSmith's optional accounts and personalized progress. The application must continue to work in guest mode when Firebase is absent, disabled, misconfigured, or unavailable.

> **Secret-safety rule:** Never paste a Firebase service-account key, private key, Firebase ID token, password, OpenAI API key, `.env.local` file, or Netlify secret into chat, a GitHub issue, a screenshot, or a committed file. Firebase's web configuration is public application metadata, but it should still be copied directly from Firebase to the intended environment rather than posted in chat.

## 1. What each service does

| Service | FaultSmith use | Required for guest mode? | Cost plan |
| --- | --- | --- | --- |
| Browser `localStorage` | Immediate guest progress and fallback | Yes; already local | Free |
| Firebase Authentication | Optional email/password and Google identity | No | Spark |
| Cloud Firestore | Optional cross-device profile and bounded attempt metrics | No | Spark quota |
| Firebase Emulator Suite | Credential-free Auth, Firestore, and rules testing | No for users; required for QA | Local/free |
| Firebase Admin SDK | Server-side ID-token verification and Firestore access | Only for cloud sync | Runs on Netlify |
| Netlify | Next.js application and same-origin API hosting | Only for hosted demo | Free plan initially |
| OpenAI API | Later dynamic challenge generation | No; fixtures remain available | Separate account/key |

Do **not** enable Firebase Hosting, App Hosting, Cloud Functions, Cloud Storage, Realtime Database, Analytics, BigQuery, Firebase AI Logic, or Gemini for this milestone. Netlify hosts the application, Firestore stores only bounded learning metadata, and the validated fixture fallback remains the zero-token path.

## 2. Setup order and stop/go boundaries

### Safe to configure now

- [ ] Create a Firebase project on the Spark plan.
- [ ] Register one Firebase web app without enabling Firebase Hosting.
- [ ] Enable email/password Authentication.
- [ ] Enable Google Authentication.
- [ ] Configure the password policy, email-enumeration protection, and email templates.
- [ ] Decide the Firestore location after confirming the intended Netlify Functions region.
- [ ] Create the default Firestore database in production mode.
- [ ] Record only non-secret readiness facts in the handoff checklist at the end of this document.

### Wait until Phase 01.1 code and emulator tests are green

- [ ] Do not generate a service-account private key yet.
- [ ] Do not create `.env.local` Firebase values until `.env.example` contains the final names.
- [ ] Do not deploy Firestore rules until the repository contains the reviewed `firestore.rules` and its emulator tests pass.
- [ ] Do not enable `NEXT_PUBLIC_FAULTSMITH_CLOUD_PROGRESS` in a live environment.
- [ ] Do not add Firebase secrets to Netlify.

### Wait for explicit deployment approval

- [ ] Do not connect or deploy the Netlify site.
- [ ] Do not authorize a Netlify or custom production domain in Firebase.
- [ ] Do not point Firebase email-action links at a production URL.
- [ ] Do not add `OPENAI_API_KEY`; that is an independent Phase 2/live-AI decision.

## 3. Create the Firebase project

1. Open the [Firebase console](https://console.firebase.google.com/).
2. Select **Create a project**.
3. Use a clear display name such as `FaultSmith`.
4. Choose the project ID carefully. Firebase project IDs cannot be changed after creation.
5. Decline Google Analytics for this hackathon project.
6. Finish project creation.
7. Open **Project settings > Usage and billing** and confirm the project is on **Spark** with no Cloud Billing account linked.

Do not upgrade to Blaze for this MVP. Firebase documents no-cost Authentication options and Firestore's Spark quota; monitor usage, but do not attach billing merely to finish local or submission testing. See [Firebase pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans).

### Project check

- [ ] Project display name is recognizable.
- [ ] Project ID was reviewed before creation.
- [ ] Google Analytics is disabled.
- [ ] Billing plan shows Spark.
- [ ] No unnecessary Firebase products are enabled.

## 4. Register the Firebase web application

1. In **Project overview**, select the web icon (`</>`).
2. Use an app nickname such as `faultsmith-web`.
3. Leave **Also set up Firebase Hosting** unchecked.
4. Register the app.
5. Firebase will display a web configuration object. Keep a private operator note containing only these four values:

   - `apiKey`
   - `authDomain`
   - `projectId`
   - `appId`

6. Do not add the values to the repository yet. The implementation will map them to:

   ```dotenv
   NEXT_PUBLIC_FIREBASE_API_KEY=
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=
   NEXT_PUBLIC_FIREBASE_APP_ID=
   NEXT_PUBLIC_FAULTSMITH_CLOUD_PROGRESS=
   ```

Firebase explains that the web configuration object identifies the app/project and is not an authorization secret. Authorization still comes from verified identity, server-side access, and Firestore rules. See [Add Firebase to a web app](https://firebase.google.com/docs/web/setup) and [Firebase configuration objects](https://firebase.google.com/docs/projects/learn-more).

### Web-app check

- [ ] Exactly one intended web app is registered.
- [ ] Firebase Hosting was not enabled.
- [ ] The four public configuration values are stored in a private operator note.
- [ ] No value was committed or pasted into chat.

## 5. Configure Firebase Authentication

Open **Security > Authentication** in the Firebase console and select **Get started** if prompted.

### 5.1 Email/password provider

1. Open **Sign-in method**.
2. Select **Email/Password**.
3. Enable **Email/Password**.
4. Leave **Email link (passwordless sign-in)** disabled.
5. Save.

FaultSmith will use Firebase's client SDK for password entry. Passwords must never pass through a FaultSmith API route or enter FaultSmith storage/logs.

### 5.2 Password policy

Open **Authentication > Settings > Password policy** and use this MVP baseline:

| Setting | Value |
| --- | --- |
| Minimum length | 12 |
| Maximum length | 128 |
| Require lowercase/uppercase/number/symbol | Leave off for the MVP |
| Enforcement mode | Require |

The application plan uses Firebase's `validatePassword` result so the UI can reflect the active server policy. Do not add composition requirements without updating the product copy and real-provider tests. Firebase documents the policy controls in [password authentication for web](https://firebase.google.com/docs/auth/web/password-auth).

### 5.3 Email-enumeration protection

1. Open **Authentication > Settings**.
2. Find **User account management > User actions**.
3. Confirm **Email enumeration protection** is enabled.
4. Keep it enabled.

This supports generic account-creation, login, and reset responses. It also changes some account-discovery/linking behavior, so provider linking remains test-gated and is not part of the primary demo. See [email-enumeration protection](https://cloud.google.com/identity-platform/docs/admin/email-enumeration-protection).

### 5.4 Email verification and password-reset templates

Open **Authentication > Templates** and review:

- **Email address verification**
- **Password reset**

For each template:

- [ ] Sender name is `FaultSmith` or the final project name.
- [ ] Subject clearly identifies the action.
- [ ] Body does not promise grading, certification, or account guarantees.
- [ ] The action/continue URL is left at a safe default until a stable Netlify URL exists.
- [ ] No secret, internal project identifier, or private support address is added to screenshots/evidence.

After the stable Netlify domain is approved, update the continue/action URL and test the link in a real browser. Firebase's user-management guide covers verification and reset emails: [manage Firebase users](https://firebase.google.com/docs/auth/web/manage-users).

### 5.5 Google provider

1. Open **Authentication > Sign-in method**.
2. Select **Google**.
3. Enable the provider.
4. Select the project support email requested by Firebase.
5. Use `FaultSmith` as the public-facing project name if prompted.
6. Save.

The implementation's primary path will use popup sign-in. A redirect fallback ships only after it passes the selected browsers, because third-party storage restrictions require additional setup when the app is hosted outside Firebase. See [Google sign-in for web](https://firebase.google.com/docs/auth/web/google-signin) and [Firebase redirect sign-in guidance](https://firebase.google.com/docs/auth/web/redirect-best-practices).

### 5.6 Authorized domains

Open **Authentication > Settings > Authorized domains**. Add only domains that are actively used:

| Domain | When to add | Notes |
| --- | --- | --- |
| `localhost` | Local real-provider verification | Add it explicitly if it is not already present. Do not include a path or port. |
| Firebase-provided auth domain | Normally created by Firebase | Keep the exact project auth domain. |
| Stable Netlify preview domain | After deployment approval | Add the exact domain used for the real-provider rehearsal. |
| Final Netlify/custom domain | After production approval | Add the exact judging domain. |

Do not authorize wildcards, arbitrary branch-preview domains, another person's localhost tunnel, or every possible `netlify.app` subdomain. Remove temporary preview domains after the submission is frozen.

### 5.7 Account-linking policy

- Keep Firebase's one-account-per-email behavior.
- Do not manually merge or delete identities.
- Do not infer identity ownership from an email string.
- Do not advertise provider linking in the demo unless emulator and real-project collision/link tests pass.
- If the same email collides across Google and password providers, FaultSmith should instruct the learner to use the existing provider and preserve both records unchanged unless a UID-preserving link is proven safe.

### Authentication check

- [ ] Email/password is enabled; email-link sign-in is disabled.
- [ ] Password policy is enforced.
- [ ] Email-enumeration protection is enabled.
- [ ] Verification and reset templates were reviewed.
- [ ] Google is enabled with the intended support email.
- [ ] Only exact, needed authorized domains exist.
- [ ] Provider linking remains off/test-gated for the MVP.

## 6. Create Cloud Firestore

> **Location is effectively permanent.** Confirm the intended Netlify Functions region before completing database creation. Choose a Firestore location close to the server runtime and expected demo users. If the demo and server are US-based, choose an appropriate US location shown by the console; record the choice privately before clicking Create.

1. Open **Databases & Storage > Firestore**.
2. Select **Create database**.
3. Choose **Standard edition**.
4. Use the `(default)` database.
5. Choose **Production mode**, never test mode.
6. Choose the reviewed location.
7. Create the database.
8. Do not create collections or sample documents by hand.

See [Firestore quickstart](https://firebase.google.com/docs/firestore/quickstart) and [Firestore locations](https://firebase.google.com/docs/firestore/locations).

### 6.1 Intended data shape

The server—not the browser—will own these paths:

```text
learningProfiles/{verifiedUid}
learningProfiles/{verifiedUid}/attempts/{serverAttemptId}
```

Firestore must store only bounded learning metadata. It must not store source code, hypotheses, explanations, hint text, raw test output, prompts, passwords, tokens, email addresses, provider responses, or service credentials.

### 6.2 Firestore rules

FaultSmith intentionally denies all direct browser access because the Netlify server verifies the Firebase ID token and performs Firestore operations through the Admin SDK. The reviewed repository rule is expected to be equivalent to:

```text
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Do not paste this into the console and deploy it yet. Wait for the checked-in `firestore.rules`, run its unauthenticated and authenticated emulator-denial tests, and then deploy the repository version. Firebase CLI deployments overwrite console rules, so the repository must remain the source of truth. See [Firebase Security Rules](https://firebase.google.com/docs/rules) and [Firebase CLI deployment](https://firebase.google.com/docs/cli).

### Firestore check

- [ ] Standard edition and `(default)` database are selected.
- [ ] Location was reviewed before creation.
- [ ] Production mode was selected.
- [ ] No sample collections or data were added.
- [ ] Rules were not manually deployed ahead of repository tests.
- [ ] No indexes were manually created; add one only when a reviewed query/test requires it.

## 7. Local Emulator Suite

The emulator path is credential-free and must be proven before live Firebase is connected. Phase 01.1 Plan 02 will add the exact scripts and configuration for:

- demo project ID `demo-faultsmith`;
- Authentication emulator;
- Firestore emulator;
- default-deny Firestore rules tests;
- non-watch `npm run test:firebase` execution;
- Java LTS setup in CI;
- a build that remains green with every Firebase variable absent.

After that plan lands, verify the locally installed toolchain:

```bash
node --version
java -version
npm ci
npm run test:firebase
```

Do not set production Firebase values for emulator tests, and do not use a real project ID. Emulator tests must be safe even when run offline. See [connect the Authentication emulator](https://firebase.google.com/docs/emulator-suite/connect_auth) and [connect the Firestore emulator](https://firebase.google.com/docs/emulator-suite/connect_firestore).

## 8. Server service account — wait until the code is ready

The Firebase web configuration cannot authorize server writes. Netlify will eventually need one server-only service-account credential so the Admin SDK can verify tokens and access Firestore.

Do not generate it until all of these are true:

- [ ] Phase 01.1 server modules are implemented and marked server-only.
- [ ] `.env.example` contains the final reviewed secret variable name.
- [ ] Source and client-bundle secret scanners pass.
- [ ] Emulator identity, isolation, retention, replay, deletion, and rules tests pass.
- [ ] The live Firebase configure-vs-cloud-off checkpoint is approved.

When those gates pass:

1. Open **Project settings > Service accounts**.
2. Confirm the selected Firebase project is the intended Spark project.
3. Generate exactly one new private key only if the reviewed Netlify integration still requires a JSON credential.
4. Save it directly to a secure password manager or secret vault.
5. Transform it only in the way documented by the final `.env.example`/deployment guide. Encoding is transport formatting, not encryption.
6. Add the resulting value directly to the Netlify environment-variable UI; never commit a JSON file.
7. Delete any local downloaded copy after the vault and Netlify values are verified.
8. Record the key creation date and rotation/revocation owner without recording the key itself.

Do not invent the secret variable name in advance. The implementation plan intentionally leaves the exact name to the reviewed server contract. Firebase documents key generation and warns that service-account keys require high security awareness: [Firebase Admin setup](https://firebase.google.com/docs/admin/setup).

If the key is exposed, revoke it immediately in Google Cloud IAM, create a replacement only after the leak path is closed, rotate the Netlify secret, and rerun source/history/bundle scans.

## 9. Local environment configuration — after Phase 01.1 lands

Copy the repository's final `.env.example` to an untracked `.env.local`; do not build the file from this document because the service-secret name is not finalized yet.

The reviewed public/server split will be:

```dotenv
# Browser-visible Firebase web metadata
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Explicit cloud-sync switch; keep false until live verification is approved
NEXT_PUBLIC_FAULTSMITH_CLOUD_PROGRESS=false

# Server-only metadata
FIREBASE_PROJECT_ID=

# Server-only service-account secret
# Use the exact final name added to .env.example by Phase 01.1.

# Independent dynamic-generation key; not needed for fixture testing
OPENAI_API_KEY=
```

Rules:

- All four public Firebase values must be present together or cloud mode must remain `local_only`.
- `NEXT_PUBLIC_FAULTSMITH_CLOUD_PROGRESS=false` is the safe default.
- `FIREBASE_PROJECT_ID` must match the client project ID, but it is server-only metadata.
- The service-account secret must never use a `NEXT_PUBLIC_` prefix.
- Do not store Firebase ID tokens or passwords in environment variables.
- Do not set emulator-host variables in Netlify production.
- Do not place secrets in shell command arguments that could enter terminal history.

## 10. Netlify configuration — after deployment approval

Netlify supports Next.js App Router and Route Handlers through OpenNext. Connect the repository only after the offline/emulator release candidate is frozen and the deployment owner approves the exact branch/SHA. See [Next.js on Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/).

### 10.1 Create/connect the site

1. In Netlify, choose **Add new site > Import an existing project**.
2. Connect the intended GitHub repository.
3. Select the reviewed production branch.
4. Let Netlify detect Next.js settings unless the repository deployment guide specifies an override.
5. Confirm the Node version is compatible with the repository's Node 22-or-newer contract.
6. Do not deploy until environment variables and the exact commit are reviewed.

### 10.2 Add environment variables

Use **Site configuration > Environment variables** or the current equivalent. Add values through the UI, not `netlify.toml` and not the repository.

| Variable group | Visibility | Context |
| --- | --- | --- |
| Four `NEXT_PUBLIC_FIREBASE_*` values | Public at browser build time | Approved preview and production only |
| `NEXT_PUBLIC_FAULTSMITH_CLOUD_PROGRESS` | Public feature flag | `false` by default; `true` only for approved live proof |
| `FIREBASE_PROJECT_ID` | Server environment | Approved preview and production only |
| Final service-account secret | Secret/server only | Approved preview and production only |
| `OPENAI_API_KEY` | Secret/server only | Add separately only when live AI testing is approved |

For secret values:

- Mark them as containing secret values when Netlify offers that control.
- Use deploy-context-specific values where available.
- Do not expose secrets to untrusted pull-request or fork previews.
- On plans without function-only variable scopes, rely on the application's server-only module boundary and bundle/source scans; never use a `NEXT_PUBLIC_` name.
- Trigger a fresh deploy after build-time public values change.

Netlify documents context-specific variables and secret handling in [environment variable overview](https://docs.netlify.com/build/environment-variables/overview/).

### 10.3 Complete Firebase domain setup

Once Netlify provides the stable preview URL:

1. Add its exact hostname to Firebase Authentication authorized domains.
2. Update the Firebase verification/reset action URL if required.
3. Test email verification, reset, Google popup, refresh, and sign-out on that exact domain.
4. Repeat with the final production/custom domain only after production approval.
5. Remove obsolete preview domains after the final submission is frozen.

## 11. Required verification before cloud mode is considered ready

### Guest and fallback

- [ ] With all Firebase variables absent, a guest can start and finish the primary fixture lesson.
- [ ] My Progress works from local evidence.
- [ ] Refresh restores guest progress.
- [ ] Firebase outage/misconfiguration visibly degrades to local saving without losing work.
- [ ] The fixture workflow makes no OpenAI request.

### Email/password

- [ ] Account creation enforces the Firebase password policy.
- [ ] Responses do not reveal whether an email already exists.
- [ ] An unverified password account can continue locally but cannot read/write/delete cloud data.
- [ ] Verification email, resend cooldown, and verification completion work.
- [ ] Password reset always returns a generic confirmation.
- [ ] Login, refresh restoration, recent reauthentication, sign-out, and local fallback work.

### Google and provider collision

- [ ] Google popup works on the selected desktop and mobile-sized browser checks.
- [ ] Popup cancellation returns safely to guest/local mode.
- [ ] Google and verified password users receive the same bounded progress contract.
- [ ] A provider collision gives deterministic safe guidance and does not merge, overwrite, or delete another UID.
- [ ] Linking remains hidden unless UID continuity is proven in emulator and the real project.

### Firestore and server boundary

- [ ] Unauthenticated direct browser Firestore read/write is denied.
- [ ] Authenticated direct browser Firestore read/write is also denied.
- [ ] Netlify server access works only after Firebase ID-token verification.
- [ ] User A cannot read, write, infer, or delete user B's records.
- [ ] Replayed assessment writes are idempotent.
- [ ] Failed assessments never create lesson completion.
- [ ] Attempt history is capped at 50 records.
- [ ] Cloud records contain only the approved bounded metadata.
- [ ] Account data deletion removes the verified user's learning documents and is cross-user isolated.

### Security and release gates

- [ ] Lint, typecheck, unit/integration tests, emulator tests, build, source scan, and bundle scan are green.
- [ ] No Admin SDK or credential marker appears in client bundles.
- [ ] No secret appears in Git history, logs, screenshots, evidence manifests, or browser storage.
- [ ] `/api/health` exposes only `local_only`, `cloud_ready`, or `cloud_degraded`, never configuration values/project identifiers.
- [ ] Keyboard, axe, 1440x900, and 390x844 flows remain green.
- [ ] The final judging URL remains usable without signing in.

## 12. Rollback and cleanup

If live Firebase verification fails or time becomes tight:

1. Set `NEXT_PUBLIC_FAULTSMITH_CLOUD_PROGRESS=false` in the affected Netlify context.
2. Redeploy the reviewed build.
3. Confirm `/api/health` reports local-only readiness and the fixture demo remains green.
4. Remove the service-account secret from Netlify if cloud mode is being abandoned.
5. Revoke the generated service-account key if it is no longer needed.
6. Remove temporary authorized domains and test action URLs.
7. Delete only named test users and their test data after confirming the exact targets.
8. Preserve the guest dashboard, local progress, fixture fallback, and all regression tests.

Do not delete the Firebase project, Firestore database, or broad user/data sets without an explicit destructive-action approval and a reviewed target list.

## 13. Safe readiness handoff

When the console-only steps are complete, report status without sending values. Copy this checklist into a message and replace only the bracketed booleans/labels:

```text
Firebase setup readiness:
- Spark project created: [yes/no]
- Web app registered without Hosting: [yes/no]
- Email/password enabled: [yes/no]
- Password policy enforced: [yes/no]
- Email enumeration protection enabled: [yes/no]
- Verification/reset templates reviewed: [yes/no]
- Google provider enabled: [yes/no]
- Localhost authorized if needed: [yes/no]
- Firestore Standard default database created in production mode: [yes/no]
- Firestore location category: [US/Europe/Asia/other; no project ID]
- Firestore rules deployed: no (expected until emulator gate)
- Service-account key generated: no (expected until server gate)
- Netlify connected/deployed: no (expected until deployment approval)
- Any blocking console error: [generic description only]
```

Do not include the Firebase project ID, API key, auth domain, app ID, service-account email, private key, downloaded filename, UID, test-user email, or Netlify secret in the handoff.

## 14. Definition of setup-ready

The services are setup-ready—not release-ready—when:

- the Firebase Spark project and web app exist;
- email/password and Google providers are securely configured;
- password policy, enumeration protection, and email templates are reviewed;
- the Firestore Standard default database exists in production mode in the intended region;
- no service key or production environment value was exposed;
- live rules, credentials, feature enablement, and deployment remain gated on the Phase 01.1 emulator/security implementation;
- guest mode and the validated fixture fallback remain the release path if any cloud gate fails.

Release-ready status requires every verification item in Section 11 plus the broader FaultSmith quality gates in `docs/TESTING.md` and the deployment approval in `docs/PERSONALIZED_LEARNING_PRD.md`.
