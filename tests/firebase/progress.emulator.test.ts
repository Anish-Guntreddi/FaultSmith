import { beforeAll, describe, expect, it, vi } from "vitest";

import type { AttemptSummary } from "@/lib/progress-contracts";

vi.mock("server-only", () => ({}));

/**
 * Cloud progress integration suite against the local Auth + Firestore
 * emulators under the explicit demo project. Runs only through
 * `npm run test:firebase` (firebase emulators:exec), so it can never contact
 * a real Firebase project and needs no credential of any kind.
 */

const DEMO_PROJECT_ID = "demo-faultsmith";

process.env.NEXT_PUBLIC_FAULTSMITH_CLOUD_SYNC = "true";
process.env.FIREBASE_PROJECT_ID = DEMO_PROJECT_ID;
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";

const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;

// All app modules load dynamically so the environment above is in place first.
const progressRoute = await import("@/app/api/progress/route");
const assessRoute = await import("@/app/api/challenges/assess/route");
const admin = await import("@/server/firebase-admin");
const identityModule = await import("@/server/firebase-identity");
const repositoryModule = await import("@/server/progress-repository");
const { challengeFixtures } = await import("@/server/fixtures");
const { assessmentResponseSchema } = await import("@/lib/contracts");
const { progressSnapshotSchema } = await import("@/lib/progress-contracts");

const fixture = challengeFixtures.find((entry) => entry.challengeId === "expense-boundary-v1");
if (!fixture) throw new Error("The expense-boundary-v1 fixture is required for this suite.");

async function authRest(action: string, body: unknown): Promise<Record<string, unknown>> {
  const response = await fetch(
    `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:${action}?key=fake-emulator-key`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return (await response.json()) as Record<string, unknown>;
}

type EmulatorUser = { idToken: string; uid: string };

async function createUnverifiedEmailUser(email: string): Promise<EmulatorUser> {
  const pw = "pw-1234";
  const result = await authRest("signUp", { email, password: pw, returnSecureToken: true });
  return { idToken: String(result.idToken), uid: String(result.localId) };
}

async function createVerifiedEmailUser(email: string): Promise<EmulatorUser> {
  const pw = "pw-1234";
  const signUp = await authRest("signUp", { email, password: pw, returnSecureToken: true });
  const auth = await admin.getAdminAuth();
  await auth.updateUser(String(signUp.localId), { emailVerified: true });
  const signIn = await authRest("signInWithPassword", { email, password: pw, returnSecureToken: true });
  return { idToken: String(signIn.idToken), uid: String(signIn.localId) };
}

async function createGoogleUser(email: string, sub: string): Promise<EmulatorUser> {
  const claims = JSON.stringify({ sub, email, email_verified: true });
  const result = await authRest("signInWithIdp", {
    postBody: `id_token=${encodeURIComponent(claims)}&providerId=google.com`,
    requestUri: "http://127.0.0.1",
    returnIdpCredential: true,
    returnSecureToken: true,
  });
  return { idToken: String(result.idToken), uid: String(result.localId) };
}

let nextIp = 10;

function progressRequest(options: {
  method?: "GET" | "POST" | "DELETE";
  idToken?: string;
  body?: unknown;
}): Request {
  const headers: Record<string, string> = {
    "x-forwarded-for": `198.51.102.${(nextIp += 1)}`,
    host: "localhost",
  };
  if (options.idToken) headers.authorization = `Bearer ${options.idToken}`;
  const init: RequestInit = { method: options.method ?? "GET", headers };
  if (options.body !== undefined) {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(options.body);
  }
  return new Request("http://localhost/api/progress", init);
}

function assessRequest(idToken: string | null, repaired: boolean, ip: string): Request {
  const files = fixture!.allowedFiles.map((path) => {
    const repairedContent = fixture!.originalFiles.find((file) => file.path === path)?.content ?? "";
    const brokenContent = fixture!.mutatedFiles.find((file) => file.path === path)?.content ?? "";
    return {
      path,
      content: repaired && path === fixture!.allowedFiles[0] ? repairedContent : brokenContent,
    };
  });
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-forwarded-for": ip,
  };
  if (idToken) headers.authorization = `Bearer ${idToken}`;
  return new Request("http://localhost/api/challenges/assess", {
    method: "POST",
    headers,
    body: JSON.stringify({
      challengeId: fixture!.challengeId,
      files,
      executionMode: "prevalidated_fixture",
      hypothesis: "The policy boundary comparison excludes the documented threshold value.",
      hypothesisHistory: ["The policy boundary comparison excludes the documented threshold value."],
      explanation:
        "The failing boundary test shows the threshold is excluded because the comparison is strict instead of inclusive.",
      hintsUsed: 0,
      testRuns: 1,
      elapsedSeconds: 120,
    }),
  });
}

