import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { AssessmentResponse } from "@/lib/contracts";
import {
  emptyLearnerProfile,
  type AttemptSummary,
  type LearnerProfile,
} from "@/lib/progress-contracts";
import { CloudUnavailableError } from "./firebase-admin";
import type { TokenVerifier } from "./firebase-identity";
import type { ProgressStore, StoreMutation } from "./progress-repository";
import {
  createProgressService,
  deriveLessonBinding,
  deriveServerAttemptSummary,
} from "./progress-service";

type FakeStore = {
  store: ProgressStore;
  docs: Map<string, unknown>;
  fail: { current: boolean };
};

function createFakeStore(): FakeStore {
  const docs = new Map<string, unknown>();
  const fail = { current: false };
  const store: ProgressStore = {
    async run<T>(uid: string, mutate: (current: unknown) => StoreMutation<T>) {
      if (fail.current) throw new Error("store down");
      const mutation = mutate(docs.get(uid) ?? null);
      if (mutation.remove) docs.delete(uid);
      else if (mutation.write) docs.set(uid, structuredClone(mutation.write));
      return mutation.result;
    },
  };
  return { store, docs, fail };
}

const verifyToken: TokenVerifier = async (token) => {
  const claims: Record<string, { uid: string; emailVerified: boolean }> = {
    "tok-a": { uid: "user-a", emailVerified: true },
    "tok-b": { uid: "user-b", emailVerified: true },
    "tok-u": { uid: "user-u", emailVerified: false },
  };
  const found = claims[token];
  if (!found) {
    const error = new Error("rejected") as Error & { code: string };
    error.code = "auth/argument-error";
    throw error;
  }
  return found;
};

function authedRequest(token: string | null): Request {
  return new Request("http://localhost/api/progress", {
    headers: token === null ? {} : { authorization: `Bearer ${token}` },
  });
}

function makeService(overrides: { fakeStore?: FakeStore; now?: () => number } = {}) {
  const fakeStore = overrides.fakeStore ?? createFakeStore();
  const service = createProgressService({
    verifyToken,
    store: fakeStore.store,
    now: overrides.now ?? (() => 1_700_000_000_000),
  });
  return { service, fakeStore };
}

function assessmentResponse(overrides: Partial<AssessmentResponse> = {}): AssessmentResponse {
  return {
    assessment: {
      completionStatus: "verified",
      rootCauseScore: 90,
      reasoningScore: 85,
      patchDisciplineScore: 96,
      conceptUnderstandingScore: 88,
      strengths: ["The repair passed with grounded causal reasoning."],
      improvementAreas: ["Continue connecting evidence to the smallest change."],
      evidenceSummary: "12 executed tests passed with 1 changed line.",
      nextPracticeRecommendation: "Practice another boundary conditions challenge with one fewer hint.",
    },
    testResult: {
      status: "passed",
      passedCount: 12,
      failedCount: 0,
      durationMs: 47,
      sanitizedOutput: "12 passed",
      matchedExpectedFailure: false,
      executionMode: "prevalidated_fixture",
    },
    assessmentSource: "deterministic_fallback",
    hintsUsed: 0,
    testRuns: 2,
    changedLines: 1,
    changedFiles: ["approvals.py"],
    elapsedSeconds: 420,
    hypothesisRevisions: 2,
    ...overrides,
  };
}

function failingResponse(): AssessmentResponse {
  return assessmentResponse({
    assessment: {
      ...assessmentResponse().assessment,
      completionStatus: "not_verified",
      rootCauseScore: 35,
      patchDisciplineScore: 45,
    },
    testResult: {
      ...assessmentResponse().testResult,
      status: "failed",
      passedCount: 11,
      failedCount: 1,
      matchedExpectedFailure: true,
    },
  });
}

const localAttempt: AttemptSummary = {
  attemptId: "local-attempt-0001",
  lessonId: "evidence-boundaries",
  projectId: "expense-approval",
  skill: "Boundary conditions",
  difficulty: "beginner",
  challengeSource: "prevalidated",
  status: "verified",
  rootCauseScore: 80,
  reasoningScore: 75,
  patchDisciplineScore: 96,
  conceptUnderstandingScore: 70,
  hintsUsed: 1,
  testRuns: 3,
  changedLines: 2,
  durationBucket: "5_to_15_minutes",
  completedAt: 1_600_000_000_000,
  provenance: "server_verified",
};

