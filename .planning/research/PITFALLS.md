# Pitfalls Research

**Domain:** Evidence-first AI debugging education release and hackathon submission  
**Researched:** July 18, 2026  
**Confidence:** HIGH for repository-local risks; MEDIUM until live/deployed behavior is observed

## Critical Pitfalls

### Pitfall 1: Expanding Product Breadth Instead of Proving the Core Loop

**What goes wrong:**  
Open-ended prompting, repository ingestion, accounts, dashboards, or additional languages consume the submission window while the credentialed live path, deployment, tester evidence, and recording remain incomplete.

**Why it happens:**  
Breadth feels like visible progress and the user correctly sees a large educational opportunity, but every new input surface widens validation, prompt-injection, leakage, accessibility, and demo failure scope.

**How to avoid:**  
Treat `docs/PRD.md` and the approved guided-learning amendment as locked. Complete and prove the curated nine-lesson roadmap plus direct catalog, then move immediately to live smoke, deployment, external UAT, and video.

**Warning signs:**  
New schemas accept arbitrary prompts/files/commands; the fixture allowlist is bypassed; a phase has no direct Definition of Finished mapping; external blockers are unchanged while local feature count rises.

**Phase to address:**  
Phase 1 — Integration and objective-gate hardening; enforce explicit out-of-scope boundaries in every later phase review.

---

### Pitfall 2: Treating Fixture Evidence as Fresh Live Execution

**What goes wrong:**  
Judges or learners believe Python just ran when fixture mode actually compared a submitted snapshot to server-owned approved evidence. This becomes a misleading-claim and trust failure even though the fallback is technically safe and useful.

**Why it happens:**  
Both live and fallback paths return test-shaped results, and concise demo narration can erase the distinction.

**How to avoid:**  
Keep source/execution mode in response contracts, workspace labels, reports, documentation, tests, and narration. Say “prevalidated fixture evidence” when no fresh Code Interpreter run occurred.

**Warning signs:**  
UI text says “executed” without mode qualification; fixture reports claim sandbox execution; tests assert counts but not disclosure; submission language collapses live and fallback evidence.

**Phase to address:**  
Phase 1 — Independent product and documentation review, with browser assertions preserved.

---

### Pitfall 3: Self-Certifying Security and QA

**What goes wrong:**  
The implementer repeats familiar tests and misses a hidden-answer leak, allowlist bypass, report-persistence error, keyboard trap, provider failure, or stale claim.

**Why it happens:**  
Fast iteration rewards confirmation, and a monolithic CI job makes all evidence look like one undifferentiated pass.

**How to avoid:**  
Use independent read-heavy product, QA/accessibility, and security/adversarial reviewers. Reproduce every material finding, let the coordinator own fixes, add regressions, and rerun named gates. Reviewers do not certify their own implementation changes.

**Warning signs:**  
Only the author reviews the diff; findings lack affected files/exploit paths; a gate has no standalone job or command; documentation declares “complete” without a concrete run or artifact.

**Phase to address:**  
Phase 1 — Parallel independent audit and split CI; repeat after any high-risk fix.

---

### Pitfall 4: Live Provider Drift Appears During Recording

**What goes wrong:**  
GPT structured output, Code Interpreter logs, timeout behavior, or deployed runtime limits differ from mocks and break challenge generation or verification when the video is being recorded.

**Why it happens:**  
The local suite intentionally avoids paid external calls and cannot prove current remote response shapes, container availability, or deployment egress.

**How to avoid:**  
Use a controlled server-only credential, run the documented original-pass/mutated-fail/repaired-pass smoke against the intended deployment, capture sanitized evidence, and keep one-click fixture recovery working.

**Warning signs:**  
No recent live run timestamp; log parser yields zero counts; API request exceeds route/platform limits; a provider error becomes a 500 instead of a labeled fallback; recording depends on live success.

**Phase to address:**  
Phase 2 — Credential-controlled live integration proof, after local gates pass and before production recording.

---

### Pitfall 5: Deployment Controls Do Not Match Local Assumptions

**What goes wrong:**  
Public traffic bypasses process-local rate limits, environment variables are scoped incorrectly, security headers are altered, build/runtime versions differ, or the app requires authentication.

