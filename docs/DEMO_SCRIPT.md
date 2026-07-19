# FaultSmith Demo Script

**Target runtime:** 2 minutes 35 seconds  
**Recording viewport:** 1440 × 900  
**Primary mode:** fixture fallback is acceptable and must remain visibly labeled if live service is unavailable

## Before recording

1. Start from the project selection screen and reset any saved attempt.
2. Confirm Expense Approval, Inventory Service, and Notification Preferences all show `ready`.
3. Use a production build or stable preview URL.
4. Run `npm run smoke:production -- --base-url <public HTTPS URL>` against the exact reviewed deployment. If demonstrating live mode, run the explicit live smoke first. Never expose the key, terminal, evidence file, or provider identifiers.
5. Run `npm run readiness:strict` only after the real UAT record, public video URL, public demo URL, and feedback ID are filled. A preparation-mode pass is not final submission evidence.
6. Confirm the public application, repository, and video open without authentication, then keep the browser at 100% zoom and 1440 × 900.

## Timed narrative

### 0:00–0:25 — The problem and roadmap

“Students can now ask AI for a patch before they learn to parse a failure. That dependency breaks down when they inherit unfamiliar software. FaultSmith builds the missing habit: read evidence, form a hypothesis, and prove the smallest repair.”

Show the three-phase, nine-lesson Guided roadmap and the **Prevalidated lab · no API credits required** label. Briefly point to **Practice by skill** as the advanced/live path, then start Lesson 1.

### 0:25–0:45 — Forge and validate

Click **Start guided lab**.

“This guided lesson intentionally makes no model call. It loads a real server-owned fixture whose original-pass and intended-failure evidence was validated before release. The mode label keeps that provenance visible.”

Point briefly to the mode label and validation evidence. Do not dwell on loading animation.

### 0:45–1:25 — Investigate

Show the failing `amount == 500` test and the mutated comparison in the editor.

“The learner sees evidence, not the answer. Tests and the README are read-only; only the approved source file is editable. They must record a hypothesis before hints unlock.”

Enter: `The approval threshold excludes the exact boundary value.` Reveal the first hint. Change `amount > 500` to `amount >= 500`.

### 1:25–1:50 — Prove the repair

Click **Run test suite**.

“This prevalidated mode compares the exact submitted snapshot with the approved repair and does not execute learner Python. In the separately verified live mode, learner snapshots run only in OpenAI Code Interpreter. Either way, evidence is authoritative and prose cannot override a failure.”

Show `6 passed · 0 failed`.

### 1:50–2:15 — Explain and assess

Enter: `The mutation excluded exactly 500 even though the requirement is inclusive. Changing > to >= restores the boundary while preserving behavior above and below it.`

Click **Submit patch + reasoning**.

### 2:15–2:35 — Evidence, progress, dashboard, and close

“The final report separates deterministic repair evidence from reasoning feedback. In this guided run the rubric is deterministic. In a verified live run, GPT-5.6 may supply only bounded scores while the feedback text and verification decision remain server-owned.”

Show verified status, score, changed-line count, executed tests, assessment feedback, **Guided roadmap updated**, and the deterministic next lesson. Then click **My Progress** for roughly three seconds: phase progress, verified score dimensions, and the explained next recommendation — all derived locally with no account and no model call.

Close: “FaultSmith: AI that breaks your code on purpose so you learn how to fix it.”

### Optional secondary evidence — account sync (only if pre-verified)

Sign-in is deliberately **not** part of the primary narrative; the under-three-minute fixture story must never depend on network identity. Only if cloud sync has already passed its separate real-Firebase proof, a secondary clip may show the optional account panel inside My Progress (“Guest practice is the default…”), a verified sign-in, and the storage chip flipping to **Synced to account**. If anything hesitates, cut the clip — guest mode is the product's promise, and the dashboard demonstrates personalization without any account.

## Recording fallback

If generation or sandbox execution fails, continue on the labeled prevalidated fixture path. Do not retry repeatedly on camera. The fallback is a designed reliability mode and still demonstrates the complete learner experience; describe live verification only if a separate controlled live smoke test has passed.

If a controlled live smoke has passed and a direct-catalog live run is recorded, describe GPT-5.6 as emitting a contract constrained to the exact approved challenge—not as choosing or inventing an arbitrary mutation.

## Claims to avoid

- Do not call the report a certification, and do not present My Progress metrics as grades or mastery claims.
- Do not say arbitrary repositories or arbitrary Python are supported.
- Do not imply the fallback executed in Code Interpreter.
- Do not claim a public deployment, tester result, or live API result until independently verified.
- Do not show or claim account sync unless the real-Firebase checkpoint has passed; emulator proof is not real-provider proof.