const localProfile: LearnerProfile = {
  version: 2,
  completions: [
    { stepId: "evidence-boundaries", completedAt: 1_600_000_000_000, overallScore: 80, hintsUsed: 1, testRuns: 3 },
  ],
  attempts: [localAttempt],
};

describe("lesson derivation from the server registry", () => {
  it("maps every curated challenge to its unique approved lesson", () => {
    const binding = deriveLessonBinding("expense-boundary-v1");
    expect(binding).toEqual({
      projectId: "expense-approval",
      skill: "Boundary conditions",
      difficulty: "beginner",
      lessonId: "evidence-boundaries",
    });
  });

  it("returns null for unknown challenge identifiers", () => {
    expect(deriveLessonBinding("forged-challenge")).toBeNull();
  });
});

describe("server attempt derivation and idempotency material", () => {
  it("produces a bounded server_verified summary with a sha-256 identifier", () => {
    const summary = deriveServerAttemptSummary(
      "user-a",
      "expense-boundary-v1",
      assessmentResponse(),
      1_700_000_000_000,
    );
    expect(summary).not.toBeNull();
    expect(summary?.provenance).toBe("server_verified");
    expect(summary?.lessonId).toBe("evidence-boundaries");
    expect(summary?.difficulty).toBe("beginner");
    expect(summary?.attemptId).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for identical outcomes and distinct across users", () => {
    const first = deriveServerAttemptSummary("user-a", "expense-boundary-v1", assessmentResponse(), 1);
    const replay = deriveServerAttemptSummary("user-a", "expense-boundary-v1", assessmentResponse(), 2);
    const other = deriveServerAttemptSummary("user-b", "expense-boundary-v1", assessmentResponse(), 1);
    expect(first?.attemptId).toBe(replay?.attemptId);
    expect(first?.attemptId).not.toBe(other?.attemptId);
  });

  it("stores no learner content in the idempotency material or summary", () => {
    const summary = deriveServerAttemptSummary(
      "user-a",
      "expense-boundary-v1",
      assessmentResponse(),
      1_700_000_000_000,
    );
    const serialized = JSON.stringify(summary);
    expect(serialized).not.toContain("executed tests passed");
    expect(serialized).not.toContain("hypothesis");
    expect(serialized).not.toContain("Practice another");
    expect(serialized).not.toContain("evidenceSummary");
  });
});

describe("authenticated profile access", () => {
  it("returns the empty profile for a verified first-time learner", async () => {
    const { service } = makeService();
    const result = await service.readProfile(authedRequest("tok-a"));
    expect(result).toEqual({
      kind: "ok",
      value: { profile: emptyLearnerProfile, localImportCompleted: false },
    });
  });

  it("fails closed without a token and for unknown or unverified tokens", async () => {
    const { service } = makeService();
    expect((await service.readProfile(authedRequest(null))).kind).toBe("unauthorized");
    expect((await service.readProfile(authedRequest("tok-x"))).kind).toBe("unauthorized");
    expect((await service.readProfile(authedRequest("tok-u"))).kind).toBe("unauthorized");
  });

  it("collapses storage failures into a safe unavailable outcome", async () => {
    const { service, fakeStore } = makeService();
    fakeStore.fail.current = true;
    expect((await service.readProfile(authedRequest("tok-a"))).kind).toBe("unavailable");
    expect((await service.deleteProfile(authedRequest("tok-a"))).kind).toBe("unavailable");
    expect((await service.importProfile(authedRequest("tok-a"), localProfile)).kind).toBe(
      "unavailable",
    );
  });

  it("isolates users: one learner's writes are invisible to another", async () => {
    const { service } = makeService();
    await service.importProfile(authedRequest("tok-a"), localProfile);

    const other = await service.readProfile(authedRequest("tok-b"));
    expect(other).toEqual({
      kind: "ok",
      value: { profile: emptyLearnerProfile, localImportCompleted: false },
    });
  });
});

