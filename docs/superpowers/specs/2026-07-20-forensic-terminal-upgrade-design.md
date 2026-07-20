# FaultSmith Forensic Terminal Upgrade — Design Spec

**Date:** July 20, 2026
**Status:** Implemented and locally validated
**Base:** `docs/DESIGN_SYSTEM.md` (Forensic Workbench, Codex, July 19) — kept as foundation, upgraded per this spec
**Deadline context:** Submission July 21, 5:00 PM Pacific. Every pass must leave the app shippable.

## 1. Problem

The current UI implements the Forensic Workbench system but reads as "vibecoded": functional Tailwind styling without the deliberate typographic rhythm, spacing system, state design, and motion craft of a production product. The goal is an aesthetically distinctive, production-grade interface with a terminal/techy identity — without sacrificing the locked accessibility, CSP, and evidence-authority constraints.

## 2. Quality bar (what "production-grade" means here)

Every screen must survive critique against the installed expert skills, used actively during implementation:

- `frontend-design` (Anthropic) — overall visual quality, hierarchy, distinctiveness
- `web-design-guidelines` (Vercel) — spacing, type scale, layout discipline
- `animation-vocabulary`, `improve-animations`, `review-animations` (Emil Kowalski) — motion timing, easing, purpose
- `frontend-ui-dark-ts`, `tailwind-design-system` — dark-theme and token discipline
- `web-performance-optimization`, `wcag-audit-patterns` — polish must not regress performance or a11y

Concrete checklist per surface:
- One modular type scale, one spacing rhythm; no ad-hoc pixel values outside the token set
- Every interactive element has designed default / hover / focus / active / disabled states
- Motion follows a shared timing vocabulary (durations/easings as CSS custom properties); nothing animates without a purpose (state change, attention, continuity)
- No "default component" look: buttons, cards, inputs, and empty states are all deliberately styled
- Reads as one system on the landing page and inside the app

## 3. Visual direction

Forensic Workbench tokens and color grammar stay (canvas `#080a0d`, amber = investigation/action, cyan = instrumentation, green = verified only, red = failure only; sans for instruction, mono for instrumentation). On top, a bounded terminal grammar:

- **Prompt grammar:** `>` / `$` heading prefixes, block-cursor accent (`▮`), amber bracket-corner focus states
- **Typewriter reveals:** hero value-prop and case-file captions via CSS `steps()`; reduced-motion collapses to static
- **Terminal chrome:** evidence wells and the case-file monitor get themed titlebars (dots + mono session label); streaming line-reveal for new evidence
- **Status line:** tmux-style workspace footer showing Observe → Hypothesize → Repair → Verify
- **Instrument details:** `ls -la`-flavored lesson metadata rows, block-segment progress fills, mono counters
- **Excluded (unchanged from Codex's rationale):** CRT distortion, scanlines, phosphor blur, blinking body text

## 4. Hard constraints (non-negotiable)

- WCAG AA contrast; color never the sole signal; visible keyboard focus everywhere
- All motion honors `prefers-reduced-motion`
- No new fonts, CDNs, remote assets, or CSP origins (system mono stack only)
- Fixture fallback, hidden-answer containment, and deterministic evidence authority untouched
- Existing gates stay green: lint, typecheck, unit, emulator, build, both leakage scanners, default + Firebase Playwright suites (incl. axe), production smoke
- GSAP stays inside the existing Debugging Case File boundary (lazy, desktop, ≥1024px, reduced-motion-off only)

## 5. Design-session feedback loop

- Dev-only `/styleguide` route (404 in production; excluded from prod smoke) rendering all tokens, components, and states
- Cycle per pass: restyle → scripted Playwright screenshots (styleguide + key app states at 1440×900 and 390×844) → skill-driven critique → refine → full gate run
- Accepted iterations are immediately shippable; the styleguide is the durable design artifact

## 6. Execution passes (priority order; each pass = shippable checkpoint)

| Pass | Surface | Content |
|---|---|---|
| 0 | Codex baseline verification | Full local gate suite on the 5 Codex commits before building on them |
| 1 | Global chrome + `/styleguide` | Timing/spacing/type tokens, prompt grammar, focus brackets, terminal titlebar component, screenshot tooling |
| 2 | Landing page | Hero typewriter, case-file terminal chrome, trace ticker, production-polish pass |
| 3 | Investigation workspace | Evidence-well chrome, streaming reveals, status line, state design |
| 4 | Roadmap + My Progress | Card metadata rows, block progress fills, metrics polish |

Passes 3–4 are the cut line under deadline pressure.

## 7. Out of scope

Netlify deployment (separately gated), new product features, changes to learning logic or server contracts, Firebase surface changes.
