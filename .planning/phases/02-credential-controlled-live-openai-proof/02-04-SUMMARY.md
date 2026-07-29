---
phase: 02-credential-controlled-live-openai-proof
plan: 04
subsystem: deployment-readiness
tags: [production-smoke, headers, cache, rollback]
requires: [02-01]
provides: [target-neutral production smoke, approval-gated deployment runbook]
affects: [phase-3, security, operations]
key-files:
  created: [scripts/production-smoke.mjs, scripts/production-smoke.test.mjs, docs/DEPLOYMENT.md]
  modified: []
key-decisions:
  - "Public paid use still requires edge/shared limiting and explicit deployment approval."
  - "Removing the production key is the first rollback, preserving labeled fixture operation."
requirements-completed: []
duration: 10 min
completed: 2026-07-18
---

# Phase 2 Plan 04 Summary

Added a reusable smoke for unauthenticated root/health access, production security headers, no-store API caching, health/mode truth, and the shared challenge lifecycle. The runbook documents reviewed-SHA promotion, server-only configuration, Vercel compatibility, target-specific abuse/CSP decisions, verification, availability, and recoverable rollback without performing a deployment.

**Commit:** `81ce0b7`  
**Verification:** 12 focused production tests cover header/cache/auth/status/mode drift and safe CLI behavior. Deployment remains approval-gated.

