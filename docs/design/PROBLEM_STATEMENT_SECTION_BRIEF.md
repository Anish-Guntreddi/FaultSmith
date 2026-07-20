# Public Landing Problem Statement Section — Design Brief

**Status:** Implementation-ready design direction  
**Surface:** Public landing page  
**Target views:** 1440 × 900 and 390 × 844  
**Source of truth:** `docs/DESIGN_SYSTEM.md` and the approved Forensic Terminal upgrade spec  
**Implementation constraint:** Replace the current `landing-problem` content; do not add a second problem section.

## Decision at a glance

Build a two-column problem section around a dedicated **Reasoning Bypass Circuit**. The schematic shows a failure routed through a cyan model shortcut while the learner's evidence, hypothesis, and proof path is repeatedly marked **BYPASSED**. A final unfamiliar-code task then reaches an explicit **BLOCKED — causal model not formed** outcome.

This is intentionally different from both landing-page demonstrations already in the approved direction:

- It is an abstract dependency schematic, not a terminal.
- It does not type commands, show source, run tests, apply a diff, or end in a verified repair.
- It explains what repeated shortcutting removes; the following Debugging Case File explains FaultSmith's successful learning loop.
- It uses CSS motion plus a small React viewport trigger. It does not use GSAP.

## 1. Narrative beat

### Argument order

The section must land these ideas in this order:

1. **A working output is not evidence of learning.** A model-produced patch may be correct while the learner still lacks a causal explanation.
2. **Name the work that was skipped.** The missing practice is reading evidence, forming a hypothesis, limiting the repair, and verifying the submitted state.
3. **Show the dependency consequence.** Repeating the direct failure-to-diff route makes accepting an answer easier than independently debugging or maintaining unfamiliar code.
4. **Hand off to the product method.** FaultSmith keeps the repair out of the learner-facing model response, guides the investigation, and uses executed tests as completion authority.

Do not open with broad claims about AI harming developers. The argument is about a specific product behavior: routing a failure directly to a generated answer can bypass the practice FaultSmith is designed to preserve.

### Exact section copy

Use this copy unless an implementation constraint requires a strictly typographic change:

**Eyebrow**

> PROBLEM / REASONING BYPASS

**Headline**

> A patch can pass before the engineer understands why.

**Lead**

> Send a failure straight to a model and the code may recover. The learner may not.

**Body**

> The work that disappears is causal: read the evidence, form a hypothesis, change the smallest responsible surface, and prove the submitted snapshot. Repeatedly bypass that work and accepting a diff becomes easier than debugging or maintaining unfamiliar code.

**Bridge label**

> FAULTSMITH'S CONSTRAINT

**Bridge copy**

> FaultSmith withholds the repair, guides the investigation, and lets executed tests decide completion.

### Copy hierarchy and treatment

- Render the eyebrow as an amber instrument label. Red is not appropriate for the eyebrow; it is reserved for the actual failure and blocked outcome inside the schematic.
- Render the headline in interface sans with `.prompt-heading.prompt-heading-display`. Do not add a block cursor or typewriter effect here; the hero owns that grammar.
- Keep the lead visually distinct from the body: primary ink, 18–20 px desktop and 17–18 px mobile, approximately 1.6 line height.
- Render the body in muted ink, 15–16 px, approximately 1.7 line height, with a maximum line length near 62 characters.
- Put the bridge label and copy in a compact raised Card below the body. It is a transition into the method, not a CTA. Do not add another button to `/learn` in this section.
- Do not introduce statistics, percentages, research attributions, productivity claims, certification language, or claims that every AI-assisted patch causes skill loss.

## 2. Signature animation exploration

### Candidate A — Reasoning Bypass Circuit **(recommended)**

A compact systems diagram splits one observed failure into two routes. A cyan `GENERATED DIFF` shortcut registers three accepted outputs. In parallel, the learner route—`READ EVIDENCE`, `FORM HYPOTHESIS`, `PROVE REPAIR`—loses its active amber signal and receives explicit `BYPASSED` markers. A final `UNFAMILIAR CODEBASE` task reaches `BLOCKED — causal model not formed`.

**Strengths**

- Makes the causal argument legible without inventing quantitative evidence.
- Feels native to the Forensic Workbench: a diagnostic schematic rather than a generic illustration.
- Is clearly different from terminal typing and the Observe → Hypothesize → Repair → Verify case file.
- Requires only ordinary divs, pseudo-elements, CSS keyframes, and a small viewport/replay controller.
- Adapts to a two-rail desktop diagram and a vertical mobile schematic without horizontal scrolling.

