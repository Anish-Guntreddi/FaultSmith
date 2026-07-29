# Phase 1 Independent QA and Accessibility Review

**Review plan:** `01-03`  
**Reviewed implementation SHA:** `506dae90ce3832f4096f5f95a52c996c5335f9f1`  
**Baseline manifest:** `01-01-BASELINE.md`  
**Review date:** July 18, 2026  
**Reviewer conclusion:** No application blocker or high-severity QA finding. One medium duplicate-dispatch finding and one informational evidence-counter mismatch are unresolved. The required in-app manual browser backend was unavailable; that tooling limitation is recorded separately and is not counted as an application finding.

## Baseline isolation

The review used a unique detached worktree, not the moving integration branch:

```text
qa_tmp=$(mktemp -d /tmp/faultsmith-qa.XXXXXX)
rmdir "$qa_tmp"
git worktree add --detach "$qa_tmp" 506dae90ce3832f4096f5f95a52c996c5335f9f1
git -C "$qa_tmp" rev-parse HEAD
```

Result:

```text
HEAD is now at 506dae9 ci(01-01): split independent quality gates
506dae90ce3832f4096f5f95a52c996c5335f9f1
## HEAD (no branch)
```

The main-repository integration invariant was also checked:

```text
git diff --name-only 506dae90ce3832f4096f5f95a52c996c5335f9f1..HEAD -- src tests scripts package.json .github
```

Result: no output. Later integration-branch commits did not alter application, test, script, package, or workflow paths relative to the frozen implementation SHA.

## Automated gate evidence

All commands below ran inside the detached baseline worktree. Durations are `/usr/bin/time -p` real time unless the tool itself reports a suite duration.

| Command | Result | Timing |
| --- | --- | ---: |
| `npm ci` | Passed; 490 packages added, 497 audited, 0 vulnerabilities | 5.26 s |
| `npx playwright install chromium` | Passed | 1.13 s |
| `npm run lint` | Passed; zero reported errors/warnings | 2.25 s |
| `npm run typecheck` | Passed; `tsc --noEmit` | 1.56 s |
| `npm test` | Passed; 7 files, 45 tests | 1.43 s wall; Vitest 729 ms |
| `npm run build` | Passed; Next.js 16.2.10, seven routes, five dynamic API routes | 6.18 s; compile 1.128 s |
| `npm run security:bundle` | Passed; 17 client artifacts inspected | 0.11 s |
| `npm run security:source` | Passed; 98 working-tree files and 19 reachable commits inspected | 0.97 s |
| `npm audit --audit-level=moderate` | Passed; 0 vulnerabilities | 0.50 s |
| `npm run test:e2e` | Passed; 6/6 Playwright tests | 7.21 s wall; suite 6.9 s |

The Playwright test timings were:

| Workflow | Result | Timing |
| --- | --- | ---: |
| Guided failing patch remains incomplete | Passed | 3.3 s |
| Guided verified progress and next-lesson restoration | Passed | 3.5 s |
| 390 × 844 no-overflow recording layout | Passed | 3.6 s |
| Primary Expense Approval workflow with persisted evidence | Passed | 4.1 s |
| Keyboard reachability and axe | Passed | 4.4 s |
| Inventory and Notification secondary workflows | Passed | 5.2 s |

The only process output noise was Node's warning that `NO_COLOR` was ignored because `FORCE_COLOR` was set. It did not affect results.

## Production smoke evidence

The detached worktree's already-built production server started on `127.0.0.1:3113` in 66 ms.

```text
npm run start -- --hostname 127.0.0.1 --port 3113
curl http://127.0.0.1:3113/
curl http://127.0.0.1:3113/api/health
curl -X POST http://127.0.0.1:3113/api/challenges/generate \
  -H 'content-type: application/json' \
  --data '{"projectId":"expense-approval","targetSkill":"Boundary conditions","difficulty":"intermediate","preferLive":true}'
```

| Request | Result | Curl timing |
| --- | --- | ---: |
| `/` | HTTP 200; 20,364 bytes | 0.004867 s |
| `/api/health` | HTTP 200; `status: ok`, `liveOpenAIConfigured: false`, `fixtureFallback: ready` | 0.003669 s |
| `/api/challenges/generate` | HTTP 200; `expense-boundary-v1`, `source: prevalidated`, initial `failed`, no `hints` field | 0.001819 s |

The generation response explicitly said that live GPT-5.6 was unavailable because the server had no API credential. Missing-key recovery therefore preserved and labeled the validated fixture fallback.

## Browser and accessibility matrix

The six repository Playwright tests were supplemented with a read-only production-browser probe against the exact detached SHA. The probe changed no tracked source or tests and was removed with the worktree.

