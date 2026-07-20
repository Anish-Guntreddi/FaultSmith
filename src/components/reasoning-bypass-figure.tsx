"use client";

/**
 * Signature illustration for the landing page's problem-statement section
 * (docs/design/PROBLEM_STATEMENT_SECTION_BRIEF.md, "Reasoning Bypass
 * Circuit"). A fictional dependency schematic: one observed failure splits
 * into a cyan "generated diff" shortcut that registers three accepted
 * outputs, while the amber learner route — read evidence, form hypothesis,
 * prove repair — goes unused and is marked BYPASSED on every node. A final
 * unfamiliar-codebase task then reaches an explicit BLOCKED outcome.
 *
 * Deliberately distinct from the hero's terminal-typing loop and the
 * Debugging Case File's four-stage success story: no terminal chrome, no
 * source, no test output, and nothing here is verified (no green).
 *
 * Contract:
 * - CSS/React only — no GSAP, no scroll-linked motion. Only `transform`,
 *   `opacity`, and `clip-path` animate (see the `.rb-*` rules in globals.css).
 * - The complete automatic sequence is one shot, ~3.48s (under the WCAG
 *   2.2.2 five-second threshold), and plays once when the figure crosses
 *   35% viewport visibility. It never loops.
 * - `prefers-reduced-motion: reduce`, a missing `IntersectionObserver`, a
 *   disabled-JS request, or a hydration failure all leave the server-
 *   rendered figure in its complete static end state — that state is the
 *   default CSS with no `data-motion` upgrade applied (see globals.css).
 * - "Replay trace" restarts the one-shot sequence by re-keying only the
 *   inner animated canvas; the button itself never unmounts, so keyboard
 *   focus survives the replay.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Badge, Button, Card } from "@/components/ui";

type MotionState = "static" | "ready" | "playing";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Server snapshot assumes full motion so hydration never has to reconcile
 * a mismatched first paint — mirrors the same pattern used by
 * debugging-demo.tsx's reduced-motion detection. */
function subscribeReducedMotion(onStoreChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
}
function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}
function getReducedMotionServerSnapshot() {
  return false;
}

/** Server snapshot optimistically assumes IntersectionObserver support (true
 * for essentially every real visitor) so hydration never has to reconcile a
 * mismatched first paint; useSyncExternalStore's contract lets the real
 * client value take over immediately after mount without a hydration
 * warning if a legacy browser ever disagrees. */
function subscribeIntersectionObserverSupport() {
  return () => {};
}
function getIntersectionObserverSupportSnapshot() {
  return typeof window.IntersectionObserver !== "undefined";
}
function getIntersectionObserverSupportServerSnapshot() {
  return true;
}

const REASONING_NODES = [
  { id: "evidence", number: "01", label: "READ EVIDENCE" },
  { id: "hypothesis", number: "02", label: "FORM HYPOTHESIS" },
  { id: "repair", number: "03", label: "PROVE REPAIR" },
] as const;

export function ReasoningBypassFigure() {
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
  const supportsIntersectionObserver = useSyncExternalStore(
    subscribeIntersectionObserverSupport,
    getIntersectionObserverSupportSnapshot,
    getIntersectionObserverSupportServerSnapshot,
  );
  const canAnimate = !reducedMotion && supportsIntersectionObserver;

  const [playing, setPlaying] = useState(false);
  const [playKey, setPlayKey] = useState(0);
  const figureRef = useRef<HTMLDivElement>(null);

  // `motionState` is derived, not stored: the complete static end state
  // (`canAnimate` false) is always the immediate consequence of reduced
  // motion or a missing IntersectionObserver — including the instant that
  // preference changes mid-sequence — with no separate effect required to
  // "catch up" and reset it.
  const motionState: MotionState = !canAnimate ? "static" : playing ? "playing" : "ready";

  useEffect(() => {
    if (!canAnimate) return;
    const node = figureRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setPlaying(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [canAnimate]);

  function handleReplay() {
    // Re-key only the inner canvas so it remounts already in the "playing"
    // state — CSS animations on a freshly inserted node start fresh, no
    // separate "ready" hand-off needed — while the section, the figure
    // chrome, and this button itself never unmount, so focus is retained.
    setPlayKey((key) => key + 1);
    setPlaying(true);
  }

  return (
    <Card
      as="figure"
      variant="raised"
      padding="none"
      className="reasoning-bypass-figure"
      aria-labelledby="dependency-trace-title"
      aria-describedby="dependency-trace-caption"
    >
      <div className="rb-header">
        <div className="rb-header-left">
          <span id="dependency-trace-title" className="instrument-label rb-title">
            Dependency trace
          </span>
          <Badge variant="neutral" glyph="◆">
            Fictional schematic
          </Badge>
        </div>
        {reducedMotion ? null : (
          // No `size="sm"` here on purpose: .ui-btn-sm's min-height (36px)
          // would undercut .ghost-action's own 2.55rem (~41px), and this
          // control needs a genuine 40px+ touch target on mobile.
          <Button
            type="button"
            variant="ghost"
            aria-label="Replay dependency trace"
            className="rb-replay"
            onClick={handleReplay}
          >
            <span aria-hidden="true">↻</span> Replay trace
          </Button>
        )}
      </div>

      <div ref={figureRef} className="rb-canvas-wrap">
        <div key={playKey} className="rb-canvas" data-motion={motionState} aria-hidden="true">
          <div className="rb-diagram">
            <div className="rb-branch">
              <div className="rb-failure">
                <Badge variant="failure" glyph="×">
                  Failure
                </Badge>
                <span className="rb-subtext">Observed symptom</span>
              </div>

              <div className="rb-rails">
                <div className="rb-rail rb-rail-shortcut">
                  <div className="rb-rail-label rb-rail-label-cyan">
                    <span aria-hidden="true">{"// "}</span>
                    Model shortcut
                    <span className="rb-rail-sublabel">Generated diff</span>
                  </div>
                  <div className="rb-rail-track">
                    <span className="rb-rail-track-fill" />
                  </div>
                  <div className="rb-accepts">
                    <Badge variant="instrument" glyph="▹" className="rb-accept">
                      Accept 01
                    </Badge>
                    <Badge variant="instrument" glyph="▹" className="rb-accept">
                      Accept 02
                    </Badge>
                    <Badge variant="instrument" glyph="▹" className="rb-accept">
                      Accept 03
                    </Badge>
                  </div>
                </div>

                <div className="rb-rail rb-rail-reasoning">
                  <div className="rb-rail-label rb-rail-label-amber">Reasoning path</div>
                  <div className="rb-nodes">
                    {REASONING_NODES.map((node) => (
                      <div key={node.id} className="rb-node">
                        <span className="rb-node-active" />
                        <span className="rb-node-connector" />
                        <span className="rb-node-text">
                          <span className="rb-node-number">{node.number}</span> {node.label}
                        </span>
                        <Badge variant="neutral" glyph="▪" className="rb-node-badge">
                          Bypassed
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rb-next-task">
              <div className="rb-next-task-item">
                <span className="rb-tag-label">Next task</span>
                <span className="rb-next-task-text">Unfamiliar codebase</span>
              </div>
              <div className="rb-next-task-arrow">
                <span aria-hidden="true">→</span> Debug independently
              </div>
              <div className="rb-blocked">
                <Badge variant="failure" glyph="×">
                  Blocked
                </Badge>
                <span className="rb-subtext">Causal model not formed</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <figcaption id="dependency-trace-caption" className="rb-caption">
        A working diff is an output. Debugging skill is the path that produced it.
      </figcaption>
    </Card>
  );
}
