# FaultSmith Animation Plans

| Plan | Title | Severity | Status |
| --- | --- | --- | --- |
| 001 | Build the scroll-driven Debugging Case File | Medium | DONE |
| 002 | Tighten high-frequency motion hygiene | Medium | DONE |

## Execution record

1. Completed `002-motion-hygiene.md` first so the shared motion tokens and idle-motion boundary were stable.
2. Completed `001-debugging-case-file.md` second using those shared easing tokens while keeping the narrative functionally isolated.
3. Reviewed the combined result at 1440×900, 390×844, and reduced motion before running full gates.

Both plans were authored against commit `60d7e45`; their final implementation and evidence ship together in the subsequent animation checkpoint.