function retentionAttempt(index: number, completedAt: number): AttemptSummary {
  return {
    attemptId: `retention-attempt-${String(index).padStart(4, "0")}`,
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
    hintsUsed: 0,
    testRuns: 1,
    changedLines: 1,
    durationBucket: "under_5_minutes",
    completedAt,
    provenance: "server_verified",
  };
}

beforeAll(async () => {
  // Reset both emulators so every run starts from a clean, deterministic state.
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${DEMO_PROJECT_ID}/databases/(default)/documents`,
    { method: "DELETE" },
  );
  await fetch(`http://${authHost}/emulator/v1/projects/${DEMO_PROJECT_ID}/accounts`, {
    method: "DELETE",
  });
  await admin.resetFirebaseAdmin();
});

describe("emulator isolation", () => {
  it("targets only the explicit demo project", () => {
    expect(process.env.FIREBASE_PROJECT_ID).toMatch(/^demo-/);
    expect(process.env.FIRESTORE_EMULATOR_HOST).not.toContain("googleapis.com");
    expect(process.env.FIREBASE_AUTH_EMULATOR_HOST).not.toContain("googleapis.com");
  });
});

describe("identity enforcement at the data boundary", () => {
  it("denies an unverified email learner and writes nothing for them", async () => {
    const unverified = await createUnverifiedEmailUser("unverified.learner@example.test");

    const read = await progressRoute.GET(progressRequest({ idToken: unverified.idToken }));
    expect(read.status).toBe(401);

    const assess = await assessRoute.POST(assessRequest(unverified.idToken, true, "198.51.103.11"));
    expect(assess.status).toBe(200);
    const body = await assess.json();
    expect(body.assessment.completionStatus).toBe("verified");
    expect(body.cloudSync).toBe("unauthorized");

    const db = await admin.getAdminFirestore();
    const doc = await db.collection("learningProfiles").doc(unverified.uid).get();
    expect(doc.exists).toBe(false);
  });

  it("rejects forged and malformed tokens", async () => {
    const forged = await progressRoute.GET(progressRequest({ idToken: "tok-forged" }));
    expect(forged.status).toBe(401);

    const noToken = await progressRoute.GET(progressRequest({}));
    expect(noToken.status).toBe(401);
  });
});

