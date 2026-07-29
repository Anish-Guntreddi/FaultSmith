import { describe, expect, it } from "vitest";

import {
  attemptOutcomeIdentity,
  buildLearnerProfile,
  mergeCloudLearnerProfiles,
  mergeLearnerProfiles,
  migrateLearningProgressV1,
  parseLearnerProfile,
  recordAttemptSummary,
  recordProfileAttempt,
} from "./progress-merge";
import { emptyLearnerProfile, type AttemptSummary } from "./progress-contracts";

const baseAttempt: AttemptSummary = {
  attemptId: "attempt-0000-0001",
  lessonId: "evidence-boundaries",
  projectId: "expense-approval",
  skill: "Boundary conditions",
  difficulty: "beginner",
  challengeSource: "prevalidated",
  status: "verified",
  rootCauseScore: 90,
  reasoningScore: 86,
  patchDisciplineScore: 94,
  conceptUnderstandingScore: 90,
  hintsUsed: 0,
  testRuns: 3,
  changedLines: 2,
  durationBucket: "under_5_minutes",
  completedAt: 1_000,
  provenance: "server_verified",
};

function attempt(overrides: Partial<AttemptSummary> = {}): AttemptSummary {
  return { ...baseAttempt, ...overrides };
}

const v1Progress = {
  version: 1,
  completions: [
    { stepId: "evidence-boundaries", completedAt: 10, overallScore: 88, hintsUsed: 1, testRuns: 2 },
    { stepId: "evidence-booleans", completedAt: 20, overallScore: 92, hintsUsed: 0, testRuns: 1 },
    { stepId: "evidence-validation", completedAt: 30, overallScore: 90, hintsUsed: 0, testRuns: 1, hypothesis: "private prose" },
    { stepId: "unknown-step", completedAt: 40, overallScore: 90, hintsUsed: 0, testRuns: 1 },
  ],
};

describe("migrateLearningProgressV1", () => {
  it("preserves valid v1 completions verbatim without fabricating attempt history", () => {
    const migrated = migrateLearningProgressV1(v1Progress);
    expect(migrated.version).toBe(2);
    expect(migrated.completions).toEqual([
      { stepId: "evidence-boundaries", completedAt: 10, overallScore: 88, hintsUsed: 1, testRuns: 2 },
      { stepId: "evidence-booleans", completedAt: 20, overallScore: 92, hintsUsed: 0, testRuns: 1 },
    ]);
    expect(migrated.attempts).toEqual([]);
    expect(JSON.stringify(migrated)).not.toContain("hypothesis");
  });

  it("returns an empty profile for garbage input", () => {
    expect(migrateLearningProgressV1("not progress")).toEqual(emptyLearnerProfile);
    expect(migrateLearningProgressV1({ version: 3, completions: [] })).toEqual(emptyLearnerProfile);
  });
});

describe("parseLearnerProfile", () => {
  it("round-trips a valid v2 profile", () => {
    const profile = {
      version: 2,
      completions: [
        { stepId: "evidence-boundaries", completedAt: 10, overallScore: 88, hintsUsed: 1, testRuns: 2 },
      ],
      attempts: [baseAttempt],
    };
    expect(parseLearnerProfile(profile)).toEqual(profile);
  });

  it("drops tampered entries while keeping the valid remainder", () => {
    const parsed = parseLearnerProfile({
      version: 2,
      completions: [
        { stepId: "evidence-boundaries", completedAt: 10, overallScore: 88, hintsUsed: 1, testRuns: 2 },
        { stepId: "evidence-booleans", completedAt: 20, overallScore: 92, hintsUsed: 0, testRuns: 1, explanation: "prose" },
      ],
      attempts: [baseAttempt, attempt({ attemptId: "attempt-0000-0002", changedLines: 99_999 })],
    });
    expect(parsed.completions.map((completion) => completion.stepId)).toEqual(["evidence-boundaries"]);
    expect(parsed.attempts).toEqual([baseAttempt]);
  });

  it("treats a v2 container with unknown keys as tampered", () => {
    expect(
      parseLearnerProfile({ version: 2, completions: [], attempts: [], accessToken: "secret" }),
    ).toEqual(emptyLearnerProfile);
  });

  it("migrates a v1 progress container and rejects everything else", () => {
    expect(parseLearnerProfile(v1Progress).completions).toHaveLength(2);
    expect(parseLearnerProfile(undefined)).toEqual(emptyLearnerProfile);
    expect(parseLearnerProfile([])).toEqual(emptyLearnerProfile);
  });
});

