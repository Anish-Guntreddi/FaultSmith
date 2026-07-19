# FaultSmith Deployment and Rollback Runbook

**Status:** prepared, not deployed  
**Target shape:** a Node.js 22+ Next.js 16 server (`.nvmrc` pins Node 24; Firebase Admin 14 requires Node 22+). Netlify is the selected host target for the Phase 01.1 plan; Vercel remains a compatible alternative. Neither is a product requirement.

This runbook starts only after the reviewed local live proof passes. It does not authorize a deployment. The operator must approve the target, account, region, public URL, and any paid credential exposure before a host is changed. No Netlify deployment, preview, or real Firebase project exists yet; nothing below claims otherwise.

## 1. Freeze the candidate

Record the exact Git SHA and require a clean worktree. On that SHA run:

```bash
npm ci
npm run security:source
npm run quality
npm audit --audit-level=moderate
```

Then start the exact production build without a key and run the fallback and production smoke commands documented in `docs/TESTING.md`. Do not promote a SHA whose fallback path is not green.

Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS origin before the production build. Netlify builds also derive this value from the platform-provided `DEPLOY_PRIME_URL`/`URL`; a Netlify build fails closed if no deployment origin exists, and non-loopback production origins must use HTTPS. The production smoke validates the landing shell at `/`, the complete application shell at `/learn`, and both generated social-preview image routes.

## 2. Prove the provider path locally

Place `OPENAI_API_KEY` only in the ignored root `.env.local`; never place it in a `NEXT_PUBLIC_` variable, command argument, committed file, screenshot, recording, or evidence artifact. Confirm only that `/api/health` reports `liveOpenAIConfigured: true`, then run the explicit paid live smoke once. Normal quality commands never invoke live mode.

The Next routes allow 30 seconds and the OpenAI gateway aborts its Code Interpreter work earlier at 20 seconds, leaving the route time to return a safe labeled recovery. Live proof must show generated source, Code Interpreter execution, GPT-5.6 assessment source, failing-patch authority, and fallback recovery without exposing code, prose, raw output, provider IDs, or hidden answers in the evidence record.

## 3. Resolve target controls before public paid use

Do not attach a paid server credential to a publicly reachable multi-instance deployment until these target-specific decisions are recorded:

- Install an edge or shared rate limiter for the four POST routes. The current in-memory limiter is defense in depth, not a global credit-budget control.
- Set platform request-body, concurrency, function-duration, and spend alerts/limits.
- Keep the app unauthenticated for judges, but protect preview environments until the reviewed public candidate is ready.
- Re-evaluate whether the selected Next.js host can replace the current CSP `unsafe-inline` allowances with a supported nonce/hash strategy. Record an explicit residual-risk decision if it cannot be changed safely before judging.
- Configure `OPENAI_API_KEY` as server-only production secret material and restrict access to the smallest operator group.

## 4. Deploy the reviewed SHA

Vercel can run the repository as a standard Next.js project. Pin the production deployment to the reviewed commit; do not deploy an unreviewed working tree. Configure the server-only key through the host secret store. Do not enable authentication, a deployment protection interstitial, or a private network requirement on the final judging URL.

No deployment command should be run from this repository until the user has approved the exact host mutation.

## 5. Verify the public candidate

Run the production smoke against the HTTPS URL and retain only the sanitized evidence manifest:

```bash
npm run smoke:production -- --base-url https://YOUR-APP.example --live --evidence test-results/production-live.json
```

Also verify in a clean browser and from a separate network:

- `/`, `/learn`, `/opengraph-image`, `/twitter-image`, and `/api/health` return HTTP 200 without login or redirect;
- both HTML routes publish their own absolute canonical URL and route-specific Open Graph/Twitter title; the smoke binds canonical and social-image URLs to the exact tested deployment origin;
- HTTPS, HSTS, CSP, frame denial, `nosniff`, referrer, permissions, opener, and resource policies are present; `X-Powered-By` is absent;
- API responses use `Cache-Control: no-store`;
- the primary Expense Approval flow fits 1440 × 900 and 390 × 844 without horizontal overflow;
- generated/live, Code Interpreter, GPT-5.6 assessment, failing-patch rejection, and labeled fallback behavior match the reviewed local proof;
- browser and function logs contain no credential fragments, learner code/prose, raw provider response, provider/container ID, hidden answer, or stack trace;
- the URL and repository remain freely accessible for the complete judging period.