describe("verified email and Google learners share one contract", () => {
  it("persists verified assessments and restores them across a fresh Admin instance", async () => {
    const emailUser = await createVerifiedEmailUser("verified.learner@example.test");
    const googleUser = await createGoogleUser("google.learner@example.test", "google-sub-0001");

    for (const [user, ip] of [
      [emailUser, "198.51.103.21"],
      [googleUser, "198.51.103.22"],
    ] as const) {
      const response = await assessRoute.POST(assessRequest(user.idToken, true, ip));
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(assessmentResponseSchema.parse(body)).toBeTruthy();
      expect(body.assessment.completionStatus).toBe("verified");
      expect(body.cloudSync).toBe("cloud_saved");
    }

    // Model a process restart: dispose the cached Admin app before reading.
    await admin.resetFirebaseAdmin();

    for (const user of [emailUser, googleUser]) {
      const read = await progressRoute.GET(progressRequest({ idToken: user.idToken }));
      expect(read.status).toBe(200);
      const snapshot = progressSnapshotSchema.parse(await read.json());
      expect(snapshot.profile.attempts).toHaveLength(1);
      expect(snapshot.profile.attempts[0]?.provenance).toBe("server_verified");
      expect(snapshot.profile.attempts[0]?.status).toBe("verified");
      expect(snapshot.profile.completions.map((completion) => completion.stepId)).toEqual([
        "evidence-boundaries",
      ]);
      expect(snapshot.localImportCompleted).toBe(false);
    }
  });

  it("isolates the two learners from each other", async () => {
    const strangerEmail = await createVerifiedEmailUser("stranger.learner@example.test");
    const read = await progressRoute.GET(progressRequest({ idToken: strangerEmail.idToken }));
    const snapshot = progressSnapshotSchema.parse(await read.json());
    expect(snapshot.profile.attempts).toEqual([]);
    expect(snapshot.profile.completions).toEqual([]);
  });
});

describe("replay, concurrency, and failed assessments", () => {
  it("stores exactly one attempt for identical replays, including concurrent ones", async () => {
    const user = await createVerifiedEmailUser("replay.learner@example.test");

    await assessRoute.POST(assessRequest(user.idToken, true, "198.51.103.31"));
    await Promise.all([
      assessRoute.POST(assessRequest(user.idToken, true, "198.51.103.31")),
      assessRoute.POST(assessRequest(user.idToken, true, "198.51.103.31")),
    ]);

    const read = await progressRoute.GET(progressRequest({ idToken: user.idToken }));
    const snapshot = progressSnapshotSchema.parse(await read.json());
    expect(snapshot.profile.attempts).toHaveLength(1);
  });

  it("records a failing assessment without completing any lesson", async () => {
    const user = await createVerifiedEmailUser("failing.learner@example.test");

    const response = await assessRoute.POST(assessRequest(user.idToken, false, "198.51.103.32"));
    const body = await response.json();
    expect(body.assessment.completionStatus).toBe("not_verified");
    expect(body.cloudSync).toBe("cloud_saved");

    const read = await progressRoute.GET(progressRequest({ idToken: user.idToken }));
    const snapshot = progressSnapshotSchema.parse(await read.json());
    expect(snapshot.profile.attempts).toHaveLength(1);
    expect(snapshot.profile.attempts[0]?.status).toBe("not_verified");
    expect(snapshot.profile.completions).toEqual([]);
  });
});

