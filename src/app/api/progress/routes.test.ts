import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const harness = vi.hoisted(() => {
  const docs = new Map<string, unknown>();
  const fail = { current: false };
  const tokens = new Map<string, { uid: string; emailVerified: boolean }>([
    ["tok-a", { uid: "user-a", emailVerified: true }],
    ["tok-b", { uid: "user-b", emailVerified: true }],
    ["tok-u", { uid: "user-u", emailVerified: false }],
  ]);
  return { docs, fail, tokens };
});

vi.mock("@/server/progress-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/progress-service")>();
  return {
    ...actual,
    getDefaultProgressService: () =>
      actual.createProgressService({
        verifyToken: async (token: string) => {
          const claims = harness.tokens.get(token);
          if (!claims) {
            const error = new Error("rejected") as Error & { code: string };
            error.code = "auth/argument-error";
            throw error;
          }
          return claims;
        },
        store: {
          async run(uid, mutate) {
            if (harness.fail.current) throw new Error("store down");
            const mutation = mutate(harness.docs.get(uid) ?? null);
            if (mutation.remove) harness.docs.delete(uid);
            else if (mutation.write) harness.docs.set(uid, structuredClone(mutation.write));
            return mutation.result;
          },
        },
      }),
  };
});

import {
  progressSnapshotSchema,
  type LearnerProfile,
} from "@/lib/progress-contracts";
import { DELETE, GET, POST } from "./route";

let nextIp = 40;

function progressRequest(options: {
  method?: "GET" | "POST" | "DELETE";
  token?: string | null;
  body?: unknown;
  rawBody?: string;
  origin?: string;
  ip?: string;
  contentType?: string;
} = {}): Request {
  const headers: Record<string, string> = {
    "x-forwarded-for": options.ip ?? `198.51.101.${(nextIp += 1)}`,
    host: "localhost",
  };
  if (options.token) headers.authorization = `Bearer ${options.token}`;
  if (options.origin) headers.origin = options.origin;

  const method = options.method ?? "GET";
  const init: RequestInit = { method, headers };
  if (options.body !== undefined || options.rawBody !== undefined) {
    headers["content-type"] = options.contentType ?? "application/json";
    init.body = options.rawBody ?? JSON.stringify(options.body);
  }
  return new Request("http://localhost/api/progress", init);
}

const importAttempt = {
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

const importProfile: LearnerProfile = {
  version: 2,
  completions: [
    { stepId: "evidence-boundaries", completedAt: 1_600_000_000_000, overallScore: 80, hintsUsed: 1, testRuns: 3 },
  ],
  attempts: [importAttempt as LearnerProfile["attempts"][number]],
};

beforeEach(() => {
  harness.docs.clear();
  harness.fail.current = false;
});

describe("progress route authentication boundary", () => {
  it("fails closed without a token on every method", async () => {
    for (const handler of [GET, POST, DELETE]) {
      const response = await handler(
        progressRequest({
          method: handler === GET ? "GET" : handler === POST ? "POST" : "DELETE",
          body: handler === POST ? { profile: importProfile } : undefined,
        }),
      );
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.code).toBe("UNAUTHORIZED");
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
  });

  it("rejects forged, unverified, and duplicate-header identities", async () => {
    expect((await GET(progressRequest({ token: "tok-x" }))).status).toBe(401);
    expect((await GET(progressRequest({ token: "tok-u" }))).status).toBe(401);

    const duplicate = new Request("http://localhost/api/progress", {
      headers: [
        ["authorization", "Bearer tok-a"],
        ["authorization", "Bearer tok-b"],
        ["x-forwarded-for", "198.51.101.200"],
        ["host", "localhost"],
      ],
    });
    expect((await GET(duplicate)).status).toBe(401);
  });

  it("rejects cross-origin requests before touching identity", async () => {
    const response = await GET(
      progressRequest({ token: "tok-a", origin: "https://evil.example" }),
    );
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("CROSS_ORIGIN");

    const opaque = await DELETE(
      progressRequest({ method: "DELETE", token: "tok-a", origin: "null" }),
    );
    expect(opaque.status).toBe(403);
  });

  it("allows a matching same-origin header", async () => {
    const response = await GET(
      progressRequest({ token: "tok-a", origin: "http://localhost" }),
    );
    expect(response.status).toBe(200);
  });

  it("returns a safe 503 when the cloud store is down", async () => {
    harness.fail.current = true;
    const response = await GET(progressRequest({ token: "tok-a" }));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.code).toBe("CLOUD_UNAVAILABLE");
    expect(body.retryable).toBe(true);
  });

  it("rate limits progress requests per client", async () => {
    let response = new Response();
    for (let index = 0; index < 31; index += 1) {
      response = await GET(progressRequest({ token: "tok-a", ip: "203.0.113.90" }));
    }
    expect(response.status).toBe(429);
    expect((await response.json()).code).toBe("RATE_LIMITED");
  });
});

