"use client";

/**
 * Marquee animated debugging demonstration for the landing hero.
 *
 * A self-playing, looping terminal session that types a command, runs it,
 * streams a failure, hypothesizes a cause, applies a minimal repair, and
 * verifies the fix — the same Observe → Hypothesize → Repair → Verify loop
 * as the Debugging Case File below it, in a fictional pagination scenario
 * that never reuses a curated fixture's file name, failure signature, hint,
 * root cause, or repair (see src/server/fixtures.ts).
 *
 * Contract:
 * - React state + CSS only. This file does not import GSAP and must never
 *   be reached by the case-file's dynamic `import("gsap")` boundary.
 * - The stage timeline (`DEMO_STAGES`) and every function that reads it are
 *   pure and exported for unit testing; the component itself only wires
 *   them to a ticking clock.
 * - `prefers-reduced-motion` skips the clock entirely and renders the final
 *   verified frame statically — no timers, no loop.
 * - The animated terminal is `aria-hidden`; a single sr-only paragraph
 *   states the whole loop's outcome once. A visible, keyboard-operable
 *   Pause/Play control (WCAG 2.2.2) sits outside the hidden subtree and
 *   genuinely stops the clock — it does not just pause a CSS animation.
 * - The clock also stops (without touching the user's own pause choice)
 *   while the demo is off-screen or the tab is hidden.
 */

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { TerminalFrame } from "@/components/terminal-frame";

/* ============================================================================
 * Pure stage-sequencing logic — unit-tested in debugging-demo.test.ts.
 * Nothing below this line touches React, the DOM, or a timer.
 * ========================================================================= */

export type DemoStageId =
  | "typing"
  | "running"
  | "failing"
  | "hypothesize"
  | "repair"
  | "verifyTyping"
  | "verifyRunning"
  | "verifyOutput"
  | "pause";

export interface DemoStage {
  readonly id: DemoStageId;
  readonly durationMs: number;
}

/** Full loop ≈20.8s — within the 18–26s "legible, never frantic" target. */
export const DEMO_STAGES: readonly DemoStage[] = [
  { id: "typing", durationMs: 1800 },
  { id: "running", durationMs: 900 },
  { id: "failing", durationMs: 3600 },
  { id: "hypothesize", durationMs: 3000 },
  { id: "repair", durationMs: 2600 },
  { id: "verifyTyping", durationMs: 1400 },
  { id: "verifyRunning", durationMs: 700 },
  { id: "verifyOutput", durationMs: 2800 },
  { id: "pause", durationMs: 4000 },
];

export function totalDemoDurationMs(stages: readonly DemoStage[] = DEMO_STAGES): number {
  return stages.reduce((sum, stage) => sum + stage.durationMs, 0);
}

export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export interface DemoStageProgress {
  readonly stage: DemoStageId;
  readonly index: number;
  /** Milliseconds elapsed since this stage began, clamped to its duration. */
  readonly elapsedInStageMs: number;
  /** 0..1 position within the current stage. */
  readonly progress: number;
}

/**
 * Pure: maps an arbitrary (monotonically increasing) elapsed-ms clock onto a
 * looping stage timeline. `elapsedMs` may exceed one full loop — it wraps.
 */
export function stageAtElapsed(
  elapsedMs: number,
  stages: readonly DemoStage[] = DEMO_STAGES,
): DemoStageProgress {
  const total = totalDemoDurationMs(stages);
  const first = stages[0];
  if (!first || total <= 0) {
    return { stage: first?.id ?? "pause", index: 0, elapsedInStageMs: 0, progress: 0 };
  }

  const loopElapsed = ((elapsedMs % total) + total) % total;
  let cursor = 0;
  for (let index = 0; index < stages.length; index += 1) {
    const stage = stages[index];
    const isLast = index === stages.length - 1;
    if (loopElapsed < cursor + stage.durationMs || isLast) {
      const elapsedInStageMs = Math.min(Math.max(loopElapsed - cursor, 0), stage.durationMs);
      return {
        stage: stage.id,
        index,
        elapsedInStageMs,
        progress: stage.durationMs <= 0 ? 1 : clamp01(elapsedInStageMs / stage.durationMs),
      };
    }
    cursor += stage.durationMs;
  }

  // Unreachable given the loop above always returns on its last iteration;
  // kept only so the function has a total return type.
  const last = stages[stages.length - 1];
  return { stage: last.id, index: stages.length - 1, elapsedInStageMs: last.durationMs, progress: 1 };
}

