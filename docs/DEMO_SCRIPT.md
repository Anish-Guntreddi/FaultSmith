# FaultSmith Demo Script

**Target runtime:** 2 minutes 35 seconds  
**Recording viewport:** 1440 × 900  
**Primary mode:** fixture fallback is acceptable and must remain visibly labeled if live service is unavailable

## Before recording

1. Start from the project selection screen and reset any saved attempt.
2. Confirm Expense Approval, Inventory Service, and Notification Preferences all show `ready`.
3. Use a production build or stable preview URL.
4. If demonstrating live mode, complete the live smoke checklist first. Never expose the key or terminal.
5. Keep the browser at 100% zoom and 1440 × 900.

## Timed narrative

### 0:00–0:25 — The problem and roadmap

“Students can now ask AI for a patch before they learn to parse a failure. That dependency breaks down when they inherit unfamiliar software. FaultSmith builds the missing habit: read evidence, form a hypothesis, and prove the smallest repair.”

Show the three-phase, nine-lesson Guided roadmap and the **Prevalidated lab · no API credits required** label. Briefly point to **Practice by skill** as the advanced/live path, then start Lesson 1.

### 0:25–0:45 — Forge and validate

Click **Start guided lab**.

“GPT-5.6 produces a strict mutation contract. Before the lab opens, FaultSmith proves the original passes and the mutation fails with the expected signature. If the live service is unavailable, this same workflow recovers to a real prevalidated fixture.”

Point briefly to the mode label and validation evidence. Do not dwell on loading animation.

### 0:45–1:25 — Investigate

Show the failing `amount == 500` test and the mutated comparison in the editor.

“The learner sees evidence, not the answer. Tests and the README are read-only; only the approved source file is editable. They must record a hypothesis before hints unlock.”

Enter: `The approval threshold excludes the exact boundary value.` Reveal the first hint. Change `amount > 500` to `amount >= 500`.

### 1:25–1:50 — Prove the repair

Click **Run test suite**.

“Learner Python runs only in OpenAI Code Interpreter in live mode. Executed tests are authoritative, output is sanitized, and a plausible explanation can never override a failing suite.”

Show `6 passed · 0 failed`.

### 1:50–2:15 — Explain and assess

Enter: `The mutation excluded exactly 500 even though the requirement is inclusive. Changing > to >= restores the boundary while preserving behavior above and below it.`

Click **Submit patch + reasoning**.

### 2:15–2:35 — Evidence, progress, and close

“The final report separates deterministic test evidence from GPT-5.6 feedback. FaultSmith measures whether the learner repaired the code and whether they can explain the root cause—without pretending the model is a test runner.”

Show verified status, score, changed-line count, executed tests, assessment feedback, **Guided roadmap updated**, and the deterministic next lesson.

Close: “FaultSmith: AI that breaks your code on purpose so you learn how to fix it.”

## Recording fallback

If generation or sandbox execution fails, continue on the labeled prevalidated fixture path. Do not retry repeatedly on camera. The fallback is a designed reliability mode and still demonstrates the complete learner experience; describe live verification only if a separate controlled live smoke test has passed.

## Claims to avoid

- Do not call the report a certification.
- Do not say arbitrary repositories or arbitrary Python are supported.
- Do not imply the fallback executed in Code Interpreter.
- Do not claim a public deployment, tester result, or live API result until independently verified.