describe("reading and restoring cloud progress", () => {
  it("returns an exact-key empty snapshot for a first-time verified learner", async () => {
    const response = await GET(progressRequest({ token: "tok-a" }));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(progressSnapshotSchema.parse(body)).toEqual({
      profile: { version: 2, completions: [], attempts: [] },
      localImportCompleted: false,
    });
  });

  it("keeps learners fully isolated from each other", async () => {
    await POST(progressRequest({ method: "POST", token: "tok-a", body: { profile: importProfile } }));

    const other = await GET(progressRequest({ token: "tok-b" }));
    const body = await other.json();
    expect(body.profile.attempts).toEqual([]);
    expect(body.profile.completions).toEqual([]);
  });
});

describe("bounded one-time import", () => {
  it("imports once with forced local_import provenance and refuses replays", async () => {
    const first = await POST(
      progressRequest({ method: "POST", token: "tok-a", body: { profile: importProfile } }),
    );
    expect(first.status).toBe(200);
    const body = await first.json();
    expect(body.localImportCompleted).toBe(true);
    expect(body.profile.attempts).toHaveLength(1);
    expect(body.profile.attempts[0].provenance).toBe("local_import");

    const second = await POST(
      progressRequest({ method: "POST", token: "tok-a", body: { profile: importProfile } }),
    );
    expect(second.status).toBe(409);
    expect((await second.json()).code).toBe("IMPORT_ALREADY_COMPLETED");
  });

  it("rejects identity, path, and authority fields with strict schemas", async () => {
    const withUid = await POST(
      progressRequest({
        method: "POST",
        token: "tok-a",
        body: { profile: importProfile, uid: "user-b" },
      }),
    );
    expect(withUid.status).toBe(400);

    const withPath = await POST(
      progressRequest({
        method: "POST",
        token: "tok-a",
        body: { profile: { ...importProfile, firestorePath: "learningProfiles/user-b" } },
      }),
    );
    expect(withPath.status).toBe(400);

    const forgedProvenance = await POST(
      progressRequest({
        method: "POST",
        token: "tok-a",
        body: {
          profile: {
            ...importProfile,
            attempts: [{ ...importAttempt, provenance: "certified" }],
          },
        },
      }),
    );
    expect(forgedProvenance.status).toBe(400);

    const overlongAttempts = await POST(
      progressRequest({
        method: "POST",
        token: "tok-a",
        body: {
          profile: {
            ...importProfile,
            attempts: Array.from({ length: 60 }, (_, index) => ({
              ...importAttempt,
              attemptId: `local-attempt-${String(index).padStart(4, "0")}`,
            })),
          },
        },
      }),
    );
    expect(overlongAttempts.status).toBe(400);
  });

  it("rejects wrong content types and oversized bodies", async () => {
    const wrongType = await POST(
      progressRequest({
        method: "POST",
        token: "tok-a",
        rawBody: "profile=1",
        contentType: "application/x-www-form-urlencoded",
      }),
    );
    expect(wrongType.status).toBe(415);

    const oversized = await POST(
      progressRequest({
        method: "POST",
        token: "tok-a",
        rawBody: `{"profile": "${"a".repeat(90_000)}"}`,
      }),
    );
    expect(oversized.status).toBe(413);
  });
});

describe("same-user deletion", () => {
  it("deletes the learner's cloud data and leaves other learners intact", async () => {
    await POST(progressRequest({ method: "POST", token: "tok-a", body: { profile: importProfile } }));
    await POST(progressRequest({ method: "POST", token: "tok-b", body: { profile: importProfile } }));

    const response = await DELETE(progressRequest({ method: "DELETE", token: "tok-a" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deleted: true });
    expect(harness.docs.has("user-a")).toBe(false);
    expect(harness.docs.has("user-b")).toBe(true);

    const after = await GET(progressRequest({ token: "tok-a" }));
    const body = await after.json();
    expect(body.profile.attempts).toEqual([]);
    expect(body.localImportCompleted).toBe(false);
  });

  it("requires authentication for deletion", async () => {
    await POST(progressRequest({ method: "POST", token: "tok-a", body: { profile: importProfile } }));
    const response = await DELETE(progressRequest({ method: "DELETE", token: "tok-x" }));
    expect(response.status).toBe(401);
    expect(harness.docs.has("user-a")).toBe(true);
  });
});