/** Pure: how many characters of `text` a typewriter has revealed by `progress`. */
export function typedLength(progress: number, text: string): number {
  return Math.min(text.length, Math.floor(clamp01(progress) * text.length));
}

/** Pure: how many of `totalLines` staggered lines are visible at `progress`. */
export function visibleLineCount(progress: number, totalLines: number): number {
  if (totalLines <= 0) return 0;
  const p = clamp01(progress);
  if (p <= 0) return 0;
  return Math.min(totalLines, Math.ceil(p * totalLines));
}

/** Pure: cycles through a fixed spinner glyph set at a fixed frame rate. */
export function spinnerFrame(elapsedInStageMs: number, frames: readonly string[], frameMs = 110): string {
  if (frames.length === 0) return "";
  const index = Math.floor(Math.max(0, elapsedInStageMs) / frameMs) % frames.length;
  return frames[index] ?? frames[0];
}

/* ============================================================================
 * Fictional demonstration content.
 *
 * A cursor-based pagination bug — distinct in domain, file names, and
 * failure signature from every curated fixture in src/server/fixtures.ts
 * (approval thresholds, reservation idempotency, notification channels) and
 * from the Debugging Case File's retry-boundary example, so the landing
 * page never tells the same story twice.
 * ========================================================================= */

const COMMAND = "pytest -q test_cursor_pagination.py";

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧"] as const;

const FAILING_SEQUENCE = [
  { kind: "test", status: "PASSED", text: "test_first_page_returns_expected_items" },
  { kind: "test", status: "PASSED", text: "test_middle_page_advances_offset" },
  { kind: "test", status: "FAILED", text: "test_last_page_is_not_skipped" },
  { kind: "assert", text: "AssertionError: expected page_count=4, received page_count=3" },
] as const;

const HYPOTHESIS =
  "Floor division drops the final partial page: total // page_size undercounts by one whenever a remainder exists.";

const VERIFY_LINES = [
  "test_first_page_returns_expected_items",
  "test_middle_page_advances_offset",
  "test_last_page_is_not_skipped",
] as const;

const VERIFIED_SUMMARY = "3 passed · 0 failed · 0.04s";

const SR_SUMMARY =
  "Demonstration loop: pytest run on test_cursor_pagination.py fails test_last_page_is_not_skipped — " +
  "expected page_count 4, received 3 — because floor division drops the final partial page. " +
  "Hypothesis: total // page_size undercounts whenever a remainder exists. " +
  "Repair: change total // page_size to math.ceil(total / page_size). " +
  `Re-running the suite passes all tests: ${VERIFIED_SUMMARY}.`;

type StatusTone = "amber" | "red" | "cyan" | "green";

function statusForStage(stage: DemoStageId, verifiedVisible: number): { tone: StatusTone; label: string; metrics: string } {
  switch (stage) {
    case "typing":
      return { tone: "amber", label: "Typing command", metrics: "—" };
    case "running":
      return { tone: "amber", label: "Running in isolation", metrics: "—" };
    case "failing":
      return { tone: "red", label: "1 failed · 2 passed", metrics: "captured" };
    case "hypothesize":
      return { tone: "amber", label: "Cause hypothesized", metrics: "reasoned" };
    case "repair":
      return { tone: "cyan", label: "Patch applied", metrics: "1 line changed" };
    case "verifyTyping":
    case "verifyRunning":
      return { tone: "cyan", label: "Re-running full suite", metrics: "—" };
    case "verifyOutput":
      return verifiedVisible >= VERIFY_LINES.length
        ? { tone: "green", label: "Repair verified", metrics: VERIFIED_SUMMARY }
        : { tone: "cyan", label: "Re-running full suite", metrics: "—" };
    case "pause":
      return { tone: "green", label: "Repair verified", metrics: VERIFIED_SUMMARY };
    default:
      return { tone: "amber", label: "Investigating", metrics: "—" };
  }
}