describe("bounded one-time import", () => {
  it("re-tags every imported attempt as local_import", async () => {
    const { service, fakeStore } = makeService();
    const result = await service.importProfile(authedRequest("tok-a"), localProfile);
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") throw new Error("expected ok");
    expect(result.value.localImportCompleted).toBe(true);
    expect(result.value.profile.attempts).toHaveLength(1);
    expect(result.value.profile.attempts[0]?.provenance).toBe("local_import");
    expect(result.value.profile.completions.map((completion) => completion.stepId)).toEqual([
      "evidence-boundaries",
    ]);

    const stored = JSON.stringify(fakeStore.docs.get("user-a"));
    expect(stored).toContain("local_import");
    expect(stored).not.toContain("server_verified");
  });

  it("refuses a second import", async () => {
    const { service } = makeService();
    await service.importProfile(authedRequest("tok-a"), localProfile);
    const second = await service.importProfile(authedRequest("tok-a"), localProfile);
    expect(second).toEqual({ kind: "already_imported" });
  });

  it("merges monotonically with existing cloud attempts", async () => {
    const { service } = makeService();
    await service.syncAssessment(authedRequest("tok-a"), "expense-boundary-v1", assessmentResponse());
    const result = await service.importProfile(authedRequest("tok-a"), localProfile);
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") throw new Error("expected ok");
    expect(result.value.profile.attempts).toHaveLength(2);
    const provenances = result.value.profile.attempts.map((attempt) => attempt.provenance).sort();
    expect(provenances).toEqual(["local_import", "server_verified"]);
    expect(result.value.profile.completions.map((completion) => completion.stepId)).toEqual([
      "evidence-boundaries",
    ]);
  });
});