describe("recordAttemptSummary", () => {
  it("appends valid attempts and ignores invalid ones", () => {
    const first = recordAttemptSummary([], baseAttempt);
    expect(first).toEqual([baseAttempt]);
    expect(recordAttemptSummary(first, { attemptId: "attempt-0000-0002" })).toEqual(first);
    expect(recordAttemptSummary(first, attempt({ hintsUsed: 12 }))).toEqual(first);
  });

  it("replaces a duplicate idempotency identifier instead of duplicating it", () => {
    const history = recordAttemptSummary([baseAttempt], attempt({ completedAt: 2_000, testRuns: 9 }));
    expect(history).toHaveLength(1);
    expect(history[0].completedAt).toBe(2_000);
    expect(history[0].testRuns).toBe(9);
  });

  it("retains only the 50 most recent attempts", () => {
    const many = Array.from({ length: 50 }, (_, index) =>
      attempt({ attemptId: `attempt-${String(index).padStart(4, "0")}`, completedAt: index + 1 }),
    );
    const next = recordAttemptSummary(many, attempt({ attemptId: "attempt-latest-51", completedAt: 999 }));
    expect(next).toHaveLength(50);
    expect(next.some((item) => item.attemptId === "attempt-latest-51")).toBe(true);
    expect(next.some((item) => item.completedAt === 1)).toBe(false);
  });
});

describe("recordProfileAttempt", () => {
  it("records a verified guided attempt in both history and monotonic completions", () => {
    const profile = recordProfileAttempt(emptyLearnerProfile, baseAttempt);
    expect(profile.attempts).toEqual([baseAttempt]);
    expect(profile.completions).toEqual([
      { stepId: "evidence-boundaries", completedAt: 1_000, overallScore: 90, hintsUsed: 0, testRuns: 3 },
    ]);
  });

  it("keeps failing attempts as process evidence without claiming roadmap progress", () => {
    const profile = recordProfileAttempt(
      emptyLearnerProfile,
      attempt({ status: "not_verified", rootCauseScore: 20 }),
    );
    expect(profile.attempts).toHaveLength(1);
    expect(profile.completions).toEqual([]);
  });

  it("records verified catalog attempts without inventing a lesson completion", () => {
    const profile = recordProfileAttempt(
      emptyLearnerProfile,
      attempt({ lessonId: null, difficulty: "advanced" }),
    );
    expect(profile.attempts).toHaveLength(1);
    expect(profile.completions).toEqual([]);
  });

  it("ignores invalid attempts entirely", () => {
    const existing = recordProfileAttempt(emptyLearnerProfile, baseAttempt);
    expect(recordProfileAttempt(existing, attempt({ completedAt: -5 }))).toEqual(existing);
  });
});

describe("mergeLearnerProfiles", () => {
  const local = buildLearnerProfile(
    {
      version: 1,
      completions: [
        { stepId: "evidence-boundaries", completedAt: 10, overallScore: 70, hintsUsed: 2, testRuns: 5 },
      ],
    },
    [baseAttempt],
  );
  const remote = buildLearnerProfile(
    {
      version: 1,
      completions: [
        { stepId: "evidence-boundaries", completedAt: 25, overallScore: 91, hintsUsed: 0, testRuns: 2 },
        { stepId: "evidence-booleans", completedAt: 30, overallScore: 84, hintsUsed: 1, testRuns: 3 },
      ],
    },
    [attempt({ attemptId: "attempt-0000-0002", completedAt: 2_000 })],
  );

  it("merges per-lesson records monotonically with the latest record winning", () => {
    const merged = mergeLearnerProfiles(local, remote);
    expect(merged.completions).toEqual([
      { stepId: "evidence-boundaries", completedAt: 25, overallScore: 91, hintsUsed: 0, testRuns: 2 },
      { stepId: "evidence-booleans", completedAt: 30, overallScore: 84, hintsUsed: 1, testRuns: 3 },
    ]);
    expect(merged.attempts.map((item) => item.attemptId)).toEqual([
      "attempt-0000-0001",
      "attempt-0000-0002",
    ]);
  });

  it("is symmetric for distinct timestamps and never un-completes a lesson", () => {
    expect(mergeLearnerProfiles(local, remote)).toEqual(mergeLearnerProfiles(remote, local));
    const merged = mergeLearnerProfiles(local, { version: 2, completions: [], attempts: [] });
    expect(merged.completions).toHaveLength(1);
  });

  it("survives garbage input on either side", () => {
    expect(mergeLearnerProfiles(local, "tampered")).toEqual(local);
    expect(mergeLearnerProfiles(null, remote)).toEqual(remote);
  });
});