**Why it happens:**  
Serverless horizontal scaling, preview/production environment scoping, CDN behavior, and platform timeouts are external to the local Next.js process.

**How to avoid:**  
Obtain explicit deployment authorization, pin the supported Node runtime, configure the key server-side only, add provider/edge rate controls appropriate for demo traffic, and run unauthenticated health/header/fallback/primary-flow checks on the public URL.

**Warning signs:**  
Multiple instances each allow 30 requests; `OPENAI_API_KEY` is visible in client configuration; HSTS/CSP/frame headers differ; `/api/health` is cached or blocked; preview access protection is enabled.

**Phase to address:**  
Phase 3 — Public deployment and production verification.

---

### Pitfall 6: External Submission Tasks Are Left Until the Final Hours

**What goes wrong:**  
The code is green but there is insufficient time to recruit five testers, incorporate comprehension feedback, produce a public sub-three-minute video, or capture the correct Codex Session ID.

**Why it happens:**  
Engineering tasks are directly controllable while human scheduling, recording, upload, and submission validation are not.

**How to avoid:**  
Prepare exact tester scripts and result tables now, freeze video scope after production smoke, rehearse on fixture mode, and treat `/feedback` capture plus public link verification as first-class release checklist items.

**Warning signs:**  
Fewer than five scheduled testers; demo narration exceeds 2:45 in rehearsal; no public video privacy check; placeholders remain in `docs/SUBMISSION.md`.

**Phase to address:**  
Phase 4 — External evidence and final submission, begun as soon as the deployment candidate is stable.

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keep per-process rate limiting only | No infrastructure dependency | Distributed bypass and API-credit exposure | Limited demo traffic only, with deployment-provider controls and residual risk documented |
| Keep `unsafe-inline` CSP | Next.js compatibility and speed | Weaker XSS defense than nonce-based CSP | MVP only while React escaping, restrictive directives, no arbitrary HTML, and headers remain tested |
| Add runtime agent autonomy | More generated behavior | Latency, nondeterministic authority, new prompt/injection/cost surface | Never before submission; evaluate only in a separately scoped post-MVP design |
| Accept prose-only evidence | Fast documentation | Misleading completion and no reproducibility | Never for Definition of Finished criteria |
| Add broad features without acceptance tests | Visible UI breadth | Fragile demo and unbounded maintenance | Never in the submission-critical branch |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| OpenAI Responses structured output | Trust schema-valid output as semantically safe | Compare exact approved contract/allowlist and apply deterministic evidence gates |
| Code Interpreter | Accept client command, paths, container IDs, or package installation | Keep files and fixed `python -m pytest -q` command server-owned, bounded, isolated, and timed out |
| Pytest log parsing | Assume one output phrasing forever | Live-smoke current provider behavior; sanitize, reject empty/ambiguous evidence, and recover safely |
| Deployment environment | Prefix secret with `NEXT_PUBLIC_` or expose it at build time | Configure `OPENAI_API_KEY` only in server runtime scope and scan client artifacts |
| GitHub Actions | Hide all checks in one sequential shell chain | Keep local aggregate command but expose independently named jobs for branch protection and triage |
| Browser persistence | Trust restored reports/progress as certification | Strictly parse versioned local state and rerun server-owned evidence for verification authority |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Serial CI quality chain | Slow feedback; browser failure discovered after build | Run static, unit, build/security, and browser jobs in parallel after a shared reproducible install pattern | Every PR, especially under deadline |
| Live generation on every beginner start | High latency and avoidable API usage | Keep guided launches on prevalidated fixtures and reserve live generation for explicit advanced mode | Immediately at classroom/demo repetition |
| Unbounded rate-limit identity map | Memory growth or spoofed-key churn | Existing 5,000-bucket cap plus edge/shared limiter before public scale | Multi-instance or hostile public traffic |
| Large all-in-one client component | Changes trigger broad regressions and rerenders | Prefer pure helpers/small presentational components; validate persistence and stage transitions after edits | As feature breadth grows post-MVP |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Letting generated content define execution | Prompt injection or arbitrary execution | Server-owned allowlists, strict schemas, semantic equality, fixed command, deterministic gates |
| Sending the full fixture object to the browser | Root cause/reference repair leakage | Explicit public projection, `server-only`, import/bundle/storage/response scans |
| Treating model assessment as authority | Failing code receives verified status | Server reruns exact snapshot; non-passing evidence always forces `not_verified` |
| Logging raw provider/user output | Credential, internal prompt, answer, or hostile-output exposure | Safe normalized errors and bounded sanitized test output; no raw provider errors in responses |
| Relying on an app-local limiter in serverless production | Distributed API-credit exhaustion | Deployment edge/shared throttling plus provider limits and conservative demo mode |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Beginner lands in an unstructured prompt box | Cognitive overload and AI dependence | Default to the ordered roadmap with concept, investigation checklist, and success signal |
| Hint reveals the completed repair | Learner skips evidence and reasoning | One approved progressive hint per request, gated by a substantive hypothesis |
| Progress records on submission rather than proof | False mastery and misleading recommendations | Record only verified evidence; reinforce low-score/high-hint lessons |
| Live/fallback labels are vague | Learner/judge misunderstands what executed | Show mode-specific language in workspace, result, report, docs, and narration |
| Recording path depends on network | Unreliable demo | Rehearse the validated fixture path and present live evidence separately |

