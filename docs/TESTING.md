# FaultSmith Testing and Quality Guide

**Last full local checkpoint:** July 19, 2026 (public landing, `/learn` separation, and expanded production surface)
**Environment:** macOS arm64, Node.js 24.9.0, npm 11.6.0, Next.js 16.2.10, Playwright 1.61.1, Chromium, Temurin JDK 24 for Firebase emulators  
**External policy:** normal tests make no live OpenAI calls and never contact real Firebase

## Full quality gate

```bash
npm ci
npx playwright install chromium
npm run security:source
npm run quality
npm audit --audit-level=moderate
```

`npm run quality` now includes `npm run test:firebase` (Firestore-rules and cloud-persistence integration against local emulators), and `npm run test:e2e:firebase` runs the browser account/sync suite against the same emulators. Both require a Java 21+ JDK and pin the fake `demo-faultsmith` project with a fake API key, so they can never contact real Firebase.

The current Phase 01.1 offline candidate run produced (exact-SHA evidence, including the frozen runtime SHA and the three independent final reviews, is recorded in `.planning/phases/01.1-personalized-learner-accounts-cloud-progress-and-metrics-dashboard/`):

| Gate | Result |
| --- | --- |
| ESLint | Pass; zero errors/warnings |
| TypeScript `tsc --noEmit` | Pass |
| Vitest | 21 files, 281 tests passed |
| Firebase emulator vitest (`test:firebase`) | 2 files, 23 tests passed (deny-all rules across five identity states; same-user/cross-user, idempotency, retention, one-time import, deletion) |
| Next.js production build | Pass |
| Client bundle leakage check | Pass; 24 production artifacts inspected with no protected marker |
| Playwright default suite | 20 passed (16 Firebase-mode tests correctly env-gated) |
| Playwright Firebase emulator suite (`test:e2e:firebase`) | 16 scenarios passed |
| npm audit at moderate threshold | Pass; zero vulnerabilities |
| Source/history security scan | Pass; full working tree plus all reachable history inspected with no matched value printed (exact per-run counts are recorded in the SHA-bound phase review reports) |
| Fallback + production smoke | Pass on the frozen candidate; cloud-off headers byte-identical to the pre-Phase-01.1 baseline |

## Forensic Workbench checkpoint

The design pass was verified after the private Firebase operator environment had been connected:

| Gate | Result |
| --- | --- |
| ESLint / TypeScript | Pass; zero errors or warnings |
| Vitest | 20 files, 272/272 passed |
| Firebase emulator integration | 2 files, 23/23 passed using Temurin 24 |
| Production build | Pass on Next.js 16.2.10 |
| Client bundle leakage | Pass; 21 artifacts inspected |
| Standard browser + accessibility | 13 passed; cloud-off env is explicitly injected by `playwright.config.ts` so ignored real local values cannot make this deterministic rollback suite cloud-on |
| Firebase emulator browser suite | 16/16 passed, including email/password, Google emulator popup, persistence, privacy, keyboard, axe, password-manager, and 1440×900 / 390×844 overflow coverage |
| Dependency audit | Zero vulnerabilities at moderate threshold |
| Visual state review | Roadmap, skill practice, progress/account sync, failing workspace, patched workspace, not-verified report, and verified report reviewed at desktop and mobile; one clipped mobile mode tab reproduced and repaired |

The direct `npm run security:source` command intentionally failed closed because a real credential-bearing ignored `.env.local` is currently present for the human Firebase checkpoint; it printed only rule/path/line identifiers and no matched value. Without reading, editing, moving, or deleting that operator file, the same current source tree was copied to an isolated scan root excluding only `.env.local`; 568 source files and all 65 reachable commits passed. The canonical direct working-tree gate must be rerun after the user privately omits/removes live credentials during the cloud-off rollback checkpoint.

The standard Playwright config now forces cloud-off variables in its child server. Real/emulator cloud proof continues to use the dedicated Firebase config, preventing a developer's local environment from silently changing which product mode a test claims to cover.

## Debugging Case File animation checkpoint

