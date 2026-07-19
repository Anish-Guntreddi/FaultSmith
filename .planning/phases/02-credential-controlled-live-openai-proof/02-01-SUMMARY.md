---
phase: 02-credential-controlled-live-openai-proof
plan: 01
subsystem: release-proof
tags: [http-smoke, evidence, privacy, adversarial]
requires: [phase-1]
provides: [strict public-route lifecycle, safe evidence schema, exclusive evidence writer]
affects: [live-smoke, production-smoke, testing, threat-model]
key-files:
  created: [scripts/release-smoke-core.mjs, scripts/release-smoke-core.test.mjs]
  modified: []
key-decisions:
  - "Normal smoke behavior is fallback-only; live requires an explicit mode and a true server health flag."
  - "Evidence records hashes and bounded public facts, never learner/provider payloads."
requirements-completed: []
duration: 25 min
completed: 2026-07-18
---

# Phase 2 Plan 01 Summary

Built a dependency-free route-level lifecycle that validates health, generation, progressive hinting, mutated failure, repaired pass, verified repaired assessment, and non-verified failing assessment. It uses exact response-key/type/bound checks, rejects unsafe URLs and redirects, and deliberately proves the no-key `code_interpreter` request recovers through the labeled prevalidated verifier.

The safe evidence writer rejects traversal, symlinks, non-JSON paths, and overwrites. Evidence contains only version, SHA, mode, origin, timestamp, bounded facts/counts/source labels, output digests, and the reviewed `workflow_required` original-pass policy fact.

**Commit:** `046f2f9`  
**Verification:** 29 focused adversarial tests, syntax, lint, typecheck, source/history scan, and diff check pass. Actual LIVE requirements remain credential-gated.