The evidence manifest may contain only schema version, reviewed SHA, origin, UTC timestamp, expected mode, public source/mode labels, stage pass/fail facts, counts, and SHA-256 output digests. Store raw debugging data outside Git and delete it after the issue is resolved.

## 5a. Optional cloud sync — Firebase operator prerequisites (human gate)

Cloud sync is configuration-gated and entirely optional; every step here is performed privately by the operator, never by an agent. The application at the reviewed SHA needs **no code change** to enable or disable it.

**Firebase project setup (Spark plan only — no billing upgrade, Cloud Functions, Storage, Hosting, BigQuery, or AI Logic):**

1. Create a Firebase project on the free Spark plan.
2. Enable **Email/Password** and **Google** sign-in providers in Firebase Authentication; keep one-account-per-email.
3. Enable the required **password policy** and **email enumeration protection**.
4. Restrict **authorized domains** and verification/reset **action URLs** to the reviewed localhost and Netlify origins only.
5. Create **Cloud Firestore** and deploy the repository's deny-all rules: `firebase deploy --only firestore:rules` (browsers must never read or write learning data directly; the server's Admin SDK is the only writer).
6. Create a service account key for the server. Keep it out of source, Git history, logs, screenshots, and evidence.

**Environment configuration (client values are public project metadata; server values are secrets):**

| Variable | Scope | Meaning |
| --- | --- | --- |
| `NEXT_PUBLIC_FAULTSMITH_CLOUD_SYNC` | build/client | `true` enables cloud sync; unset/anything else keeps the app local-only |
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID` | build/client | public Firebase web configuration (identification, not authorization) |
| `FIREBASE_PROJECT_ID` | server-only | project the server verifies tokens against |
| `FIREBASE_SERVICE_ACCOUNT` | server-only secret | the service-account JSON as one environment value; validated structurally in memory and never logged |
| `NEXT_PUBLIC_FAULTSMITH_PROVIDER_LINKING` | build/client | leave unset; UID-preserving provider linking ships only after real-provider proof |

Partial configuration fails safe: the client stays `local_only` and the server reports cloud unavailability without crashing build or startup. CSP and COOP widen automatically — and only — when cloud sync is configured, by the exact empirically proven Firebase/Google origins.

**Free-tier boundary:** Firebase Spark's currently documented quotas are adequate for submission-scale testing, but usage must remain bounded and monitored — one Firestore document per learner, 50 attempt summaries maximum, no unbounded fan-out. Do not describe the free tier as unlimited.

**Netlify specifics:** align the runtime to Node 22+ (Node 24 recommended), configure the two server-only Firebase values as protected environment secrets, add the four `NEXT_PUBLIC_*` values plus the cloud flag to the build environment, and apply edge/shared rate controls to the progress and auth surfaces before public exposure (the in-memory limiter is per-instance defense in depth).

**Cloud-off rollback (tested release behavior, not a documentation claim):** unset `NEXT_PUBLIC_FAULTSMITH_CLOUD_SYNC` and remove the server Firebase values, then rebuild/redeploy the same reviewed SHA. The automated default e2e suite and production smoke prove this configuration serves the local personalized dashboard with baseline security headers byte-identical to the pre-cloud release, no sign-in surface, and zero Firebase network contact. If real Firebase identity, isolation, CSP, preview, or full gates miss the release cutoff, ship exactly this configuration.

## 6. Roll back safely

If the provider path or budget control becomes unsafe, remove the production key and redeploy/restart the same reviewed SHA. FaultSmith then remains functional in visibly labeled, prevalidated fixture mode. Re-run the production smoke with fallback expected.

If the reviewed SHA itself regresses, promote the last known-green deployment through the host's normal immutable rollback mechanism, re-run health/header/fallback smoke, and update the submission URL only if it changed. Never erase repository history or overwrite evidence to hide a failed candidate.

## 7. Availability ownership

Assign one operator to check the public URL, repository, video, and rate/spend dashboard before submission and periodically through judging. A successful deployment is not the final gate: the five-person UAT, public under-three-minute video, primary Codex `/feedback` Session ID, and final strict submission audit remain human/external actions.