| Gate | Result |
| --- | --- |
| ESLint / TypeScript | Pass; zero errors or warnings |
| Vitest | 20 files, 272/272 passed |
| Firebase emulator integration | 2 files, 23/23 passed with Temurin 24 |
| Production build | Pass; GSAP core and ScrollTrigger emitted as dynamically requested split chunks |
| Client bundle leakage | Pass; 23 artifacts inspected, with no fixture marker allowlist or scan weakening |
| Standard browser + accessibility | 18/18 passed; 16 Firebase-only scenarios correctly skipped |
| Firebase emulator browser suite | 16/16 passed |
| Dependency audit | Zero vulnerabilities at moderate threshold |
| Credential-free source/history scan | Complete post-self-heal source and reachable history passed in an isolated copy excluding only the ignored live Firebase `.env.local`; the direct scan remains intentionally blocked by that operator file |
| Visual review | Desktop Observe and Verify plus mobile static recovery reviewed at 1440×900 and 390×844; mobile content width 380 ≤ viewport 390 |

The five story regressions prove semantic chapter order, deferred desktop enhancement, forward/back stage selection, mobile static behavior, reduced-motion static behavior, desktop-enhanced→mobile teardown, and runtime reduced-motion teardown. The last two assert visible Observe content, computed opacity `1`, and no stale inline opacity/transform on stages or monitor. Existing primary-demo coverage also proves that practice controls precede the narrative, the Expense Approval fallback workflow remains complete, and continuous Forge pulse is absent while idle.

The motion review approved the final implementation after two self-heals: stale GSAP teardown styles that blanked the mobile monitor were reproduced and repaired, then permanent `will-change` promotion was reduced from every code line to the monitor plus four stage layers. No animation test relies on transient transform matrices.

The first remote browser run then found two CI-only reload failures outside the animation component. The durable-state repair writes learner-edited files and prose synchronously at each input boundary, holds the mode controls until the queued local progress/history restore finishes, and restores the two evidence keys independently. The primary-demo and verified-dashboard tests assert their exact browser-storage snapshots before reload; those two scenarios passed 20/20 repetitions with the CI two-worker profile, followed by the complete 18-scenario standard suite and 16-scenario Firebase emulator suite.

## Public landing and route-separation checkpoint

The judge-facing story is served at `/`; the complete learning application is served at `/learn`. The dedicated landing regression proves:

- all five product calls-to-action resolve to `/learn`, and the application brand returns to `/`;
- the public story, navigation, and learning product produce no page or console error during the route round trip;
- both pages are axe-clean and overflow-free at 1440×900 and 390×844;
- a 1280×600 desktop remains static/non-sticky for the Debugging Case File, preventing the enhanced monitor from exceeding a short viewport;
- `/` and `/learn` publish distinct absolute canonical URLs plus route-specific Open Graph/Twitter titles;
- `/opengraph-image` and `/twitter-image` return non-empty generated PNG assets;
- the landing source does not contain any curated allowlisted file identity, expected failure test/signature, hidden root cause/reference, repair/fault snippet, or progressive hint;
- metadata origin resolution prefers the configured canonical site, derives Netlify preview/production origins, rejects missing Netlify origins, and rejects non-HTTPS public production origins.

The expanded production smoke now rejects a deployment unless `/` contains the landing shell, `/learn` contains the distinct learning shell, both HTML routes carry the complete reviewed security-header set (including only `same-origin` or the reviewed Firebase/Google-popup `same-origin-allow-popups` COOP values), their canonical/Open Graph/Twitter image URLs are absolute and bound to the tested origin, both social-image routes return bounded PNGs, `/api/health` remains no-store, and the complete fallback API lifecycle passes.

Final landing-candidate evidence: ESLint and TypeScript passed; 21 Vitest files / 281 tests passed; Firebase emulator integration passed 23/23; the Next.js build generated `/`, `/learn`, five challenge/health routes plus progress, and both social-image routes without warnings; the leakage scan passed 24 artifacts; the complete default browser gate passed 20/20 with 16 Firebase scenarios correctly skipped; the dedicated Firebase browser gate passed 16/16; production fallback and the expanded production surface smoke passed; audit found zero vulnerabilities. The ignored operator `.env.local` correctly blocks the direct source scan without printing values. An isolated copy of the exact current tree excluding only that private file passed the source/history scan across 200 working-tree files and 68 reachable commits.

The earlier Phase 2 run below is preserved as historical evidence:

| Gate | Result |
| --- | --- |
| ESLint | Pass; zero errors/warnings |
| TypeScript `tsc --noEmit` | Pass |
| Vitest | 13 files, 126 tests passed |
| Next.js production build | Pass; seven routes generated, five dynamic API routes |
| Client bundle leakage check | Pass; 17 static artifacts inspected |
| Playwright | 7 tests passed in 6.6 seconds; primary workflow 3.5 seconds |
| npm audit at moderate threshold | Pass; zero vulnerabilities |
| Source/history security scan | Pass; current Phase 2 working tree inspected 139 files/38 reachable commits without printing matched values; prior frozen-candidate counts remain in the build log |
| Production startup | Pass; ready on `127.0.0.1:3122` in 74 ms |
| Production root/health/full fallback API smoke | Pass on runtime SHA `5fcae2713e44`; HTTP 200 HTML shell, reviewed headers, API `no-store`, explicit missing-key Code Interpreter recovery, intended fail → repaired pass → verified assessment, failing snapshot → `not_verified` |
| Release-readiness tooling | 63 focused tests pass across strict lifecycle/evidence, explicit-live CLI, production surface, and submission/UAT validation |
| GitHub Actions Phase 1 evidence | Pass; evidence head `71f2379` completed all four required checks in [run 29658002877](https://github.com/Anish-Guntreddi/FaultSmith/actions/runs/29658002877) |
| GitHub Actions Phase 2 offline checkpoint | Pass; exact head `953821e` completed Static analysis, Unit and integration, Build and security, and Browser and accessibility in [run 29671442532](https://github.com/Anish-Guntreddi/FaultSmith/actions/runs/29671442532) |
| GitHub Actions baseline | Pass; public `main` run [29650774197](https://github.com/Anish-Guntreddi/FaultSmith/actions/runs/29650774197) completed successfully |

The earlier final-gate lint failure in the new 404 page and the client-bundle hidden-schema finding were repaired and all downstream gates were rerun. See `docs/BUILD_LOG.md`.

Equivalent gates are independently visible on pushes and pull requests as `Static analysis`, `Unit and integration`, `Build and security`, and `Browser and accessibility` in `.github/workflows/ci.yml`, using Node.js 24 and Playwright Chromium. Dependabot separately monitors npm and GitHub Actions dependencies.

## Release-readiness commands

Start an already-built server without a key, then run:

```bash
npm run smoke:fallback -- --base-url http://127.0.0.1:3122 --evidence test-results/offline-lifecycle.json
npm run smoke:production -- --base-url http://127.0.0.1:3122 --evidence test-results/offline-production.json
npm run readiness:prepare
```

Fallback and production smoke validate seven public lifecycle stages, both HTML routes, both generated social images, and the production header/cache surface. The evidence writer is opt-in, exclusive/non-overwriting, symlink-safe, and limited to ignored `test-results/`. Evidence contains no code, hint text, learner prose, raw output, credential, provider/container ID, or hidden answer.

`npm run smoke:live -- --base-url http://127.0.0.1:3122 --evidence test-results/live.json` is the only provided paid proof. It refuses to POST unless the explicit live flag is present and health reports `liveOpenAIConfigured: true`; no key argument is accepted. `npm run quality` and GitHub CI never invoke it.

`npm run readiness:prepare` exits zero only when remaining findings are recognized external placeholders/pending observations. Malformed or privacy-unsafe results remain fatal. `npm run readiness:strict` remains intentionally non-zero until the public demo/video, feedback ID, and actual five-person result are complete.

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
| Assessment authority and disclosure | live model input excludes hidden root/reference/repair/hints; strict output permits only three bounded scores; server owns prose/completion/minimality and drops unexpected provider fields |
| Fallback reasoning honesty | challenge-specific causal signal groups—not explanation length—drive provisional fallback reasoning scores; verbose irrelevant prose remains low despite a passing repair |
| Failing tests never verified | workflow and adversarial route tests force `not_verified` |
| Missing-key fallback | route/workflow tests return a labeled prevalidated challenge |
| Malformed model output recovery | mocked invalid plan retries once, then recovers to fixture |
| Semantically invalid model output | expanded allowlist/multiple-root drift is rejected despite valid shape |
| Validation prompt separation | a distinct strict interpretation contract may veto release; it is never called early enough to promote invalid original/mutation evidence |
| Code Interpreter timeout/expiration | mocked timeout/expired runner returns safe fixture recovery evidence |
| Output safety | common credential/auth/private-key families, cross-platform home paths, terminal controls, provider IDs, and excess output are redacted before truncation |
| Request body limit | malformed lengths fail early; streamed bodies cancel at 80,001 bytes; exactly 80,000 bytes and split multibyte input are accepted |
| Rate limiting | the 31st same-client request receives safe HTTP 429; a separate 300/scope process budget bounds valid-address churn |
| Prompt injection | injection-shaped learner text remains data and cannot promote failing code or expose a solution |
| Arbitrary command/container ID | strict execute contract rejects both fields |
| Progressive hint separation | challenge payload omits future hints; separate route/schema accepts only the approved non-solution step and safely recovers from unsafe live output |
| Hypothesis evolution | assessment requires a bounded revision trail ending in the submitted hypothesis and returns the revision/time evidence |
| Complete deterministic assessment evidence | exact changed file names and aggregate changed-line count are derived server-side; an overbroad live repair stays `not_verified` even when mocked Code Interpreter tests pass |
| Release smoke strictness | exact response key/type/bound validation, URL/redirect safety, explicit missing-key recovery, source/mode drift, failing-patch authority, exact approved hint, output digests, tamper-resistant evidence relationships, and exclusive/symlink-safe writes |
| Production surface | fake-server coverage for HTML identity, auth/status drift, reviewed CSP/HSTS/frame/MIME/referrer/permissions/opener/resource policies, powered-by absence, contradictory cache policy, timeout budgeting, and contained evidence |
| Submission/UAT honesty | pending vs strict behavior, exact anonymous tester set, 5-person/4-of-5 thresholds, blocker/high resolution/retest, privacy-field rejection, malformed inputs, links, disclosures, and placeholders |
| Fixture evidence transparency | workspace and report use mode-aware labels and explicitly disclose server-owned snapshot comparison rather than claiming fresh Python execution |
| Anonymous event privacy | strict local event log caps 100 entries and excludes learner hypotheses/explanations |
| Rate-key abuse | malformed forwarded addresses share one bucket and valid-address rotation hits the independent per-process scope budget; cross-instance edge limiting remains a deployment gate |
| Guided registry integrity | three phases contain nine unique ordered lessons, and every lesson maps to exactly one approved project-skill fixture |
| Guided progress safety | strict parsing discards unknown, malformed, duplicate, oversized, or learner-text-shaped completion entries |
| Deterministic recommendations | weak verified attempts recommend reinforcement; strong attempts advance to the next unlocked lesson without a model call |

External OpenAI behavior is represented by injected gateways/mocks in this suite. This proves workflow policy without spending credits; it does not replace the live smoke test below.

### End-to-end browser tests

Run:

```bash
npm run test:e2e
```

The suite starts a separate development server on port 3101 and covers:

1. Complete direct-catalog Expense Approval selection → missing-key recovery → failing evidence → hypothesis → hint → edit → refresh restoration → passing evidence → report → completed-report restoration.
2. Complete guided Lesson 1 → zero-token fixture launch → verified repair → bounded progress → deterministic Lesson 2 recommendation → report and roadmap restoration.
3. Prove that an unchanged failing guided patch remains not verified and records no curriculum progress.
4. Guided selection, direct catalog, and workspace keyboard reachability plus axe scans with zero violations.
5. Inventory and Notification selection-to-workspace fallback flows.
6. Same-tick duplicate activation of generation, execution, hint, and assessment produces exactly one POST per action.
7. A 390 × 844 workspace with no horizontal overflow and accessible editor/submission controls.

The primary automated workflow completed in 3.5 seconds in fixture mode, well within the under-three-minute demo budget. The guided success workflow completed in 3.2 seconds. All seven workflows passed together in 6.6 seconds.

### Client-bundle leakage regression

Run after `npm run build`:

```bash
npm run security:bundle
```

The script parses the server fixture registry without importing or executing it, derives 63 root/reference/fixed/mutation/hint markers across all nine fixtures, then scans `.next/static` for those values plus internal field and credential markers. Failures print only artifact paths and stable rule IDs. The gate passed across 17 production artifacts.

## Production smoke test

```bash
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3122 npm run build
npm run start -- --hostname 127.0.0.1 --port 3122
```

From a second terminal:

```bash
npm run smoke:fallback -- --base-url http://127.0.0.1:3122
npm run smoke:production -- --base-url http://127.0.0.1:3122
```

Latest Phase 2 offline evidence on runtime SHA `5fcae2713e449dd0a7bc73c0a4858f476d60a7a1`:

- Root: HTTP 200 with production CSP, HSTS, frame denial, nosniff, restrictive permissions/referrer/opener/resource headers, and no `X-Powered-By`.
- Health: `{"status":"ok","liveOpenAIConfigured":false,"fixtureFallback":"ready"}`.
- Generation: HTTP 200, `expense-boundary-v1`, source `prevalidated`, initial status `failed`, no hidden marker.
- Public challenge: three hints are available but no hint text or internal signature is present in the payload.
- Hint delivery: HTTP 200 through the separate contract; missing-key recovery returned only step zero with an explicit prevalidated source.
- Mutated execution: five passed, one failed.
- Repaired execution: six-pass prevalidated evidence; the exact server-owned repair snapshot matched.
- Comment and syntax-error decoys containing the approved repair text remained failed.
- Assessment of the repaired snapshot: completion `verified`, deterministic fallback source, and prevalidated execution mode. The summary explicitly identifies snapshot matching rather than claiming host execution.
- All nine approved project-skill combinations returned HTTP 200 prevalidated failing labs, each without future hint text in its payload.
- Production smoke additionally required a real `text/html` FaultSmith shell, rejected redirect/auth masking, enforced the reviewed CSP/HSTS/cache policy, and reserved 35 seconds for the route lifecycle so it does not undercut the documented 20-second provider/30-second route ordering.

## Manual UX and accessibility review

The earlier guided-MVP appearance pass used the controlled browser and was repeated in Playwright. During the frozen-SHA QA review the in-app backend was unavailable, so that limitation was recorded without substituting it for application evidence. The coordinator then repeated the primary guided workflow against the exact remediated candidate in the in-app browser and production server: the one-line threshold repair produced 6/6 passing fixture evidence, deterministic verification, visible prevalidated disclosure, and persisted `1/9` roadmap progress. Runtime logs contained no warnings or errors. Exact-SHA Playwright and computed-style probes additionally covered both required viewports:

- 1440 × 900 intended recording layout: revised journal, separately delivered first hint, forge, workspace, report identity/time/revision evidence, and scroll transitions inspected.
- 390 × 844 mobile viewport: editor, journal, test output, and submission remain usable without horizontal overflow.
- Keyboard: project cards, select, difficulty, forge, file tabs, journal, run, hint, and submit controls are reachable with visible focus treatment.
- Labels and landmarks: one page `h1` per stage, named asides, explicit select/textarea names, live status region, and status text independent of color.
- Contrast: automated axe scans are clean after muted grays and placeholders were raised to WCAG AA contrast.
- Reduced motion: `prefers-reduced-motion` collapses the pulsing animation and disables smooth scrolling.
- Refresh/reset: code, hypothesis, explanation, hints, and completed report restore after refresh; reset restores the validated mutated snapshot; choosing a new system clears the saved attempt.
- Final production browser: the verified report rendered at 1440 × 900 and 390 × 844 with one `h1`, one `main`, identity/progress preserved, explicit prevalidated disclosure, and no horizontal overflow (`1430 ≤ 1440`; `380 ≤ 390`).
- Forensic Workbench review: graphite/amber/cyan hierarchy, system-sans instructional copy, monospace instrumentation, selected/raised panels, the four-step investigation rail, roadmap phase sequencing, progress/account state distinction, and verified/not-verified evidence authority were checked in the controlled browser. No remote font, animation framework, image asset, or new CSP origin was introduced.

## Security review commands

```bash
npm audit --audit-level=moderate
npm ls postcss --all
npm run security:source
npm run security:bundle
```

The source gate scans working-tree and reachable-history text, lock/auth forms, large tracked files, symlinks, public secret environment names, and non-test application host-process APIs. Findings disclose only rule, path, line, and commit metadata. Deliberate sanitizer values are runtime-built or exactly allowlisted; a green scan reports no matched value. No application host-process execution call exists.

## Controlled live OpenAI smoke test — credential checkpoint

This check is intentionally separate. It was **not run** at the July 18 checkpoint because `OPENAI_API_KEY` was missing.

With user-provided authorization and a server-only key:

1. Set the key in `.env.local`; confirm it is ignored and never print it.
2. Start the reviewed production build and confirm only that `/api/health` reports `liveOpenAIConfigured: true`.
3. Run `npm run smoke:live -- --base-url http://127.0.0.1:3122 --evidence test-results/live.json`.
4. Confirm the response source is `generated` and contains only the public schema.
5. Confirm original-pass and mutated-fail/signature evidence before the workspace opens.
6. Run the mutated suite and a repaired suite; confirm execution mode is `code_interpreter`.
7. Submit a correct explanation; confirm assessment source is `gpt-5.6`.
8. Submit failing code with excellent prose; confirm it remains `not_verified`.
9. Inspect server/client logs for provider internals, key fragments, container identifiers, hidden answers, and stack traces.
10. Stop the server and remove the local credential privately before source/history scanning. Do not ask an agent to inspect, print, edit, or delete it.

If any live step fails, keep the fallback green, record the exact provider response safely, repair against current official documentation, add a mock regression, and rerun all downstream gates.

## Phase 01.1 account and cloud gates — implemented (emulator-proven)

All required credential-free coverage now exists and passes; run it with:

```bash
npm run test:firebase       # rules + cloud persistence integration (emulators)
npm run test:e2e:firebase   # 16-scenario browser account/sync suite (emulators)
```

On this workstation the default JVM is too old for firebase-tools; select a modern JDK first, e.g. `export JAVA_HOME=$(/usr/libexec/java_home -v 24)`.

Implemented and passing evidence:

- public guest access with Firebase absent, partial, degraded, and disabled — default e2e proves the cloud-off build offers no sign-in surface, renders the local dashboard, and makes zero requests to any Firebase/Google origin;
- email/password creation with Firebase password-policy checks and confirm-mismatch handling, verification-pending local continuity, verified login, resend cooldown, generic password reset, and sign-out;
- a persisted-state leak scenario proves no password, token, email, UID, or provider material enters FaultSmith localStorage; the source scanner's `password-boundary` rule (now directly unit-tested) blocks password material from server/persistence code paths;
- email-enumeration-resistant account states: unknown-user, wrong-password, and already-registered outcomes share one generic message, and reset always reports generic success;
- Google popup success, cancellation, and popup-block degradation; provider collisions produce safe existing-method guidance; UID-preserving linking stays behind the default-off `NEXT_PUBLIC_FAULTSMITH_PROVIDER_LINKING` capability flag until real-provider proof exists, and a link attempt that would change the UID signs out and reports `link_unavailable`;
- unverified-token denial, wrong-project/expired/oversized/malformed token denial, same-UID success, two-UID isolation, direct-client Firestore denial for every identity state, SHA-256 idempotency with replay collapse, 50-attempt retention, one-time bounded import (409 replay), and explicit deletion plus recent-auth-gated account deletion;
- Playwright/axe/keyboard/password-manager/responsive coverage at 1440 × 900 and 390 × 844 in both the default and Firebase-mode suites, including an announced "Continue as guest" confirmation;
- cloud-on-emulator and cloud-off complete gates (quality, fallback, production, bundle, source, audit, primary demo) green on one frozen candidate SHA, recorded with the independent review reports in `.planning/phases/01.1-personalized-learner-accounts-cloud-progress-and-metrics-dashboard/`.

Real Firebase evidence remains a separate human checkpoint. It must prove both verified email/password and Google account paths, email-action URLs, provider-collision behavior, clean-session sync, cross-user isolation, safe logs, bounded usage, and configuration-off rollback without recording any email, UID, password, token, project value, or document content. Emulator proof above is never presented as real-provider proof.

## External submission validation still required

- Public deployment and unauthenticated cross-network smoke
- Ongoing public repository and GitHub Actions availability through judging
- Five-person tester study and comprehension result
- Under-three-minute public video review
- Primary Codex `/feedback` Session ID

These external gates require user credentials, authorization, or coordination and are not substituted with local evidence.
