# FaultSmith Design System — Forensic Workbench

**Status:** Locked visual direction
**Selected:** July 19, 2026
**Scope:** Guided roadmap, skill practice, personal progress, optional identity, investigation workspace, validation, and report

## Product expression

FaultSmith should feel like a calm forensic instrument: precise enough for experienced engineers, legible enough for a student opening an unfamiliar codebase for the first time, and visually distinct without imitating a novelty terminal.

The interface communicates one learning loop everywhere:

1. **Observe** the executed evidence.
2. **Hypothesize** a causal explanation.
3. **Repair** the smallest responsible surface.
4. **Verify** the exact snapshot.

## Visual principles

### 1. Evidence has visual authority

- Executed test evidence receives the clearest status treatment.
- Amber marks attention, investigation, and the next useful action.
- Cyan marks instrumentation, context, and neutral system information.
- Green is reserved for verified evidence and successful synchronization.
- Red is reserved for a reproduced failure, unsafe state, or destructive action.

### 2. Terminal flavor is selective

- Monospace is used for code, paths, test output, timing, counters, and instrument labels.
- Headings, instruction copy, authentication, and learning explanations use a highly legible system sans stack.
- Scanlines, CRT distortion, typewriter delays, blinking text, and phosphor glow are excluded because they reduce learning clarity and can turn the product into a visual gimmick.

### 3. Surfaces communicate hierarchy

- The canvas is near-black with a low-contrast technical grid.
- Primary panels have a subtle warm top highlight and deep shadow.
- Nested evidence wells are darker and flatter than their parent panels.
- Selected or active items gain an amber keyline and restrained glow, not a full saturated fill.
- Cards use a consistent 14–20 px radius and 1 px borders.

### 4. Motion explains state

- Entrance motion is a short rise-and-fade used once when a major state changes.
- Hover movement is limited to interactive cards and never exceeds 2 px.
- Continuous animation is limited to the bounded challenge-validation state.
- `prefers-reduced-motion` removes all nonessential motion and smooth scrolling.

### 5. Density follows the task

- Roadmap and progress screens use generous editorial spacing.
- The investigation workspace uses compact instrument spacing and keeps evidence, source, and reasoning visible together on wide screens.
- Mobile layouts become a clear single-column sequence; no critical content requires horizontal scrolling.

## Core tokens

| Token | Purpose |
| --- | --- |
| Canvas `#080a0d` | Application background |
| Panel `#10151b` | Primary work surfaces |
| Raised panel `#151b22` | Selected/important surfaces |
| Ink `#f3f0e8` | Primary text |
| Muted ink `#a7adb3` | Secondary instructional text |
| Amber `#f2b84b` | Investigation and primary action |
| Cyan `#69d0cb` | Instrumentation and neutral system state |
| Green `#70d69e` | Verified evidence and healthy sync |
| Red `#ff7a72` | Failure and destructive action |

## Typography

FaultSmith uses two dependency-free stacks:

- **Interface/display:** `ui-sans-serif`, `system-ui`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, sans-serif.
- **Instrumentation/code:** `ui-monospace`, `SFMono-Regular`, `Cascadia Code`, `Roboto Mono`, `Menlo`, `Consolas`, monospace.

Display headlines use tight tracking and strong weight. Instrument labels use uppercase monospace, 0.14–0.18 em tracking, and concise language. Paragraphs remain sentence case with comfortable 1.55–1.75 line height.

## Component grammar

### Header

- Sticky translucent rail with the FaultSmith mark, current system state, and release label.
- The current state uses a live status dot but does not imply that Firebase or OpenAI is required.

### Learning-mode switcher

- A three-part segmented control: Roadmap, Skill practice, My Progress.
- Selected state uses an amber keyline and warm surface rather than a bright solid block.
- The control remains horizontally scrollable at very narrow widths without clipping labels.

### Roadmap

- The three phases read as a vertical sequence with a numbered rail.
- Each lesson card exposes lesson number, lock/ready/complete state, title, skill, duration, and recommendation.
- The selected lesson briefing is visually raised and sticky only on wide viewports.

### Investigation workspace

- A workflow rail exposes Observe → Hypothesize → Repair → Verify.
- Wide screens use brief / code-and-evidence / journal columns.
- Test output is an evidence well, not a decorative terminal.
- Primary test and submission controls stay visually distinct.

### Progress and identity

- Metrics are displayed as practice evidence, never grades or certification.
- Optional account controls are secondary to local progress.
- Guest/local state is always legible and never styled as an error.
- Destructive account/data actions remain visually separated from primary sync actions.

### Report

- The verification verdict leads.
- Test authority is shown before reasoning dimensions.
- Strength, improvement, next practice, and guided-roadmap updates follow in that order.

## Accessibility and performance constraints

- WCAG AA contrast is required for text and interactive states.
- Every interaction has a visible keyboard focus state.
- Color is never the only status signal; labels and symbols accompany it.
- Touch targets should be at least 40 px tall for primary controls.
- Motion honors reduced-motion preferences.
- No design asset may weaken the validated fixture fallback, add a required network request, expose a credential, or relax the existing CSP.
- Core learning, identity, validation, and report interactions remain CSS/React-only. GSAP is permitted only for the progressively enhanced Debugging Case File below the active learning controls; it is dynamically imported on desktop near the viewport and is never required for product functionality.

## Debugging Case File motion boundary

- The explanatory sequence demonstrates Observe → Hypothesize → Repair → Verify with a fictional retry-boundary example that does not match a curated fixture.
- Desktop uses ordinary document scrolling, a CSS-sticky monitor, restrained CSS perspective, and interruptible GSAP/ScrollTrigger stage timelines. It does not pin, snap, smooth, normalize, or hijack scrolling.
- GSAP and ScrollTrigger load only within 400 px of the section and only at 1024 px or wider when reduced motion is not requested.
- Stage motion changes only transform and opacity. The monitor stays within `rotateX(1deg–2deg)` and `rotateY(-8deg–4deg)`; line stagger is 40 ms and the explanatory transition is 420 ms with a strong ease-out.
- Mobile, reduced-motion, JavaScript-disabled, and dynamic-import-failure paths remain static semantic content. The practice controls appear before the narrative.
- Idle Forge motion is removed; continuous pulse remains limited to active challenge validation. Progress fills animate with `scaleX`, not layout width.

## Acceptance views

The visual system is not complete until these states have objective evidence at both 1440×900 and 390×844 where applicable:

- Guided roadmap, first lesson selected
- Skill-practice configuration
- My Progress as guest and with optional sync controls
- Challenge validation
- Investigation workspace with failing evidence
- Investigation workspace with a hypothesis and patch
- Verified report
- Not-verified report
- Firebase disabled/degraded local fallback
- Debugging Case File at Observe, Hypothesize, Repair, and Verify
- Desktop-enhanced → mobile-static and desktop-enhanced → reduced-motion-static teardown
