# FaultSmith Testing and Quality Guide

**Last full local checkpoint:** July 18, 2026  
**Environment:** macOS arm64, Node.js 24.9.0, npm 11.6.0, Next.js 16.2.10, Playwright 1.61.1, Chromium  
**External policy:** normal tests make no live OpenAI calls

## Full quality gate

```bash
npm ci
npx playwright install chromium
npm run quality
npm audit --audit-level=moderate
```

The final local run produced:

| Gate | Result |
| --- | --- |
| ESLint | Pass; zero errors/warnings |
| TypeScript `tsc --noEmit` | Pass |
| Vitest | 5 files, 36 tests passed |
| Next.js production build | Pass; seven routes generated, five dynamic API routes |
| Client bundle leakage check | Pass; 17 static artifacts inspected |
| Playwright | 5 tests passed in 5.4 seconds; primary workflow 2.6 seconds |
| npm audit at moderate threshold | Pass; zero vulnerabilities |
| Production startup | Pass; ready on `127.0.0.1:3100` in 71 ms |
| Production root/health/generation smoke | HTTP 200; fallback ready; initial challenge failed as designed |
| GitHub Actions baseline | Pass; public `main` run [29650774197](https://github.com/Anish-Guntreddi/FaultSmith/actions/runs/29650774197) completed successfully |

The earlier final-gate lint failure in the new 404 page and the client-bundle hidden-schema finding were repaired and all downstream gates were rerun. See `docs/BUILD_LOG.md`.

The same quality command is enforced on pushes and pull requests by `.github/workflows/ci.yml` using Node.js 24 and Playwright Chromium. Dependabot separately monitors npm and GitHub Actions dependencies.

## Automated suite map

### Unit and integration tests

Run:

```bash
npm test
```

| Required evidence | Automated evidence |
| --- | --- |
| Schema validation | strict request/file/assessment schemas reject unsupported fields and invalid paths in `routes.test.ts` and workflow tests |
| Hidden-field stripping | generation route response test rejects hidden root/reference keys and solution content |
| Allowlist enforcement | fixture and route tests reject traversal and arbitrary files |
| Original-pass validation | every fixture original snapshot passes; live workflow mock must pass original before proceeding |
| Mutated-fail validation | all nine fixture mutations fail; live workflow mock rejects a non-failing mutation |
| Failure-signature matching | fixture tests and workflow validation require the named expected failure |
| Visible pytest/transcript consistency | every fixture’s visible pytest function count equals its reported passing count |
| Repaired-pass validation | all nine fixture repair snapshots pass |
| Incorrect-patch rejection | unchanged, broad, comment-decoy, syntax-invalid, and dead-code-decoy snapshots fail deterministic verification; only the server-owned prevalidated repair snapshot passes fallback mode |
| Assessment score bounds | Zod bounds every score 0–100; workflow tests parse bounded results |
| Fallback reasoning honesty | challenge-specific causal signal groups—not explanation length—drive provisional fallback reasoning scores; verbose irrelevant prose remains low despite a passing repair |
| Failing tests never verified | workflow and adversarial route tests force `not_verified` |
| Missing-key fallback | route/workflow tests return a labeled prevalidated challenge |
| Malformed model output recovery | mocked invalid plan retries once, then recovers to fixture |
| Semantically invalid model output | expanded allowlist/multiple-root drift is rejected despite valid shape |
| Validation prompt separation | a distinct strict interpretation contract may veto release; it is never called early enough to promote invalid original/mutation evidence |
| Code Interpreter timeout/expiration | mocked timeout/expired runner returns safe fixture recovery evidence |
| Output safety | fake API key, ANSI sequence, local absolute path, and excess output are redacted/truncated |
| Rate limiting | the 31st generation request in a minute receives safe HTTP 429 |
| Prompt injection | injection-shaped learner text remains data and cannot promote failing code or expose a solution |
| Arbitrary command/container ID | strict execute contract rejects both fields |
| Progressive hint separation | challenge payload omits future hints; separate route/schema accepts only the approved non-solution step and safely recovers from unsafe live output |
| Hypothesis evolution | assessment requires a bounded revision trail ending in the submitted hypothesis and returns the revision/time evidence |
| Complete deterministic assessment evidence | exact changed file names and aggregate changed-line count are derived server-side, sent to GPT assessment, returned through the strict schema, and rendered in the report |
| Fixture evidence transparency | workspace and report use mode-aware labels and explicitly disclose server-owned snapshot comparison rather than claiming fresh Python execution |
| Anonymous event privacy | strict local event log caps 100 entries and excludes learner hypotheses/explanations |
| Rate-key abuse | malformed forwarded-address rotation shares the bounded unknown-address bucket |

External OpenAI behavior is represented by injected gateways/mocks in this suite. This proves workflow policy without spending credits; it does not replace the live smoke test below.

### End-to-end browser tests

Run:

```bash
npm run test:e2e
```

The suite starts a separate development server on port 3101 and covers:

1. Complete Expense Approval selection → missing-key recovery → failing evidence → hypothesis → hint → edit → workspace refresh restoration → passing evidence → report → completed-report refresh restoration.
2. An unchanged failing patch remains not verified.
3. Project selection and workspace keyboard reachability plus axe scans with zero violations.
4. Inventory and Notification selection-to-workspace fallback flows.
5. A 390 × 844 workspace with no horizontal overflow and accessible editor/submission controls.

The primary automated workflow completed in 2.6 seconds in fixture mode, well within the under-three-minute demo budget. The previously flaky secondary-project clean-session loop also passed 10 consecutive parallel repetitions before the final full gate.

### Client-bundle leakage regression

Run after `npm run build`:

```bash
npm run security:bundle
```

The script recursively scans `.next/static` and fails if internal root/reference/signature field names, credential markers, or a primary hidden-answer marker appear. This test was added after the adversarial review found that a shared Zod module had retained internal schema field names in a client chunk; the schema now lives in `src/server/mutation-contract.ts` with `server-only` protection.

## Production smoke test

```bash
npm run build
npm run start -- --hostname 127.0.0.1 --port 3100
```

From a second terminal:

```bash
curl -i http://127.0.0.1:3100/
curl -i http://127.0.0.1:3100/api/health
curl -i -X POST http://127.0.0.1:3100/api/challenges/generate -H 'content-type: application/json' --data '{"projectId":"expense-approval","targetSkill":"Boundary conditions","difficulty":"intermediate","preferLive":true}'
```

Final evidence:

- Root: HTTP 200 with production CSP, HSTS, frame denial, nosniff, restrictive permissions/referrer/opener/resource headers, and no `X-Powered-By`.
- Health: `{"status":"ok","liveOpenAIConfigured":false,"fixtureFallback":"ready"}`.
- Generation: HTTP 200, `expense-boundary-v1`, source `prevalidated`, initial status `failed`, no hidden marker.
- Public challenge: three hints are available but no hint text or internal signature is present in the payload.
- Hint delivery: HTTP 200 through the separate contract; missing-key recovery returned only step zero with an explicit prevalidated source.
- Mutated execution: five passed, one failed.
- Repaired execution: six-pass prevalidated evidence; the exact server-owned repair snapshot matched.
- Comment and syntax-error decoys containing the approved repair text remained failed.
- Assessment of the repaired snapshot: completion `verified`, deterministic fallback source, `approvals.py`, one changed line, two hypothesis revisions, and 95 elapsed seconds. The summary explicitly identifies snapshot matching rather than claiming host execution.
- All nine approved project-skill combinations returned HTTP 200 prevalidated failing labs, each without future hint text in its payload.

## Manual UX and accessibility review

Completed in the controlled in-app browser and repeated in Playwright:

- 1440 × 900 intended recording layout: revised journal, separately delivered first hint, forge, workspace, report identity/time/revision evidence, and scroll transitions inspected.
- 390 × 844 mobile viewport: editor, journal, test output, and submission remain usable without horizontal overflow.
- Keyboard: project cards, select, difficulty, forge, file tabs, journal, run, hint, and submit controls are reachable with visible focus treatment.
- Labels and landmarks: one page `h1` per stage, named asides, explicit select/textarea names, live status region, and status text independent of color.
- Contrast: automated axe scans are clean after muted grays and placeholders were raised to WCAG AA contrast.
- Reduced motion: `prefers-reduced-motion` collapses the pulsing animation and disables smooth scrolling.
- Refresh/reset: code, hypothesis, explanation, hints, and completed report restore after refresh; reset restores the validated mutated snapshot; choosing a new system clears the saved attempt.
- Final production reload: report rendered at 390 × 844 with its identity preserved and no horizontal overflow.

## Security review commands

```bash
npm audit --audit-level=moderate
npm ls postcss --all
rg -n --hidden -g '!node_modules/**' -g '!.next/**' -g '!package-lock.json' -g '!*.tsbuildinfo' '(sk-[A-Za-z0-9_-]{12,}|OPENAI_API_KEY\\s*=\\s*[^\\s#]+|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY)' .
rg -n -g '!node_modules/**' -g '!.next/**' '(child_process|execFile|execSync|spawnSync|\\bspawn\\(|\\bexec\\()' .
npm run security:bundle
```

Expected secret-scan hits are limited to the fake key and fake absolute path in the redaction regression test plus the intentionally empty `.env.example`. No host-process execution call exists.

## Controlled live OpenAI smoke test — credential blocked

This check is intentionally separate. It was **not run** at the July 18 checkpoint because `OPENAI_API_KEY` was missing.

With user-provided authorization and a server-only key:

1. Set the key in `.env.local`; confirm it is ignored and never print it.
2. Start a production build and confirm `/api/health` reports `liveOpenAIConfigured: true`.
3. Forge Expense Approval with live mode enabled.
4. Confirm the response source is `generated` and contains only the public schema.
5. Confirm original-pass and mutated-fail/signature evidence before the workspace opens.
6. Run the mutated suite and a repaired suite; confirm execution mode is `code_interpreter`.
7. Submit a correct explanation; confirm assessment source is `gpt-5.6`.
8. Submit failing code with excellent prose; confirm it remains `not_verified`.
9. Inspect server/client logs for provider internals, key fragments, container identifiers, hidden answers, and stack traces.
10. Remove the local credential after testing.

If any live step fails, keep the fallback green, record the exact provider response safely, repair against current official documentation, add a mock regression, and rerun all downstream gates.

## External submission validation still required

- Public deployment and unauthenticated cross-network smoke
- Ongoing public repository and GitHub Actions availability through judging
- Five-person tester study and comprehension result
- Under-three-minute public video review
- Primary Codex `/feedback` Session ID

These external gates require user credentials, authorization, or coordination and are not substituted with local evidence.
