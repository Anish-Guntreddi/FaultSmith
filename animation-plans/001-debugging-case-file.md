# 001 — Build the scroll-driven Debugging Case File

- **Status**: DONE
- **Commit**: 60d7e45
- **Severity**: MEDIUM
- **Category**: Missed opportunities, performance, accessibility
- **Estimated scope**: 8 files, approximately 450–650 lines including tests and documentation

## Problem

The current landing experience explains the investigation loop in a static four-card aside, then immediately enters the learning controls. It is clear but does not demonstrate FaultSmith's differentiating Observe → Hypothesize → Repair → Verify experience in a memorable, judge-friendly sequence.

```tsx
// src/components/faultsmith-app.tsx:775 — current
<aside aria-label="FaultSmith learning method" className="workflow-rail hidden rounded-2xl p-4 lg:block">
  <div className="instrument-label text-cyan-200">The investigation loop</div>
  <ol className="mt-4 grid grid-cols-2 gap-2">
```

The design system also deliberately excludes novelty-terminal effects and currently states that no animation framework is required:

```md
<!-- docs/DESIGN_SYSTEM.md:125 — current -->
- No animation/UI framework is required for this release; CSS and existing React state are sufficient.
```

The selected direction changes that decision narrowly: use one dynamically loaded GSAP timeline for an explanatory section without making GSAP part of the debugging workspace, navigation, validation authority, or fixture fallback.

## Target

Add a `DebuggingCaseFile` client component after the active Roadmap / Practice / My Progress content. Returning learners must reach all practice controls before the narrative.

The component contains:

- An accessible heading and four ordered chapters: Observe, Hypothesize, Repair, Verify.
- A decorative `aria-hidden="true"` CSS-perspective monitor showing a fictional retry-boundary example that does not match a server fixture.
- A desktop two-column layout with the monitor `position: sticky` and normal document scrolling. Do not use GSAP pinning, snapping, smooth scrolling, or scroll normalization.
- GSAP 3.15.0 and ScrollTrigger loaded with literal dynamic imports only after the section enters a 400 px viewport margin and only when `prefers-reduced-motion: no-preference` and viewport width is at least 1024 px.
- Four interruptible stage timelines. Each stage changes only `transform` and `opacity`, uses `power3.out`, lasts 420 ms, and staggers code lines by 40 ms. Monitor rotations are restrained to the range `rotateX(1deg–2deg)` / `rotateY(-8deg–4deg)`.
- Static server-rendered markup before enhancement, on mobile, without JavaScript, and under reduced motion. All four explanatory chapters remain fully visible and meaningful in every mode.

The visual sequence is:

1. **Observe**: `pytest -q`, one fictional retry-boundary failure, and a red evidence signal.
2. **Hypothesize**: the relevant comparison is isolated and an amber causal note appears.
3. **Repair**: a two-line fictional diff changes `attempts > retry_limit` to `attempts >= retry_limit`.
4. **Verify**: seven tests pass and the evidence seal becomes green.

The root element exposes only non-sensitive test hooks: `data-debugging-story`, `data-motion="static|enhanced"`, and `data-active-stage="0|1|2|3"`.

## Repo conventions to follow

- The surrounding product language and tokens are defined in `docs/DESIGN_SYSTEM.md` and `src/app/globals.css`.
- Use existing `.instrument-label`, `.lab-panel`, `.lab-panel-raised`, `.evidence-well`, `.status-pill`, and `font-instrument` conventions.
- The existing rare state entrance uses a strong ease-out:

```css
/* src/app/globals.css:224 — current exemplar */
.motion-rise {
  animation: motion-rise 360ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
```

- The parent `FaultSmithApp` is already a Client Component. Keep the animation boundary in its own file and do not import server fixtures, environment variables, identity code, or progress contracts.
- Next.js 16.2.10 permits on-demand external-library loading through a literal `import()` inside client lifecycle code. Do not use an unresolved variable path or runtime CDN.

## Steps