**Tradeoffs**

- Needs disciplined labels so the branch diagram is understood on first view.
- The animation must never reduce text opacity below AA contrast; only decorative active layers and connectors should fade.

### Candidate B — Causal Stack Underflow

A vertical stack begins with frames for `EVIDENCE`, `HYPOTHESIS`, and `PROOF`. Each `accept(generated_patch)` event visually removes one frame. A later `debug(unfamiliar_code)` call returns `CONTEXT MISSING` because the causal stack is empty.

**Strengths**

- Very compact and inexpensive to animate.
- Has a memorable engineering metaphor and works well on mobile.

**Tradeoffs**

- “Stack underflow” reads like a literal runtime concept and can distract technically experienced viewers from the educational argument.
- Its command-like labels and error return are closer to the hero's terminal vocabulary.
- It makes the skipped reasoning look deleted rather than unpracticed, which is a stronger claim than the product needs.

### Candidate C — Diff Conveyor / Skipped Inspection

Generated diff packets take a fast conveyor lane past three inspection stations: evidence, causal model, and verification. The stations go idle as packets pass. A later maintenance item reaches the end without an operator who can explain the system.

**Strengths**

- Kinetic and visually striking.
- The repeated-patch behavior is immediately visible.

**Tradeoffs**

- The industrial metaphor is less native to the forensic-instrument system.
- It requires more moving pieces, clipping masks, and responsive choreography.
- It can imply deployment or production safety rather than the intended learning dependency.

### Recommendation

Choose **Candidate A: Reasoning Bypass Circuit**. It is the clearest expression of “the output succeeded while the reasoning path went unused,” has the strongest fit with the existing visual language, and is realistic to implement and validate in one working session.

## 3. Recommended visualization specification

### Visual anatomy

The outer shell is a raised Card, not `TerminalFrame`. It must not have terminal dots, a command prompt, code lines, fake test output, or a success footer.

Use these visible labels:

| Element | Label | Tone and non-color signal |
| --- | --- | --- |
| Figure header | `DEPENDENCY TRACE` | Neutral mono label |
| Disclosure badge | `FICTIONAL SCHEMATIC` | Neutral Badge; prevents the three accepts from reading as product analytics |
| Input capsule | `× FAILURE` / `Observed symptom` | Red outline plus `×` and the word `FAILURE` |
| Upper route | `// MODEL SHORTCUT` / `Generated diff` | Cyan line plus `//` prefix |
| Repetition markers | `ACCEPT 01`, `ACCEPT 02`, `ACCEPT 03` | Cyan outlined chips with ordinal text |
| Lower route | `REASONING PATH` | Amber line plus numbered nodes |
| Learner node 1 | `01 READ EVIDENCE` | Number and label |
| Learner node 2 | `02 FORM HYPOTHESIS` | Number and label |
| Learner node 3 | `03 PROVE REPAIR` | Number and label |
| Node end state | `BYPASSED` | Text Badge on every node; never communicated only by dimming |
| Next-task strip | `NEXT TASK` / `Unfamiliar codebase` | Neutral raised surface |
| Required action | `DEBUG INDEPENDENTLY` | Neutral text and directional arrow |
| Consequence | `× BLOCKED` / `Causal model not formed` | Red outline plus `×`, `BLOCKED`, and explanatory text |

Use this visible figcaption below the schematic:

> A working diff is an output. Debugging skill is the path that produced it.

The figure should contain no green. Nothing in this story is verified. Amber is the learner's investigation path, cyan is model/instrumentation activity, and red appears only on the observed failure and blocked consequence.

### Desktop diagram

Inside the Card, arrange the content as three bands:

1. A compact header row with `DEPENDENCY TRACE`, the fictional-schematic Badge, and a `Replay trace` control.
2. A branch field: the failure capsule sits at the left. The cyan shortcut is the upper rail. The three learner nodes form a parallel lower rail. Both routes read left to right.
3. A full-width next-task strip below the rails: `UNFAMILIAR CODEBASE` → `DEBUG INDEPENDENTLY` → `× BLOCKED / Causal model not formed`.

The cyan route must not visually connect to the blocked result. The blocked result belongs to the subsequent independent task, not to the generated diff. Use spacing and the `NEXT TASK` label to make that sequence unambiguous.

### Motion stages and exact timing

The complete automatic sequence is **3,480 ms**, plays once, and then rests in the fully legible end state. All durations use existing tokens; the numeric times below are the cumulative schedule, not new tokens.

