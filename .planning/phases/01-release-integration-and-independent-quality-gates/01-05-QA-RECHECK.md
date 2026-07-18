# Phase 1 Focused QA Recheck

**Decision: APPROVED**  
**Requested revision:** `fee2087f`  
**Resolved and reviewed SHA:** `fee208737b9814eb72b2f7582d0aad4d1a7fab9e`  
**Review date:** July 18, 2026  
**Scope:** QA-01 single-flight repair, guided/catalog usability, repaired copy and labels, accessibility, and narrow layout

## Revision resolution and isolation

The supplied eight-character string `fee2087f` did not resolve as a Git object. `git rev-list --all | rg '^fee2087'` returned exactly one matching repository commit:

```text
fee208737b9814eb72b2f7582d0aad4d1a7fab9e
```

That commit is the current Plan 01-05 finding-disposition revision and contains the QA-01 repair through its ancestors. It was reviewed in a unique detached temporary worktree:

```text
git worktree add --detach /tmp/faultsmith-qa-recheck.YJF9Hn \
  fee208737b9814eb72b2f7582d0aad4d1a7fab9e
git -C /tmp/faultsmith-qa-recheck.YJF9Hn rev-parse HEAD
```

Result:

```text
fee208737b9814eb72b2f7582d0aad4d1a7fab9e
## HEAD (no branch)
```

No application, test, package, workflow, or canonical documentation file was edited during this recheck.

## Commands and results

All commands ran inside the detached worktree. Timings are real wall time unless noted.

| Command | Result | Timing |
| --- | --- | ---: |
| `npm ci` | Passed; 490 packages added, 497 audited, 0 vulnerabilities | 5.74 s |
| `npx playwright install chromium` | Passed | 0.84 s |
| `npx playwright test tests/e2e/faultsmith.spec.ts --grep "network actions remain single-flight under same-tick duplicate activation"` | Passed; 1/1 dedicated regression | 8.14 s wall; test 4.2 s |
| `npx playwright test tests/e2e/faultsmith.spec.ts --grep "primary Expense Approval\|guided roadmap records\|selection and workspace\|narrow recording layout"` | Passed; 4/4 focused workflows | 5.94 s wall; suite 5.5 s |
| `npx vitest run scripts/product-claims.test.mjs` | Passed; 1 file, 2 claims tests | 1.01 s wall; suite 89 ms |
| `npm run lint` | Passed; zero reported errors/warnings | 3.37 s |
| `npm run typecheck` | Passed; `tsc --noEmit` | 1.71 s |

The four focused browser workflows passed individually in 3.2–3.9 seconds:

- Narrow 390 × 844 layout: 3.2 s
- Guided verified progress and next-lesson restoration: 3.6 s
- Primary direct-catalog Expense Approval workflow: 3.7 s
- Keyboard reachability and axe scan: 3.9 s

The only runner noise was the known Node warning that `NO_COLOR` was ignored because `FORCE_COLOR` was set.

## QA-01 repair verification

The dedicated regression performs two synchronous `HTMLElement.click()` activations before React can commit a disabled state. Request listeners count POSTs by API action. The repaired application emitted exactly:

| Action | Duplicate activation | Observed POST count | Result |
| --- | --- | ---: | --- |
| Generate | Two same-tick Forge clicks | 1 | Passed |
| Hint | Two same-tick Reveal hint clicks | 1 | Passed |
| Execute | Two same-tick Run tests clicks | 1 | Passed |
| Assess | Two same-tick Submit clicks | 1 | Passed |

The same test continued through the normal catalog flow: a prevalidated challenge opened, exactly one hint appeared, the corrected snapshot produced six passing tests, and the assessment rendered the verified report. The synchronous per-action request locks therefore close the original reentrancy window without making the controls unusable.

## Usability, copy, accessibility, and responsive evidence

A temporary read-only Playwright spot check rendered the exact app at 1440 × 900 and 390 × 844. It was not added to the repository.

| Check | 1440 × 900 | 390 × 844 |
| --- | --- | --- |
| Guided `Prevalidated lab · no API credits required` copy visible | Passed | Passed |
| `Practice level` fieldset exposed by accessible group name | Passed | Passed |
| `Labels this attempt; the curated fault is selected by system and skill.` visible | Passed | Passed |
| `Live mode asks GPT-5.6 to emit the approved bounded contract. Executed evidence decides whether it ships.` visible | Passed | Passed |
| Axe violations | 0 | 0 |
| Document horizontal overflow | None; 1440 px content in 1440 px viewport | None; 390 px content in 390 px viewport |
| Console warnings/errors and page exceptions | 0 | 0 |

Repository E2E separately reconfirmed:

- the guided Lesson 1 verified path, 1/9 progress write, Lesson 2 recommendation, and refresh restoration;
- the direct catalog primary path, missing-key fixture recovery, hint, edit, run, report, and report restoration;
- keyboard focusability and zero axe violations on selection and workspace;
- editor and submission visibility with no horizontal overflow at 390 × 844.

The product-claims regression also passed, binding the current public narrative to the zero-model-call guided path, exact approved live contract, and practice-level semantics.

## Findings and decision

- Blocker findings: 0
- High findings: 0
- Medium findings: 0
- Low findings: 0
- Informational application findings: 0

**APPROVED.** QA-01 is independently reproduced as fixed at `fee208737b9814eb72b2f7582d0aad4d1a7fab9e`. All requested narrow regressions and usability/accessibility checks are green, with no remaining QA finding in this recheck scope.