describe("bounded import, retention, and deletion", () => {
  it("imports local history once with forced local_import provenance", async () => {
    const user = await createVerifiedEmailUser("import.learner@example.test");
    const profile = {
      version: 2,
      completions: [
        { stepId: "evidence-boundaries", completedAt: 1_600_000_000_000, overallScore: 80, hintsUsed: 1, testRuns: 3 },
      ],
      attempts: [retentionAttempt(0, 1_600_000_000_000)],
    };

    const first = await progressRoute.POST(
      progressRequest({ method: "POST", idToken: user.idToken, body: { profile } }),
    );
    expect(first.status).toBe(200);
    const snapshot = progressSnapshotSchema.parse(await first.json());
    expect(snapshot.localImportCompleted).toBe(true);
    expect(snapshot.profile.attempts.map((attempt) => attempt.provenance)).toEqual(["local_import"]);

    const second = await progressRoute.POST(
      progressRequest({ method: "POST", idToken: user.idToken, body: { profile } }),
    );
    expect(second.status).toBe(409);
  });

  it("caps stored attempts at 50 with explicit oldest deletion", async () => {
    const identity = identityModule.createVerifiedIdentity("retention-learner");
    if (!identity) throw new Error("expected a bounded identity");
    const repository = repositoryModule.createProgressRepository(
      repositoryModule.createFirestoreProgressStore(),
    );

    for (let index = 0; index <= 50; index += 1) {
      await repository.recordAttempt(identity, retentionAttempt(index, 1_600_000_000_000 + index * 1_000));
    }

    const snapshot = await repository.readProfile(identity);
    expect(snapshot.profile.attempts).toHaveLength(50);
    const ids = snapshot.profile.attempts.map((attempt) => attempt.attemptId);
    expect(ids).not.toContain("retention-attempt-0000");
    expect(ids).toContain("retention-attempt-0050");
  });

  it("keeps stored documents content-minimal and confined to one collection", async () => {
    const db = await admin.getAdminFirestore();
    const collections = await db.listCollections();
    expect(collections.map((collection) => collection.id)).toEqual(["learningProfiles"]);

    const documents = await db.collection("learningProfiles").get();
    expect(documents.empty).toBe(false);
    for (const document of documents.docs) {
      const serialized = JSON.stringify(document.data());
      expect(serialized).not.toContain("@");
      expect(serialized).not.toContain("hypothesis");
      expect(serialized).not.toContain("explanation");
      expect(serialized).not.toContain("sanitizedOutput");
      expect(serialized).not.toContain("eyJ");
    }
  });

  it("deletes the requesting learner's data on explicit request", async () => {
    const user = await createVerifiedEmailUser("delete.learner@example.test");
    await assessRoute.POST(assessRequest(user.idToken, true, "198.51.103.41"));

    const remove = await progressRoute.DELETE(
      progressRequest({ method: "DELETE", idToken: user.idToken }),
    );
    expect(remove.status).toBe(200);
    expect(await remove.json()).toEqual({ deleted: true });

    const read = await progressRoute.GET(progressRequest({ idToken: user.idToken }));
    const snapshot = progressSnapshotSchema.parse(await read.json());
    expect(snapshot.profile.attempts).toEqual([]);

    const db = await admin.getAdminFirestore();
    const doc = await db.collection("learningProfiles").doc(user.uid).get();
    expect(doc.exists).toBe(false);
  });
});

describe("degraded operation when Firebase is disabled", () => {
  it("keeps the authoritative assessment and local progress working, then restores cloud data", async () => {
    const user = await createVerifiedEmailUser("degraded.learner@example.test");
    const saved = await assessRoute.POST(assessRequest(user.idToken, true, "198.51.103.51"));
    expect((await saved.json()).cloudSync).toBe("cloud_saved");

    // Disable the cloud feature and dispose the Admin app: the same requests
    // must keep succeeding with bounded degraded sync facts and no writes.
    process.env.NEXT_PUBLIC_FAULTSMITH_CLOUD_SYNC = "false";
    await admin.resetFirebaseAdmin();
    try {
      const degraded = await assessRoute.POST(assessRequest(user.idToken, true, "198.51.103.52"));
      expect(degraded.status).toBe(200);
      const degradedBody = await degraded.json();
      expect(assessmentResponseSchema.parse(degradedBody)).toBeTruthy();
      expect(degradedBody.assessment.completionStatus).toBe("verified");
      expect(degradedBody.testResult.status).toBe("passed");
      expect(degradedBody.cloudSync).toBe("cloud_unavailable");

      const guest = await assessRoute.POST(assessRequest(null, true, "198.51.103.53"));
      expect(guest.status).toBe(200);
      expect((await guest.json()).cloudSync).toBe("local_only");

      const read = await progressRoute.GET(progressRequest({ idToken: user.idToken }));
      expect(read.status).toBe(503);
      expect((await read.json()).code).toBe("CLOUD_UNAVAILABLE");
    } finally {
      process.env.NEXT_PUBLIC_FAULTSMITH_CLOUD_SYNC = "true";
      await admin.resetFirebaseAdmin();
    }

    const restored = await progressRoute.GET(progressRequest({ idToken: user.idToken }));
    expect(restored.status).toBe(200);
    const snapshot = progressSnapshotSchema.parse(await restored.json());
    expect(snapshot.profile.attempts).toHaveLength(1);
  });
});