| Time | Duration token | Stage | What animates | Easing |
| --- | --- | --- | --- | --- |
| 0–420 ms | `--dur-slow` | **Trace acquired** | The diagram content rises 8 px and fades from 0 to 1. Static borders, fills, and text colors do not animate. | `--ease-snap` |
| 420–1,320 ms | `--dur-reveal` | **Shortcut opens** | A dedicated cyan rail overlay reveals left-to-right with `clip-path: inset(0 100% 0 0)` to `inset(0)`. | `--ease-in-out` |
| 420–940 ms, staggered | `--dur-base` with `--dur-fast` stagger | **Accepts register** | `ACCEPT 01`, `02`, and `03` each move from `translateY(6px) scale(.96)` to rest and fade in. Starts are 420, 560, and 700 ms: `--dur-slow`, then one and two `--dur-fast` offsets. | `--ease-snap` |
| 660–1,360 ms, staggered | `--dur-slow` with `--dur-fast` stagger | **Reasoning goes unused** | Each learner node shifts down 8 px. Its separate amber active overlay and connector overlay fade out; its `BYPASSED` Badge fades/scales in. Node text itself remains fully opaque and AA-readable. Starts are 660, 800, and 940 ms. | Transform: `--ease-in-out`; opacity/Badge: `--ease-out` |
| 1,320–1,740 ms | `--dur-slow` | **New context arrives** | The `NEXT TASK / Unfamiliar codebase` strip moves from `translateX(16px)` and opacity 0 to rest. | `--ease-snap` |
| 1,740–2,160 ms | `--dur-slow` | **Independent debug requested** | The directional indicator and `DEBUG INDEPENDENTLY` label reveal with clip-path and a restrained 8 px translation. | `--ease-in-out` |
| 2,160–2,580 ms | `--dur-slow` | **Dependency exposed** | The red `× BLOCKED` result moves from `translateX(8px) scale(.98)` and opacity 0 to rest. Do not animate its color, border, or shadow. | `--ease-snap` |
| 2,580–3,480 ms | `--dur-reveal` | **Thesis settles** | The figcaption reveals with a left-to-right clip-path and opacity. | `--ease-out` |

Only `transform`, `opacity`, and `clip-path` may animate. Specifically do **not** animate width, height, grid/flex properties, margins, colors, background positions, filters, shadows, SVG strokes, or line dash offsets. Draw route geometry in its final size from first layout; animate separate overlay layers over that geometry.

### Loop, viewport trigger, and replay

- Do not loop. The sequence plays once when at least 35% of the figure intersects the viewport.
- Total automatic motion is 3.48 seconds, below the WCAG 2.2.2 five-second threshold. A pause control is therefore not required.
- Provide a small ghost/tertiary Button labeled `Replay trace`. It restarts the one-shot sequence and retains keyboard focus after activation.
- Use `IntersectionObserver`; do not rely on scroll-linked animation, experimental view timelines, or scroll hijacking.
- Use the final element's `animationend` event to mark the sequence complete. Avoid a timeout that can drift from CSS timing.
- Replaying should remount or re-key only the inner animated canvas, not the entire section and not the focused Button.
- Do not announce each visual stage through `aria-live`. The section copy and figcaption already communicate the complete argument.

### Static, reduced-motion, and failure fallbacks

The final state is the canonical state. It must be the rendered fallback when motion cannot or should not run.

- Under `prefers-reduced-motion: reduce`, render all rails and labels in their final positions: three accepts visible, all three reasoning nodes fully readable and marked `BYPASSED`, the next-task strip visible, and the `× BLOCKED / Causal model not formed` outcome visible.
- Remove every animation and transition from this component under reduced motion. Hide the `Replay trace` control because there is nothing to replay.
- With JavaScript disabled, unsupported `IntersectionObserver`, hydration failure, or a runtime exception, the server-rendered figure must already be in the same complete static state.
- Progressive enhancement pattern: final/static is the default CSS. Only a client-added motion-ready attribute may opt the canvas into its pre-play and playing states when `prefers-reduced-motion: no-preference` matches.
- If the motion preference changes to reduce while the sequence is running, immediately remove the motion-ready state and show the complete static state.

### Semantics

