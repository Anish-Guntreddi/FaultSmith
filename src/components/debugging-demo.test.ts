import { describe, expect, it } from "vitest";

import {
  DEMO_STAGES,
  clamp01,
  spinnerFrame,
  stageAtElapsed,
  totalDemoDurationMs,
  typedLength,
  visibleLineCount,
} from "@/components/debugging-demo";

describe("totalDemoDurationMs", () => {
  it("sums every stage's duration", () => {
    const total = DEMO_STAGES.reduce((sum, stage) => sum + stage.durationMs, 0);
    expect(totalDemoDurationMs()).toBe(total);
  });

  it("keeps the full loop inside the mandated 18-26s legible range", () => {
    const total = totalDemoDurationMs();
    expect(total).toBeGreaterThanOrEqual(18_000);
    expect(total).toBeLessThanOrEqual(26_000);
  });

  it("sums an arbitrary stage list", () => {
    expect(totalDemoDurationMs([{ id: "typing", durationMs: 100 }, { id: "pause", durationMs: 250 }])).toBe(350);
  });
});

describe("clamp01", () => {
  it("clamps below zero to zero", () => {
    expect(clamp01(-4)).toBe(0);
  });

  it("clamps above one to one", () => {
    expect(clamp01(3.2)).toBe(1);
  });

  it("passes values already in range through unchanged", () => {
    expect(clamp01(0.42)).toBe(0.42);
  });

  it("treats NaN as zero", () => {
    expect(clamp01(Number.NaN)).toBe(0);
  });
});

describe("stageAtElapsed", () => {
  it("starts on the first stage at elapsed=0", () => {
    const result = stageAtElapsed(0);
    expect(result.stage).toBe(DEMO_STAGES[0].id);
    expect(result.index).toBe(0);
    expect(result.elapsedInStageMs).toBe(0);
    expect(result.progress).toBe(0);
  });

  it("reports progress within a stage", () => {
    const halfway = DEMO_STAGES[0].durationMs / 2;
    const result = stageAtElapsed(halfway);
    expect(result.stage).toBe(DEMO_STAGES[0].id);
    expect(result.elapsedInStageMs).toBe(halfway);
    expect(result.progress).toBeCloseTo(0.5, 5);
  });

  it("advances to the next stage exactly at its boundary", () => {
    const boundary = DEMO_STAGES[0].durationMs;
    const result = stageAtElapsed(boundary);
    expect(result.stage).toBe(DEMO_STAGES[1].id);
    expect(result.index).toBe(1);
    expect(result.elapsedInStageMs).toBe(0);
  });

  it("walks through every stage id in order across one full loop", () => {
    let cursor = 0;
    for (const [index, stage] of DEMO_STAGES.entries()) {
      const midpoint = cursor + stage.durationMs / 2;
      const result = stageAtElapsed(midpoint);
      expect(result.stage).toBe(stage.id);
      expect(result.index).toBe(index);
      cursor += stage.durationMs;
    }
  });

  it("loops back to the first stage after the total duration", () => {
    const total = totalDemoDurationMs();
    const result = stageAtElapsed(total);
    expect(result.stage).toBe(DEMO_STAGES[0].id);
    expect(result.elapsedInStageMs).toBe(0);
  });

  it("loops correctly for elapsed values several cycles past one loop", () => {
    const total = totalDemoDurationMs();
    const withinLoop = 5_000;
    const manyLoopsLater = total * 4 + withinLoop;
    expect(stageAtElapsed(manyLoopsLater)).toEqual(stageAtElapsed(withinLoop));
  });

  it("never throws and always returns a valid stage for negative elapsed input", () => {
    const result = stageAtElapsed(-500);
    expect(DEMO_STAGES.some((stage) => stage.id === result.stage)).toBe(true);
    expect(result.progress).toBeGreaterThanOrEqual(0);
    expect(result.progress).toBeLessThanOrEqual(1);
  });

  it("never reports elapsedInStageMs greater than the active stage's own duration", () => {
    const total = totalDemoDurationMs();
    for (let elapsed = 0; elapsed < total; elapsed += 137) {
      const result = stageAtElapsed(elapsed);
      const stage = DEMO_STAGES[result.index];
      expect(result.elapsedInStageMs).toBeLessThanOrEqual(stage.durationMs);
      expect(result.elapsedInStageMs).toBeGreaterThanOrEqual(0);
    }
  });

  it("falls back to a zeroed first stage for an empty stage list", () => {
    const result = stageAtElapsed(1_000, []);
    expect(result.index).toBe(0);
    expect(result.progress).toBe(0);
  });

  it("lands on the final stage right at the very end of the loop", () => {
    const total = totalDemoDurationMs();
    const result = stageAtElapsed(total - 1);
    expect(result.stage).toBe(DEMO_STAGES[DEMO_STAGES.length - 1].id);
  });
});

describe("typedLength", () => {
  const text = "pytest -q test_cursor_pagination.py";

  it("shows nothing at progress 0", () => {
    expect(typedLength(0, text)).toBe(0);
  });

  it("shows everything at progress 1", () => {
    expect(typedLength(1, text)).toBe(text.length);
  });

  it("is monotonically non-decreasing as progress rises", () => {
    let previous = 0;
    for (let progress = 0; progress <= 1; progress += 0.05) {
      const length = typedLength(progress, text);
      expect(length).toBeGreaterThanOrEqual(previous);
      previous = length;
    }
  });

  it("never exceeds the text length even for out-of-range progress", () => {
    expect(typedLength(5, text)).toBe(text.length);
    expect(typedLength(-1, text)).toBe(0);
  });

  it("handles empty text without throwing", () => {
    expect(typedLength(0.5, "")).toBe(0);
  });
});

describe("visibleLineCount", () => {
  it("shows no lines at progress 0", () => {
    expect(visibleLineCount(0, 4)).toBe(0);
  });

  it("shows all lines at progress 1", () => {
    expect(visibleLineCount(1, 4)).toBe(4);
  });

  it("reveals lines one at a time as progress advances through even fractions", () => {
    expect(visibleLineCount(0.26, 4)).toBe(2);
    expect(visibleLineCount(0.5, 4)).toBe(2);
    expect(visibleLineCount(0.51, 4)).toBe(3);
  });

  it("returns 0 for zero or negative total lines", () => {
    expect(visibleLineCount(0.5, 0)).toBe(0);
    expect(visibleLineCount(0.5, -2)).toBe(0);
  });

  it("clamps progress outside 0..1", () => {
    expect(visibleLineCount(-1, 3)).toBe(0);
    expect(visibleLineCount(2, 3)).toBe(3);
  });
});

describe("spinnerFrame", () => {
  const frames = ["a", "b", "c", "d"] as const;

  it("starts on the first frame", () => {
    expect(spinnerFrame(0, frames, 100)).toBe("a");
  });

  it("cycles through frames on schedule", () => {
    expect(spinnerFrame(100, frames, 100)).toBe("b");
    expect(spinnerFrame(250, frames, 100)).toBe("c");
  });

  it("wraps back to the first frame after a full cycle", () => {
    expect(spinnerFrame(400, frames, 100)).toBe("a");
  });

  it("returns an empty string for an empty frame set", () => {
    expect(spinnerFrame(500, [], 100)).toBe("");
  });

  it("treats negative elapsed as the first frame", () => {
    expect(spinnerFrame(-50, frames, 100)).toBe("a");
  });
});