describe("assessment synchronization", () => {
  it("returns local_only and writes nothing without an Authorization header", async () => {
    const { service, fakeStore } = makeService();
    const status = await service.syncAssessment(
      authedRequest(null),
      "expense-boundary-v1",
      assessmentResponse(),
    );
    expect(status).toBe("local_only");
    expect(fakeStore.docs.size).toBe(0);
  });

  it("returns unauthorized and writes nothing for invalid or unverified identities", async () => {
    const { service, fakeStore } = makeService();
    expect(
      await service.syncAssessment(authedRequest("tok-x"), "expense-boundary-v1", assessmentResponse()),
    ).toBe("unauthorized");
    expect(
      await service.syncAssessment(authedRequest("tok-u"), "expense-boundary-v1", assessmentResponse()),
    ).toBe("unauthorized");
    expect(fakeStore.docs.size).toBe(0);
  });

  it("returns cloud_unavailable when identity infrastructure is down", async () => {
    const fakeStore = createFakeStore();
    const service = createProgressService({
      verifyToken: async () => {
        throw new CloudUnavailableError();
      },
      store: fakeStore.store,
    });
    const status = await service.syncAssessment(
      authedRequest("tok-a"),
      "expense-boundary-v1",
      assessmentResponse(),
    );
    expect(status).toBe("cloud_unavailable");
    expect(fakeStore.docs.size).toBe(0);
  });

  it("returns cloud_unavailable when persistence fails, never throwing", async () => {
    const { service, fakeStore } = makeService();
    fakeStore.fail.current = true;
    const status = await service.syncAssessment(
      authedRequest("tok-a"),
      "expense-boundary-v1",
      assessmentResponse(),
    );
    expect(status).toBe("cloud_unavailable");
  });

  it("returns cloud_unavailable for unknown challenges without writing", async () => {
    const { service, fakeStore } = makeService();
    const status = await service.syncAssessment(
      authedRequest("tok-a"),
      "forged-challenge",
      assessmentResponse(),
    );
    expect(status).toBe("cloud_unavailable");
    expect(fakeStore.docs.size).toBe(0);
  });

  it("persists a verified attempt and completes the derived lesson", async () => {
    const { service } = makeService();
    const status = await service.syncAssessment(
      authedRequest("tok-a"),
      "expense-boundary-v1",
      assessmentResponse(),
    );
    expect(status).toBe("cloud_saved");

    const snapshot = await service.readProfile(authedRequest("tok-a"));
    if (snapshot.kind !== "ok") throw new Error("expected ok");
    expect(snapshot.value.profile.attempts).toHaveLength(1);
    expect(snapshot.value.profile.attempts[0]?.provenance).toBe("server_verified");
    expect(snapshot.value.profile.attempts[0]?.status).toBe("verified");
    expect(snapshot.value.profile.completions.map((completion) => completion.stepId)).toEqual([
      "evidence-boundaries",
    ]);
  });

  it("records a failing assessment without completing any lesson", async () => {
    const { service } = makeService();
    const status = await service.syncAssessment(
      authedRequest("tok-a"),
      "expense-boundary-v1",
      failingResponse(),
    );
    expect(status).toBe("cloud_saved");

    const snapshot = await service.readProfile(authedRequest("tok-a"));
    if (snapshot.kind !== "ok") throw new Error("expected ok");
    expect(snapshot.value.profile.attempts).toHaveLength(1);
    expect(snapshot.value.profile.attempts[0]?.status).toBe("not_verified");
    expect(snapshot.value.profile.completions).toEqual([]);
  });

  it("treats an identical replay as one attempt", async () => {
    const { service } = makeService();
    await service.syncAssessment(authedRequest("tok-a"), "expense-boundary-v1", assessmentResponse());
    await service.syncAssessment(authedRequest("tok-a"), "expense-boundary-v1", assessmentResponse());

    const snapshot = await service.readProfile(authedRequest("tok-a"));
    if (snapshot.kind !== "ok") throw new Error("expected ok");
    expect(snapshot.value.profile.attempts).toHaveLength(1);
  });

  it("caps retention at 50 attempts with explicit oldest deletion", async () => {
    let tick = 1_700_000_000_000;
    const { service } = makeService({ now: () => (tick += 1_000) });

    const firstSummary = deriveServerAttemptSummary(
      "user-a",
      "expense-boundary-v1",
      assessmentResponse({ testRuns: 0 }),
      0,
    );
    for (let testRuns = 0; testRuns <= 50; testRuns += 1) {
      await service.syncAssessment(
        authedRequest("tok-a"),
        "expense-boundary-v1",
        assessmentResponse({ testRuns }),
      );
    }

    const snapshot = await service.readProfile(authedRequest("tok-a"));
    if (snapshot.kind !== "ok") throw new Error("expected ok");
    expect(snapshot.value.profile.attempts).toHaveLength(50);
    expect(
      snapshot.value.profile.attempts.some((attempt) => attempt.attemptId === firstSummary?.attemptId),
    ).toBe(false);
  });

  it("keeps stored documents content-minimal", async () => {
    const { service, fakeStore } = makeService();
    await service.syncAssessment(authedRequest("tok-a"), "expense-boundary-v1", assessmentResponse());

    const stored = JSON.stringify([...fakeStore.docs.entries()]);
    expect(stored).not.toContain("tok-a");
    expect(stored).not.toContain("executed tests passed");
    expect(stored).not.toContain("strengths");
    expect(stored).not.toContain("sanitizedOutput");
    expect(stored).not.toContain("@");
  });
});

describe("same-user deletion", () => {
  it("deletes only the requesting learner's data", async () => {
    const { service, fakeStore } = makeService();
    await service.syncAssessment(authedRequest("tok-a"), "expense-boundary-v1", assessmentResponse());
    await service.syncAssessment(authedRequest("tok-b"), "expense-boundary-v1", assessmentResponse());

    const result = await service.deleteProfile(authedRequest("tok-a"));
    expect(result).toEqual({ kind: "ok", value: { deleted: true } });
    expect(fakeStore.docs.has("user-a")).toBe(false);
    expect(fakeStore.docs.has("user-b")).toBe(true);

    const afterDelete = await service.readProfile(authedRequest("tok-a"));
    expect(afterDelete).toEqual({
      kind: "ok",
      value: { profile: emptyLearnerProfile, localImportCompleted: false },
    });
  });
});