1. Add `gsap` version `^3.15.0` to production dependencies with npm, updating `package-lock.json` mechanically.
2. Create `src/components/debugging-case-file.tsx` with semantic static markup, a decorative monitor, and a client effect that:
   - checks reduced motion before importing;
   - uses `IntersectionObserver` with `rootMargin: "400px 0px"` to defer the import;
   - imports `gsap` and `gsap/ScrollTrigger` with literal dynamic imports;
   - calls `gsap.registerPlugin(ScrollTrigger)`;
   - scopes selectors with `gsap.context(..., rootElement)`;
   - creates one ScrollTrigger per chapter using `start: "top 62%"`, `end: "bottom 38%"`, `onEnter`, and `onEnterBack`;
   - builds a fresh `gsap.timeline({ defaults: { duration: 0.42, ease: "power3.out", overwrite: "auto" } })` for the selected stage;
   - reverts the GSAP context, match-media context, observer, and pending async initialization on cleanup.
3. Add story-specific CSS to `src/app/globals.css`. Use `perspective: 1200px`, `transform-style: preserve-3d`, transform/opacity animation only, no filter blur, and no animated layout properties. The monitor stand may be static CSS geometry.
4. At widths below 1024 px, render the visual once without sticky positioning and keep the chapters as compact stacked cards. Do not create a slider, carousel, horizontal scroll region, or touch gesture.
5. In `src/components/faultsmith-app.tsx`, import and render `<DebuggingCaseFile />` after the selected learning-mode content and before the outer configuration container closes.
6. Add standard Playwright coverage in `tests/e2e/faultsmith.spec.ts` for semantic chapter order, lazy enhancement, active stage changes after scrolling, desktop overflow, mobile static behavior, and reduced-motion static behavior. Tests must not assert transient inline transform values.
7. Extend `scripts/check-client-bundle.mjs` only if the existing scan cannot inspect the new split chunk automatically. Never weaken or allowlist a fixture marker.
8. Update `docs/DESIGN_SYSTEM.md`, `docs/TESTING.md`, `docs/BUILD_LOG.md`, `docs/ROADMAP.md`, and `docs/THREAT_MODEL.md` with the isolated dependency, motion boundary, fallback, accessibility, and evidence.

## Boundaries

- Do NOT change challenge generation, execution, hints, assessment, fixtures, progress data, authentication, Firebase, OpenAI, rate limiting, or CSP.
- Do NOT add Three.js, React Three Fiber, WebGL, a remote model, a remote font, a remote image, or a CDN script.
- Do NOT display a person/avatar, autoplay audio/video, type text character-by-character, pin the scroller, hijack wheel/touch input, or introduce horizontal scrolling.
- Do NOT animate the real editor, real executed evidence, or validation authority.
- Do NOT hide instructional content behind animation or make completion depend on GSAP.
- If the component cannot remain fully usable without its dynamic chunk, stop and report instead of improvising.

## Verification

- **Mechanical**:
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
  - `npm run test:firebase` with Temurin JDK 24
  - `npm run build`
  - `npm run security:bundle`
  - `npm run test:e2e`
  - `npm run test:e2e:firebase` with Temurin JDK 24
  - `npm audit --audit-level=moderate`
- **Feel check**:
  - At 1440×900, practice controls appear before the case file; the monitor stays spatially stable while each chapter advances; scrolling quickly in both directions retargets cleanly.
  - At 390×844, there is no sticky/pinned behavior, no horizontal overflow, and all four chapters read naturally.
  - At 10% animation playback, line staggers finish in chapter order, the monitor never rotates beyond the specified range, and no two stage panels remain simultaneously authoritative.
  - With `prefers-reduced-motion: reduce`, no GSAP chunk initializes and the semantic story remains complete.
  - With JavaScript blocked or the dynamic import rejected, the section remains readable and the core learning workflow is unaffected.
- **Done when**: the component is visually polished at desktop/mobile, axe-clean, keyboard-neutral, dynamically isolated, bundle-scanned, regression-tested, documented, and all repository/CI gates pass while the fixture fallback remains unchanged.
