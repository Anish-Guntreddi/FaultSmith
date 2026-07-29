---
phase: 02-credential-controlled-live-openai-proof
plan: 03
subsystem: operator-cli
tags: [live-smoke, fallback, cost-control]
requires: [02-01]
provides: [default-offline smoke CLI, explicit live CLI, opt-in safe evidence]
affects: [phase-2-live-proof, testing]
key-files:
  created: [scripts/live-smoke.mjs, scripts/live-smoke.test.mjs]
  modified: []
key-decisions:
  - "No CLI flag accepts a key; the key belongs only to the server process."
  - "The only paid path is the explicit --live invocation."
requirements-completed: []
duration: 8 min
completed: 2026-07-18
---

# Phase 2 Plan 03 Summary

Exposed the shared lifecycle through an operator CLI whose default is free fallback proof. Live mode is explicit, stops at health-mode drift, prints only safe rule/stage failures, and writes sanitized evidence only on request beneath ignored `test-results/`.

**Commit:** `f409ae6`  
**Verification:** 8 focused CLI tests plus the shared lifecycle suite pass. No package quality or CI command invokes live mode.