function phaseLabelForStage(stage: DemoStageId): string {
  switch (stage) {
    case "typing":
      return "OBSERVE / RUN THE SUITE";
    case "running":
      return "OBSERVE / EXECUTING";
    case "failing":
      return "OBSERVE / FAILURE CAPTURED";
    case "hypothesize":
      return "HYPOTHESIZE / CAUSAL NOTE";
    case "repair":
      return "REPAIR / MINIMAL DIFF";
    case "verifyTyping":
      return "VERIFY / RE-RUN THE SUITE";
    case "verifyRunning":
      return "VERIFY / EXECUTING";
    case "verifyOutput":
    case "pause":
      return "VERIFY / PROOF SEALED";
    default:
      return "OBSERVE";
  }
}

/* ============================================================================
 * Rendering.
 * ========================================================================= */

function CommandLine({ typed, showCursor }: { typed: string; showCursor: boolean }) {
  return (
    <div className="debug-demo-command">
      <span className="text-zinc-500">$</span> {typed}
      {showCursor ? <span className="debug-demo-cursor" aria-hidden="true" /> : null}
    </div>
  );
}

function FailingLine({ line, index }: { line: (typeof FAILING_SEQUENCE)[number]; index: number }) {
  if (line.kind === "assert") {
    return (
      <div className="debug-demo-line debug-demo-line-assert" style={{ animationDelay: `${index * 70}ms` }}>
        {line.text}
      </div>
    );
  }
  const isFail = line.status === "FAILED";
  return (
    <div
      className={`debug-demo-line${isFail ? " debug-demo-line-fail" : ""}`}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <span className={`debug-demo-status debug-demo-status-${line.status.toLowerCase()}`}>{line.status}</span>{" "}
      {line.text}
    </div>
  );
}

function VerifyBlock({ visibleCount }: { visibleCount: number }) {
  const sealed = visibleCount >= VERIFY_LINES.length;
  return (
    <>
      <CommandLine typed={COMMAND} showCursor={false} />
      <div className="debug-demo-stream">
        {VERIFY_LINES.slice(0, visibleCount).map((text, index) => (
          <div key={text} className="debug-demo-line" style={{ animationDelay: `${index * 70}ms` }}>
            <span className="debug-demo-status debug-demo-status-passed">PASSED</span> {text}
          </div>
        ))}
      </div>
      {sealed ? (
        <div className="case-verified-seal debug-demo-seal">
          <span className="case-seal-mark" aria-hidden="true">
            ✓
          </span>
          <div>
            <strong>Repair verified</strong>
            <br />
            {VERIFIED_SUMMARY}
          </div>
        </div>
      ) : null}
    </>
  );
}

function StageContent({ progress }: { progress: DemoStageProgress }) {
  switch (progress.stage) {
    case "typing": {
      const typed = COMMAND.slice(0, typedLength(progress.progress, COMMAND));
      return <CommandLine typed={typed} showCursor />;
    }
    case "running": {
      const glyph = spinnerFrame(progress.elapsedInStageMs, SPINNER_FRAMES);
      return (
        <>
          <CommandLine typed={COMMAND} showCursor={false} />
          <div className="debug-demo-spinner-line">
            <span className="debug-demo-spinner" aria-hidden="true">
              {glyph}
            </span>
            collecting 4 items…
          </div>
        </>
      );
    }
    case "failing": {
      const visible = visibleLineCount(progress.progress, FAILING_SEQUENCE.length);
      return (
        <>
          <CommandLine typed={COMMAND} showCursor={false} />
          <div className="debug-demo-stream">
            {FAILING_SEQUENCE.slice(0, visible).map((line, index) => (
              <FailingLine key={line.text} line={line} index={index} />
            ))}
          </div>
        </>
      );
    }
    case "hypothesize": {
      const typed = HYPOTHESIS.slice(0, typedLength(progress.progress, HYPOTHESIS));
      const showCursor = progress.progress < 1;
      return (
        <div className="case-causal-note debug-demo-hypothesis">
          <span className="case-causal-arrow" aria-hidden="true">
            ↳
          </span>
          <div>
            <strong>Hypothesis</strong>
            <br />
            {typed}
            {showCursor ? <span className="debug-demo-cursor" aria-hidden="true" /> : null}
          </div>
        </div>
      );
    }
    case "repair": {
      return (
        <div className="case-diff debug-demo-diff">
          <div className="case-diff-remove">
            <span>-</span> return total <strong className="debug-demo-diff-token">{"//"}</strong> page_size
          </div>
          <div className="case-diff-add">
            <span>+</span> return <strong className="debug-demo-diff-token">math.ceil</strong>(total / page_size)
          </div>
        </div>
      );
    }
    case "verifyTyping": {
      const typed = COMMAND.slice(0, typedLength(progress.progress, COMMAND));
      return <CommandLine typed={typed} showCursor />;
    }
    case "verifyRunning": {
      const glyph = spinnerFrame(progress.elapsedInStageMs, SPINNER_FRAMES);
      return (
        <>
          <CommandLine typed={COMMAND} showCursor={false} />
          <div className="debug-demo-spinner-line">
            <span className="debug-demo-spinner" aria-hidden="true">
              {glyph}
            </span>
            re-collecting 3 items…
          </div>
        </>
      );
    }
    case "verifyOutput": {
      const visible = visibleLineCount(progress.progress, VERIFY_LINES.length);
      return <VerifyBlock visibleCount={visible} />;
    }
    case "pause":
    default:
      return <VerifyBlock visibleCount={VERIFY_LINES.length} />;
  }
}

