import { describe, expect, it } from "vitest";

import { appendAnonymousAttemptEvent } from "./attempt-events";

describe("anonymous attempt event log", () => {
  it("records only bounded, non-learner event metadata", () => {
    const events = appendAnonymousAttemptEvent(
      [{ name: "unknown", occurredAt: 1, learnerText: "secret hypothesis" }],
      {
        name: "project_selected",
        projectId: "inventory",
        outcome: "selected",
      },
      42,
    );

    expect(events).toEqual([
      {
        name: "project_selected",
        projectId: "inventory",
        outcome: "selected",
        occurredAt: 42,
      },
    ]);
    expect(JSON.stringify(events)).not.toContain("hypothesis");
  });

  it("caps retained events at one hundred", () => {
    let events: unknown = [];
    for (let index = 0; index < 120; index += 1) {
      events = appendAnonymousAttemptEvent(
        events,
        { name: "test_run_completed", outcome: "passed" },
        index,
      );
    }

    expect(events).toHaveLength(100);
    expect((events as Array<{ occurredAt: number }>)[0].occurredAt).toBe(20);
  });
});