## "Looks Done But Isn't" Checklist

- [ ] **Live AI path:** Implemented/mocked is not verified — run a credentialed current-provider smoke.
- [ ] **Deployment-ready:** Local `next start` is not public — verify unauthenticated production URL, headers, health, fallback, and primary flow.
- [ ] **Security review:** A threat model is not independent validation — reproduce adversarial cases and close every blocker/high finding.
- [ ] **Accessibility:** Zero axe issues is not the whole gate — verify keyboard order, focus visibility, contrast, reduced motion, and narrow viewport.
- [ ] **Repository hygiene:** Working-tree scan is not history evidence — scan reachable Git history after publication and document false positives.
- [ ] **Submission docs:** Draft copy is not a submission — replace URL/video/Session ID placeholders and verify links/privacy.
- [ ] **Educational impact:** A roadmap exists but comprehension is unproven — record five tester outcomes and the four-of-five purpose threshold.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| New local/CI regression | LOW | Reproduce narrowly, identify boundary, patch minimally, add regression, rerun affected then full gates |
| Live provider incompatibility | MEDIUM | Capture safe symptom, compare official SDK/docs, adjust adapter/schema/log parser, keep fixture fallback, rerun live smoke |
| Deployment misconfiguration | MEDIUM | Roll back/disable live mode if needed, fix environment/runtime/header/rate control, redeploy preview, reverify |
| Hidden-answer or credential leak | HIGH | Stop publication, rotate credential if real, remove exposure, inspect history/artifacts, add leakage regression, document response |
| Tester confusion | MEDIUM | Fix the smallest onboarding/label/demo-language issue, rerun affected UX gates, retest comprehension before recording |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Scope expansion | Phase 1 | Every v1 requirement maps to locked PRD/guided amendment; deferred features remain explicit |
| Fixture/live ambiguity | Phase 1 | Contract/UI/docs/browser assertions distinguish execution modes |
| Self-certification | Phase 1 | Independent review reports plus reproduced/closed findings and named CI jobs |
| Provider drift | Phase 2 | Current credentialed generate/execute/assess evidence with safe fallback exercised |
| Deployment mismatch | Phase 3 | Public unauthenticated smoke, headers, rate controls, health, fallback, recording viewport |
| Late external tasks | Phase 4 | Five tester records, public video under three minutes, Session ID, final link audit |

## Sources

- `docs/PRD.md` — locked product, risks, and submission criteria.
- `docs/EXECUTION_GOAL.md` — continuous validation, adversarial, self-heal, security, QA, and blocker policy.
- `docs/THREAT_MODEL.md` — current trust boundaries, mitigations, and accepted residuals.
- `.planning/codebase/CONCERNS.md` — brownfield integration, release, quality, and documentation findings.
- `.planning/codebase/ARCHITECTURE.md` — current browser/server/provider authority and data flow.
- Repository tests and CI configuration — objective current coverage and orchestration behavior.

---
*Pitfalls research for: FaultSmith submission-completion milestone*  
*Researched: July 18, 2026*