const TICK_MS = 60;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Server snapshots assume the SSR-safe defaults (full motion, tab visible)
 * so hydration never has to reconcile a mismatched first paint; the real
 * value takes over on the client via useSyncExternalStore's resubscribe. */
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

function subscribeTabVisible(onStoreChange: () => void) {
  document.addEventListener("visibilitychange", onStoreChange);
  return () => document.removeEventListener("visibilitychange", onStoreChange);
}
function getTabVisibleSnapshot() {
  return !document.hidden;
}
function getTabVisibleServerSnapshot() {
  return true;
}

export function DebuggingDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
  const tabVisible = useSyncExternalStore(subscribeTabVisible, getTabVisibleSnapshot, getTabVisibleServerSnapshot);
  const [userPlaying, setUserPlaying] = useState(true);
  const [inViewport, setInViewport] = useState(true);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    const node = rootRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setInViewport(entry.isIntersecting);
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [reducedMotion]);

  // The user's own toggle is tracked separately from the automatic
  // off-screen/tab-hidden pause so the Pause/Play label always reflects the
  // learner's own choice, not incidental scroll position.
  const playing = userPlaying && inViewport && tabVisible && !reducedMotion;

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setElapsedMs((previous) => previous + TICK_MS);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [playing]);

  const progress = useMemo(
    () => (reducedMotion ? stageAtElapsed(totalDemoDurationMs() - 1) : stageAtElapsed(elapsedMs)),
    [reducedMotion, elapsedMs],
  );

  const verifiedVisible = progress.stage === "verifyOutput" ? visibleLineCount(progress.progress, VERIFY_LINES.length) : VERIFY_LINES.length;
  const status = statusForStage(progress.stage, verifiedVisible);

  return (
    <div className="landing-console debug-demo" ref={rootRef}>
      <div aria-hidden="true">
        <TerminalFrame
          label="cursor_paginator.py · live demo trace"
          meta="DEMO-118"
          bodyClassName="landing-console-body debug-demo-body"
        >
          <div className="case-terminal-label debug-demo-phase-label">{phaseLabelForStage(progress.stage)}</div>
          <div key={progress.stage} className="debug-demo-stage">
            <StageContent progress={progress} />
          </div>
        </TerminalFrame>
        <div className="landing-console-footer debug-demo-footer">
          <span>
            <i className={`debug-demo-dot debug-demo-dot-${status.tone}`} /> {status.label}
          </span>
          <span>{status.metrics}</span>
        </div>
      </div>

      {reducedMotion ? null : (
        <div className="debug-demo-toolbar">
          <button
            type="button"
            className="debug-demo-toggle focus-brackets"
            aria-label={`${userPlaying ? "Pause" : "Play"} debugging demo animation`}
            onClick={() => setUserPlaying((previous) => !previous)}
          >
            <span aria-hidden="true" className="debug-demo-toggle-glyph">
              {userPlaying ? "❚❚" : "▶"}
            </span>
            <span aria-hidden="true">{userPlaying ? "Pause" : "Play"}</span>
          </button>
        </div>
      )}

      <p className="sr-only">{SR_SUMMARY}</p>
    </div>
  );
}
