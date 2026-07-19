# FaultSmith Deployment and Rollback Runbook

**Status:** prepared, not deployed  
**Target shape:** a Node.js Next.js 16 server; Vercel is the recommended compatible host, but is not a product requirement.

This runbook starts only after the reviewed local live proof passes. It does not authorize a deployment. The operator must approve the target, account, region, public URL, and any paid credential exposure before a host is changed.

## 1. Freeze the candidate

Record the exact Git SHA and require a clean worktree. On that SHA run:

```bash
npm ci
npm run security:source
npm run quality
npm audit --audit-level=moderate
```

Then start the exact production build without a key and run the fallback and production smoke commands documented in `docs/TESTING.md`. Do not promote a SHA whose fallback path is not green.

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
npm run smoke:production -- --base-url https://YOUR-APP.example --live
```

Also verify in a clean browser and from a separate network:

- root and `/api/health` return HTTP 200 without login or redirect;
- HTTPS, HSTS, CSP, frame denial, `nosniff`, referrer, permissions, opener, and resource policies are present; `X-Powered-By` is absent;
- API responses use `Cache-Control: no-store`;
- the primary Expense Approval flow fits 1440 × 900 and 390 × 844 without horizontal overflow;
- generated/live, Code Interpreter, GPT-5.6 assessment, failing-patch rejection, and labeled fallback behavior match the reviewed local proof;
- browser and function logs contain no credential fragments, learner code/prose, raw provider response, provider/container ID, hidden answer, or stack trace;
- the URL and repository remain freely accessible for the complete judging period.

The evidence manifest may contain only schema version, reviewed SHA, origin, UTC timestamp, expected mode, public source/mode labels, stage pass/fail facts, counts, and SHA-256 output digests. Store raw debugging data outside Git and delete it after the issue is resolved.

## 6. Roll back safely

If the provider path or budget control becomes unsafe, remove the production key and redeploy/restart the same reviewed SHA. FaultSmith then remains functional in visibly labeled, prevalidated fixture mode. Re-run the production smoke with fallback expected.

If the reviewed SHA itself regresses, promote the last known-green deployment through the host's normal immutable rollback mechanism, re-run health/header/fallback smoke, and update the submission URL only if it changed. Never erase repository history or overwrite evidence to hide a failed candidate.

## 7. Availability ownership

Assign one operator to check the public URL, repository, video, and rate/spend dashboard before submission and periodically through judging. A successful deployment is not the final gate: the five-person UAT, public under-three-minute video, primary Codex `/feedback` Session ID, and final strict submission audit remain human/external actions.