| Area | Evidence | Result |
| --- | --- | --- |
| Primary success | Direct catalog → missing-key fallback → hypothesis → hint → edit → refresh → passing tests → verified report → report refresh | Passed in repository E2E |
| Guided success | Lesson 1 → prevalidated lab → correct repair → 1/9 verified → Lesson 2 recommendation → report/roadmap restoration | Passed in repository E2E and repeated at 390 × 844 |
| Guided failure | Unchanged mutation with adequate prose returned `Repair not verified`; `Lesson remains incomplete`; no learning-progress key | Passed |
| Refresh/report restore | Edited code, hypothesis, explanation, and 1/3 hint restored; completed report restored after reload | Passed |
| Reset | `Reset lab` restored the strict mutation, blanked hypothesis/explanation, reset hints to 0/3, and announced `Lab reset to the validated mutation snapshot.` | Passed |
| New lab | `Choose another system` returned to the roadmap and removed `faultsmith:attempt:v2` | Passed |
| Missing key | Visible and polite-live status announced live unavailability; workspace disclosed `Prevalidated fixture · deterministic verifier` | Passed |
| Injected retry/recovery | First generation request was intercepted with HTTP 503; the UI exposed `Temporary failure` plus `Load the prevalidated challenge`; the second request recovered to the prevalidated workspace | Passed |
| Rapid/duplicate controls | Two same-task DOM click dispatches produced two generation, two execution, and two assessment POSTs | Finding QA-01 |
| Landmarks/headings | Configure and workspace each had one `main` and one `h1`; workspace asides were named `Challenge overview` and `Investigation journal` | Passed |
| Labels | Code editor, hypothesis, root-cause explanation, skill selector, test output, and action controls resolved by accessible role/name | Passed |
| Live regions | One `aria-live="polite"` region announced request/message/error state; visible recovery message used status semantics | Passed |
| Keyboard order | Tab traversal reached mode controls followed by ordered lesson cards; workspace controls were keyboard focusable | Passed |
| Visible focus | Keyboard focus matched `:focus-visible`; explicit 2 px amber ring variables were active on custom mode controls, editor/journal fields exposed amber rings, and remaining buttons retained Chromium's native 1 px focus outline | Passed by computed-style inspection; visual-tool limitation below |
| Axe/contrast | Zero axe violations on configure, workspace, and report; this includes automated color-contrast rules | Passed |
| Reduced motion | With `prefers-reduced-motion: reduce`, forge animation duration computed to `0.01ms`, iteration count to `1`, and root scroll behavior to `auto` | Passed |
| Desktop overflow | At 1440 × 900, configure and workspace `scrollWidth` equaled 1440 | Passed |
| Mobile overflow | At 390 × 844, roadmap, workspace, and report `scrollWidth` each equaled 390; report restored after refresh | Passed |
| Console/runtime | No page exceptions or warning/error console messages in normal flows; one expected failed-resource console entry accompanied the deliberately injected HTTP 503 recovery test | Passed |

The empty alert inserted by Next.js route-announcer infrastructure was ignored when reading the injected-recovery UI; the populated application alert contained `Temporary failure` and the fallback action.

## Findings

### QA-01 — Medium — same-task duplicate dispatch is not single-flight guarded

- **Files:** `src/components/faultsmith-app.tsx` (`forgeChallenge`, `runTests`, `submitAttempt`; buttons rely on later `requestState` rendering)
- **Failure path:** Dispatching `HTMLElement.click()` twice synchronously on Forge, Run tests, or Submit invokes the asynchronous handler twice before React commits the disabled state. The exact production app sent two POSTs to each corresponding endpoint. Ordinary human interaction is substantially mitigated by stage replacement/disabled controls after the first render, so this is not classified high, but adversarial automation, assistive tooling, or unusual event reentrancy can duplicate live provider work and race client state.
- **Evidence:** Request counters were `generate=2`, `execute=2`, and `assess=2` for two same-task click dispatches. Each normal single action still completed successfully.
- **Proposed mitigation:** Add a synchronous single-flight ref checked and set at the beginning of each network action, released in `finally`; alternatively centralize the lock in `postJson`. Preserve the visible disabled state. For assessment, consider a server-recognized attempt id if cross-request idempotency becomes necessary.
- **Regression:** A Playwright test should dispatch two same-task clicks and assert exactly one matching POST and one event-log transition for generation, execution, hint, and assessment.

### QA-02 — Informational — baseline manifest scan counters do not match the independent rerun

- **File:** `.planning/phases/01-release-integration-and-independent-quality-gates/01-01-BASELINE.md`
- **Failure path:** The manifest records 97 working-tree files and 17 reachable commits for `npm run security:source`; the exact detached SHA independently reported 98 and 19. The gate passed and disclosed no finding, so this does not weaken application security, but the immutable evidence counters are not reproducible as written.
- **Evidence:** `npm run security:source` at `506dae90ce3832f4096f5f95a52c996c5335f9f1` printed `Source security scan passed: 98 working-tree files and 19 reachable commits inspected.`
- **Proposed mitigation:** Preserve the original capture but annotate the final phase evidence with the independent counts and explain any counting-environment difference.
- **Regression:** Not applicable; this is evidence reconciliation.

## In-app browser tooling limitation

The required controlled in-app browser was requested after the exact production server was ready. Browser runtime discovery returned no available browser instances (`[]`), and an explicit in-app selection returned `Browser is not available: iab`. The mandated troubleshooting sequence was followed once; the backend remained unavailable. Per the browser-control contract, the review did not substitute another UI backend and did not claim screenshots or a manual in-app visual inspection.

The automated Playwright and supplemental computed-style evidence above still covers both required viewports, axe, keyboard/focus state, contrast rules, reduced motion, flows, persistence, recovery, overflow, and console/runtime errors. However, a human-visible in-app screenshot/appearance pass remains unexecuted due solely to the unavailable backend. This is a review-tool limitation, not an observed FaultSmith application defect.

## Quality-gate conclusion

- **Unresolved application blockers:** 0
- **Unresolved application high findings:** 0
- **Unresolved application medium findings:** 1 (`QA-01`)
- **Unresolved application low findings:** 0
- **Informational findings:** 1 (`QA-02`)
- **Independent automated gates:** Green
- **Primary demo, guided success/failure, persistence, fallback, accessibility automation, and responsive layout:** Green
- **Manual in-app visual sign-off:** Not completed because the in-app browser backend was unavailable

The frozen SHA is suitable for coordinator repair/validation with no QA blocker/high repair required. QA-01 is a contained, low-risk hardening opportunity that should be fixed before final submission if schedule permits, followed by the narrow duplicate-control regression and the full `npm run quality` gate.