- Use `<figure aria-labelledby="dependency-trace-title" aria-describedby="dependency-trace-caption">`.
- Keep the concise visible figcaption in the accessibility tree.
- The animated branch canvas may be `aria-hidden="true"` because its content is a visual restatement of the adjacent section copy and figcaption. This avoids making a screen reader traverse repeated route labels in animation order.
- The replay Button remains keyboard reachable, has a visible focus state, and uses the literal accessible name `Replay dependency trace`.
- Do not use the schematic as the only place the dependency argument appears; the prose must remain complete without it.

## 4. Layout

### Placement in the landing story

Replace the current `section[aria-labelledby="problem-heading"]` block in place:

```text
Hero: premise and product promise
  ↓
NEW Problem Statement: why direct answer generation can bypass learning
  ↓
#method / Debugging Case File: how FaultSmith restores the investigation loop
  ↓
#learning-system
  ↓
#evidence
  ↓
Final CTA
```

Give the replacement section `id="problem"` and preserve `aria-labelledby="problem-heading"`. Do not add a new header-navigation item. Preserve the hero's existing `Watch the investigation` link to `#method`; its wording correctly targets the case-file sequence rather than this schematic.

Remove the existing three generic problem cards and the existing full-width thesis strip. The new copy, bridge Card, and signature figure replace both. Keeping them would state the same argument twice and dilute the animation.

### 1440 × 900

- Use the existing landing-section maximum width of 1320 px, leaving 60 px outer margins at 1440.
- Retain the subtle top divider that separates this section from the hero.
- Use 128 px vertical padding on the section.
- Use a 12-column visual proportion: 5 columns for copy and 7 for the figure, with a 96 px gap. A practical CSS grid is `minmax(22rem, 5fr) minmax(0, 7fr)`.
- Vertically center the copy group against the figure; do not use sticky positioning.
- Copy column: maximum width 510 px. Keep the headline to approximately three lines at this viewport. Place lead 24 px below it, body 16 px below the lead, and bridge Card 32 px below the body.
- Figure column: use the full column width, a minimum visual height of 456 px, 24–32 px internal padding, a 20 px radius, and the raised-panel hierarchy. Keep all diagram content inside the Card; no orbit, glow field, or decoration may extend into the copy column.
- The section should read as one editorial split, not a dashboard row of cards.

### 390 × 844

- Use the existing 24 px total viewport gutter: 12 px on each side, for a 366 px content width.
- Use a single column with 64 px vertical padding and a 40 px gap between copy and figure.
- Keep eyebrow, headline, lead, body, and bridge in that order. Use the existing mobile display-heading scale; do not force a manual `<br>` in the headline.
- Make the bridge Card full width with 16 px padding.
- Make the figure full width with 16 px padding and no horizontal overflow. The replay control must have a minimum 40 px touch target.
- Reflow the branch field instead of scaling the desktop diagram down:
  - Failure capsule spans the full width at top.
  - Below it, use two equal vertical rails: `MODEL SHORTCUT` on the left with the three accept chips stacked, and `REASONING PATH` on the right with the three learner nodes stacked.
  - Keep a minimum 12 px gap between rails. Labels may wrap to two lines; mono labels must not drop below 10 px.
  - The `NEXT TASK` strip spans both rails below and becomes three stacked rows: unfamiliar codebase, independent-debug arrow/label, blocked outcome.
  - Figcaption sits below the strip and wraps naturally.
- Expect the section to be taller than the 844 px viewport; do not compress type or create nested scrolling to force the complete section above the fold.

### Intermediate behavior

- At 1023 px and below, switch the section to one column, matching the current landing breakpoint.
- At 639 px and below, switch the circuit itself to the vertical two-rail composition described above.
- At every width, `min-width: 0` belongs on grid children and long labels must wrap. No critical content may scroll horizontally.

## 5. Component needs

Assume the concurrent primitive library exposes `Button`, `Card`, `Badge`, and `StatDisplay`.

### Reuse

- **Card:** outer raised figure shell and the compact `FAULTSMITH'S CONSTRAINT` bridge.
- **Badge:** `FICTIONAL SCHEMATIC`, route labels where appropriate, `BYPASSED`, and `BLOCKED`. Use neutral/cyan/amber/red semantic variants only; do not use a green Badge in this section.
- **Button:** ghost/tertiary `Replay trace` control with `.focus-brackets` or the primitive's equivalent visible focus treatment.
- **StatDisplay:** do not use. A count, score, percentage, or trend treatment would make the fictional sequence look like measured user data.

### Genuinely new component

Create one dedicated client component, provisionally named `ReasoningBypassFigure`.

Responsibilities:

- Render the complete semantic `<figure>` and static diagram labels.
- Detect reduced-motion preference with the platform media query.
- Start the one-shot CSS sequence with `IntersectionObserver`.
- Restart the inner animation on replay without moving focus.
- Return to the complete static state for reduced motion, missing APIs, or runtime failure.

Keep the section wrapper and narrative copy server-rendered. `ReasoningBypassFigure` is a signature illustration, not a general-purpose primitive; do not add it to `src/components/ui/`. A small structural `ProblemStatementSection` wrapper is optional, but it should contain no animation state.

Do not reuse `TerminalFrame`, `DebuggingCaseFile`, hero console classes, trace-ticker classes, or GSAP. Do not create a general animation framework.

## 6. Constraints checklist

The implementation is acceptable only if every item below is true.

### Accessibility

- [ ] All body and label text meets WCAG AA contrast on its actual Card surface. Decorative low-contrast connector lines are allowed only because adjacent text carries the meaning.
- [ ] Main learner-node text stays fully opaque during and after motion; only decorative active overlays and connectors fade.
- [ ] Red is paired with `×`, `FAILURE`/`BLOCKED`, and explanatory text.
- [ ] Cyan is paired with `// MODEL SHORTCUT`; amber nodes are numbered and labeled; `BYPASSED` is written on every affected node.
- [ ] The complete argument remains available in normal document text and the visible figcaption.
- [ ] Replay is keyboard reachable, has a visible focus state, and meets a 40 px minimum touch target.
- [ ] No stage uses flashing, rapid color alternation, motion blur, or a continuously blinking cursor.

### Motion

- [ ] The automatic sequence is one shot and no longer than 3.48 seconds.
- [ ] There is no loop, scroll pinning, snapping, smooth-scroll override, or scroll hijacking.
- [ ] Only transform, opacity, and clip-path animate.
- [ ] Every duration and easing comes from `--dur-fast`, `--dur-base`, `--dur-slow`, `--dur-reveal`, `--ease-out`, `--ease-in-out`, or `--ease-snap`.
- [ ] `prefers-reduced-motion: reduce` shows the complete static end state with all animations/transitions removed.
- [ ] JavaScript-disabled and observer-failure paths show the same complete static end state.
- [ ] Because autoplay ends before five seconds, WCAG 2.2.2 does not require pause/stop controls. If implementation changes push total automatic motion beyond five seconds or introduce any loop, add an always-visible Pause/Resume control before shipping.

### Visual system

- [ ] Near-black canvas, panel hierarchy, 4 px spacing rhythm, system sans for prose, and system mono for instrumentation are preserved.
- [ ] Amber means investigation/action, cyan means model/instrumentation, red means failure/blocking, and green is absent because nothing is verified.
- [ ] The section does not resemble a novelty terminal and adds no scanlines, CRT distortion, phosphor blur, ambient blinking, or oversized glow.
- [ ] The schematic is recognizably different from hero typing and the Debugging Case File's successful four-stage loop.

### Technical and content boundaries

- [ ] CSS/React only; no new npm packages.
- [ ] No new fonts, remote assets, CDNs, network requests, CSP origins, or inline third-party scripts.
- [ ] No GSAP. GSAP remains confined to the existing Debugging Case File boundary.
- [ ] No real fixture project names, paths, failure signatures, hints, root causes, patches, test names, or learner content from `src/server/fixtures*` appear in markup, CSS, screenshots, tests, or documentation.
- [ ] The diagram uses only generic fictional labels listed in this brief and is visibly marked `FICTIONAL SCHEMATIC`.
- [ ] No hidden solutions, source code, provider identifiers, credentials, or raw test output are introduced.

## 7. Implementation acceptance views

Capture and review these states before handoff:

1. **1440 × 900, pre-trigger/static:** section composition and copy hierarchy; no content missing if motion has not initialized.
2. **1440 × 900, active atrophy stage:** cyan shortcut visible, accept markers registering, learner route still readable.
3. **1440 × 900, final:** all `BYPASSED` labels, next-task strip, blocked result, and figcaption visible.
4. **390 × 844, final:** vertical two-rail diagram, no clipping or horizontal scrolling, labels readable without shrinking below the specified floor.
5. **390 × 844, reduced motion:** visually identical information to the final state, replay hidden, no animation or transition.
6. **Keyboard:** replay receives a clearly visible focus treatment and retains focus after replay.
7. **JavaScript disabled or observer stubbed unavailable:** complete static end state remains visible.

The section is done when a viewer can state, without reading the following method section: **“A generated patch can restore output while bypassing the reasoning needed to debug independently.”**
