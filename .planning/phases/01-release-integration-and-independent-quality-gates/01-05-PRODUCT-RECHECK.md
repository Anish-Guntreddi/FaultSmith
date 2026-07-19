# Plan 01-05 — Independent Product-Claim Recheck

**Reviewed implementation SHA:** `fee208737b9814eb72b2f7582d0aad4d1a7fab9e`  
**Requested abbreviation:** `fee2087f` did not resolve literally; the repository's unique `fee2087` commit is the full SHA above (`docs(01-05): disposition independent findings`).  
**Review date:** July 18, 2026  
**Scope:** PR-001 and PR-002 repairs only  
**Verdict:** **APPROVED**

## Independence and scope

The recheck used a unique detached temporary Git worktree at the full SHA above. It inspected `README.md`, `docs/DEMO_SCRIPT.md`, `docs/SUBMISSION.md`, `src/components/faultsmith-app.tsx`, `scripts/product-claims.test.mjs`, and the directly relevant generation/assessment behavior. No source, test, canonical documentation, or GSD state was changed by this review.

## Recheck results

| Repaired boundary | Result | Evidence |
| --- | --- | --- |
| Guided mode makes no model call | Pass | `startGuidedStep` still calls `forgeChallenge(false, ...)`; the request sends `preferLive: false`; the server workflow returns the prevalidated challenge before constructing or invoking an OpenAI gateway. The timed demo now says, “This guided lesson intentionally makes no model call.” |
| Guided demo narration matches fixture behavior | Pass | The script describes a real server-owned, previously validated fixture, exact submitted-snapshot comparison, and no learner-Python execution in prevalidated mode. It keeps the visible provenance label and conditions any live-verification statement on a separate controlled smoke. |
| Direct live mutation claim matches implementation | Pass | README, submission copy, UI source label, and recording guidance describe GPT-5.6 as emitting an exact server-approved contract. They no longer say the model selects, designs, invents, or adaptively creates the mutation. Source behavior still selects the fixture first, supplies the approved contract, and rejects divergence. |
| Practice level is a label, not adaptive content | Pass | The UI legend is `Practice level` and immediately explains, `Labels this attempt; the curated fault is selected by system and skill.` Submission copy states that the control labels the attempt rather than changing fixture content. The prior adaptive/difficulty-alignment claims are absent. |
| Live scoring and feedback authority | Pass | Public copy now says live GPT-5.6 returns bounded scores while server-owned policy/templates provide feedback prose and retain verification authority, matching the repaired score-only schema/workflow. |

## Commands

| Command | Result |
| --- | --- |
| `git rev-parse --verify fee2087^{commit}` | Resolved to `fee208737b9814eb72b2f7582d0aad4d1a7fab9e`. |
| `npm ci` | Passed; 490 packages installed, 497 audited, zero vulnerabilities reported. |
| `npx vitest run scripts/product-claims.test.mjs` | Passed: 1 file, 2 claim-boundary regressions. |
| `npm run typecheck` | Passed. |
| `npx eslint src/components/faultsmith-app.tsx scripts/product-claims.test.mjs` | Passed with no findings. |
| `npx playwright test tests/e2e/faultsmith.spec.ts --grep "guided roadmap records only verified progress"` | Passed: guided prevalidated launch, verified-only progress, report, and refresh/next-lesson restoration. |

## Prior finding disposition

| Finding | Disposition | Recheck conclusion |
| --- | --- | --- |
| PR-001 — guided/live GPT attribution and mutation-selection overclaim | Resolved | Guided narration explicitly denies a model call; direct live language is constrained to exact approved-contract emission; no misleading select/design/adaptive claim remains in the reviewed public surfaces. |
| PR-002 — difficulty presented as adaptive challenge behavior | Resolved | The product and submission consistently present the control as a practice-level label that does not change fixture content. |

## Remaining findings

None in the focused PR-001/PR-002 scope.

## Conclusion

**APPROVED — 0 blocker, 0 high, 0 medium, 0 low findings in this focused recheck.**

The repaired claims now match the immutable implementation SHA. This approval does not substitute for the still-pending credentialed live OpenAI smoke: any recording or final submission may describe live provider behavior as verified only after that separate gate passes.