describe("mergeCloudLearnerProfiles", () => {
  const localProfile = {
    version: 2,
    completions: [
      { stepId: "evidence-boundaries", completedAt: 10, overallScore: 88, hintsUsed: 1, testRuns: 2 },
    ],
    attempts: [attempt({ attemptId: "local-random-uuid-0001", completedAt: 1_000, provenance: "server_verified" })],
  };

  it("collapses the same bounded outcome recorded locally and server-side into one attempt", () => {
    const cloudProfile = {
      version: 2,
      completions: [
        { stepId: "evidence-boundaries", completedAt: 10, overallScore: 88, hintsUsed: 1, testRuns: 2 },
      ],
      attempts: [attempt({ attemptId: "sha256-derived-server-id", completedAt: 1_500, provenance: "server_verified" })],
    };

    const merged = mergeCloudLearnerProfiles(localProfile, cloudProfile);
    expect(merged.attempts).toHaveLength(1);
    expect(merged.attempts[0].attemptId).toBe("sha256-derived-server-id");
    expect(merged.completions).toHaveLength(1);
  });

  it("prefers server_verified provenance over local_import for equivalent outcomes", () => {
    const cloudProfile = {
      version: 2,
      completions: [],
      attempts: [attempt({ attemptId: "cloud-import-copy", completedAt: 5_000, provenance: "local_import" })],
    };

    const merged = mergeCloudLearnerProfiles(localProfile, cloudProfile);
    expect(merged.attempts).toHaveLength(1);
    expect(merged.attempts[0].provenance).toBe("server_verified");
  });

  it("keeps genuinely different attempts and never fabricates provenance", () => {
    const cloudProfile = {
      version: 2,
      completions: [
        { stepId: "evidence-booleans", completedAt: 20, overallScore: 92, hintsUsed: 0, testRuns: 1 },
      ],
      attempts: [
        attempt({ attemptId: "cloud-different-outcome", completedAt: 2_000, hintsUsed: 2, provenance: "local_import" }),
      ],
    };

    const merged = mergeCloudLearnerProfiles(localProfile, cloudProfile);
    expect(merged.attempts).toHaveLength(2);
    expect(merged.completions.map((completion) => completion.stepId).sort()).toEqual([
      "evidence-booleans",
      "evidence-boundaries",
    ]);
    const imported = merged.attempts.find((item) => item.attemptId === "cloud-different-outcome");
    expect(imported?.provenance).toBe("local_import");
  });

  it("is monotonic: newer verified progress survives an older cloud record", () => {
    const newerLocal = {
      version: 2,
      completions: [
        { stepId: "evidence-boundaries", completedAt: 99, overallScore: 95, hintsUsed: 0, testRuns: 1 },
      ],
      attempts: [],
    };
    const olderCloud = {
      version: 2,
      completions: [
        { stepId: "evidence-boundaries", completedAt: 10, overallScore: 70, hintsUsed: 3, testRuns: 9 },
      ],
      attempts: [],
    };

    const merged = mergeCloudLearnerProfiles(newerLocal, olderCloud);
    expect(merged.completions).toHaveLength(1);
    expect(merged.completions[0].completedAt).toBe(99);
    expect(merged.completions[0].overallScore).toBe(95);
  });

  it("outcome identity excludes identifiers, timestamps, and provenance", () => {
    const a = attempt({ attemptId: "id-aaa-000001", completedAt: 1, provenance: "server_verified" });
    const b = attempt({ attemptId: "id-bbb-000002", completedAt: 2, provenance: "local_import" });
    expect(attemptOutcomeIdentity(a)).toBe(attemptOutcomeIdentity(b));
    expect(attemptOutcomeIdentity(attempt({ hintsUsed: 3 }))).not.toBe(attemptOutcomeIdentity(a));
  });
});
