# 002 — Tighten high-frequency motion hygiene

- **Status**: DONE
- **Commit**: 60d7e45
- **Severity**: MEDIUM
- **Category**: Purpose and frequency, performance, cohesion
- **Estimated scope**: 4 files, approximately 40–90 lines

## Problem

The primary Forge action pulses continuously while idle, although the locked design says continuous motion belongs only to bounded validation:

```tsx
// src/components/faultsmith-app.tsx:842 — current
<button type="button" disabled={!ready} onClick={props.onForge} className="primary-action forge-pulse flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold focus-visible:outline-none disabled:animate-none disabled:opacity-35">
```

```md
<!-- docs/DESIGN_SYSTEM.md:46 — current -->
- Continuous animation is limited to the bounded challenge-validation state.
```

Progress bars also transition `width`, creating layout work for a purely visual indicator:

```tsx
// src/components/progress-dashboard.tsx:32 — current
<div
  className={`h-full rounded-full transition-[width] ${tone === "emerald" ? "bg-gradient-to-r from-cyan-300/70 to-emerald-400/80" : "bg-gradient-to-r from-amber-300/80 to-amber-500/70"}`}
  style={{ width: `${width}%` }}
/>
```

## Target

- Remove the infinite pulse from the idle Forge button. Retain it only in `ForgingView`, where the bounded validation process is active.
- Add subtle press feedback to `.primary-action`: `transform: scale(0.97)` for 140 ms with `cubic-bezier(0.23, 1, 0.32, 1)`.
- Gate movement hover/press styles behind `(hover: hover) and (pointer: fine)` where appropriate; color feedback may remain universal.
- Change roadmap and dashboard progress indicators from animated width to a full-width child using `transform: scaleX(value / 100)`, `transform-origin: left`, and a 240 ms `cubic-bezier(0.77, 0, 0.175, 1)` transition.
- Preserve current reduced-motion behavior and every accessible label.

## Repo conventions to follow

- Motion primitives live in `src/app/globals.css`.
- Status changes use labels and color together; progress bars are already `aria-hidden` and their numeric values are present in adjacent text.
- Do not add a second animation dependency for these CSS-only refinements.

## Steps

1. Add `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`, `--duration-press: 140ms`, and `--duration-ui: 240ms` to the existing root token block in `src/app/globals.css`.
2. Remove `forge-pulse` from the idle Forge button. Keep the class on the active Forging view mark.
3. Update `.primary-action` to use the tokens, and add fine-pointer hover/active movement with `scale(0.97)` press feedback.
4. Convert `GuidedRoadmap` and `EvidenceBar` progress fills to `scaleX`, retaining a full-width child and left transform origin.
5. Add or update Playwright assertions only if existing behavior is not already covered. Do not test exact transient transform matrices.

## Boundaries

- Do NOT change state timing, request behavior, disabled behavior, validation copy, or progress values.
- Do NOT animate layout properties, add keyframes, or add a dependency.
- Do NOT weaken reduced-motion handling.

## Verification

- **Mechanical**: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e`.
- **Feel check**:
  - Idle Forge action is visually stable.
  - Active validation retains its restrained pulse.
  - Mouse press compresses and releases immediately without affecting layout.
  - Progress changes expand from the left and remain correct at 0%, partial, and 100%.
  - Touch emulation produces no stuck elevated state.
- **Done when**: idle continuous motion is removed, progress motion is composite-only, and existing functional/accessibility behavior remains green.
