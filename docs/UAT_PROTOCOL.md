# FaultSmith Five-Tester UAT Protocol

Use this protocol only with an approved, stable build. It prepares external evidence for `UAT-01` and `UAT-02`; the template is deliberately pending and is not evidence that testing happened.

## Privacy and observation boundary

- Recruit five people who have not been coached on FaultSmith's purpose. Participation is voluntary and no account is required.
- Assign the anonymous IDs `T01` through `T05`. Do not record a name, email, school, employer, demographic, IP address, learner source, hypothesis, explanation, quote, transcript, or free-form note in the JSON results.
- Store only completion, the purpose-comprehension result, elapsed seconds, and bounded blocker/high finding counts. Detailed reproduction steps belong in the project's normal private issue workflow, never in `uat-results.json`.
- Do not copy the template into a completed record until each value comes from an actual observation. Never infer, backfill, or improve a tester's result.

## Test setup

1. Use the exact reviewed deployment SHA and an unauthenticated browser window.
2. Reset FaultSmith so the tester begins at the selection screen. Confirm the visible mode label matches the environment.
3. Start a timer when the page is handed to the tester. Do not explain the product, debugging loop, controls, expected repair, or fallback/live distinction before the comprehension question.
4. Use the primary guided Expense Approval task. The facilitator may resolve a browser or network outage, but must record a blocker if the product itself prevents progress.

## Script for each tester

1. Say: “Please explore this application and complete the first guided activity. Think aloud if you are comfortable, but I will not tell you what the product is for or how to solve it.”
2. Let the tester choose actions independently. Do not reveal the boundary repair, suggest a hypothesis, direct them to a hint, or describe FaultSmith's purpose.
3. After the tester reaches a final report or stops because they cannot proceed, stop the timer and record whole elapsed seconds.
4. Ask exactly once: “In your own words, what is FaultSmith trying to help a learner practice?” Do not provide examples or a second explanation first.
5. Mark `purposeUnderstood: true` only when the answer substantially identifies evidence-first debugging—reading failure evidence, forming a root-cause hypothesis, and proving a repair—rather than merely “learning Python” or “using AI.” Record only the boolean, never the answer.
6. Mark `completed: true` only if the tester independently reaches the final assessment report. Otherwise leave it false.

## Finding severity and reproduction

- **Blocker:** the primary guided task cannot be completed and no reasonable in-product recovery exists.
- **High:** a core step is seriously misleading, inaccessible, loses work, produces an incorrect trust claim, or repeatedly requires facilitator intervention.
- **Lower severity:** friction that does not meet those definitions. Track it outside this bounded submission result if useful.

For every blocker/high observation, create a private issue with the deployment SHA, anonymous tester ID, affected step, expected/actual behavior, minimal reproduction, viewport/browser, and severity. Do not include learner text or personal data. Increment that tester's `observed` count for the matching severity.

## Repair and retest policy

1. A blocker/high finding returns to development. Reproduce it, fix it, and add an automated regression when the failure can be automated.
2. Rerun the affected quality gates plus the primary guided workflow.
3. Retest the repaired behavior on the new reviewed SHA. Increment `resolved` only after the fix is reviewed and `retested` only after a fresh successful observation.
4. Counts must satisfy `observed === resolved === retested` before strict readiness can pass. Never reduce `observed` to hide a finding.
5. If the repair materially changes the locked PRD, competition track, privacy boundary, or deployment model, pause for approval instead of retesting an unapproved product change.

## Recording results

Copy `docs/uat-results.template.json` to a non-template result file. Replace pending values only with actual observations, then set `studyStatus` to `complete` only after all five records are complete and every blocker/high finding is resolved and retested.

Preparation is safe before the study:

```bash
node scripts/submission-readiness.mjs --prepare
```

After the actual result file and submission links are filled, run strict mode against it:

```bash
node scripts/submission-readiness.mjs --strict --uat path/to/uat-results.json
```

Preparation mode exits successfully when only external evidence is pending, but still rejects malformed or privacy-unsafe data. Strict mode fails until all five testers completed the task, at least four understood the purpose, every blocker/high count is resolved and retested, and all submission links and IDs are present. A green strict check validates the bounded record; it does not substitute for the underlying observations or unauthenticated link review.
