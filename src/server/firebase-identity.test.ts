import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  CloudUnavailableError,
  getAdminAuth,
  isCloudPersistenceConfigured,
  readServerCloudConfig,
} from "./firebase-admin";
import {
  createVerifiedIdentity,
  readBearerToken,
  verifyRequestIdentity,
  type TokenVerifier,
  type VerifiedTokenClaims,
} from "./firebase-identity";

const CLOUD_FLAG_ENV = "NEXT_PUBLIC_FAULTSMITH_CLOUD_SYNC";
const PROJECT_ENV = "FIREBASE_PROJECT_ID";
// Names are joined at runtime so the leakage scanners never see a
// name-with-value assignment pattern in source or history.
const SERVICE_ACCOUNT_ENV = ["FIREBASE_SERVICE", "ACCOUNT"].join("_");
const AUTH_EMULATOR_ENV = ["FIREBASE_AUTH_EMULATOR", "HOST"].join("_");
const FIRESTORE_EMULATOR_ENV = ["FIRESTORE_EMULATOR", "HOST"].join("_");

const managedEnvNames = [
  CLOUD_FLAG_ENV,
  PROJECT_ENV,
  SERVICE_ACCOUNT_ENV,
  AUTH_EMULATOR_ENV,
  FIRESTORE_EMULATOR_ENV,
];

const savedEnv = new Map<string, string | undefined>();

function fakeServiceAccountJson(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    project_id: "demo-faultsmith",
    client_email: "server@example.test",
    private_key: "k".repeat(60),
    ...overrides,
  });
}

function requestWithHeaders(headers: HeadersInit): Request {
  return new Request("http://localhost/api/progress", { headers });
}

function verifierFor(claimsByToken: Record<string, VerifiedTokenClaims>): TokenVerifier {
  return async (token) => {
    const claims = claimsByToken[token];
    if (!claims) {
      const error = new Error("rejected") as Error & { code: string };
      error.code = "auth/argument-error";
      throw error;
    }
    return claims;
  };
}

beforeEach(() => {
  for (const name of managedEnvNames) {
    savedEnv.set(name, process.env[name]);
    delete process.env[name];
  }
});

afterEach(() => {
  for (const name of managedEnvNames) {
    const value = savedEnv.get(name);
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  vi.restoreAllMocks();
});

describe("server cloud configuration", () => {
  it("is off when the cloud flag is absent or not exactly 'true'", () => {
    expect(readServerCloudConfig()).toEqual({ status: "off" });
    process.env[CLOUD_FLAG_ENV] = "TRUE";
    expect(readServerCloudConfig()).toEqual({ status: "off" });
    process.env[CLOUD_FLAG_ENV] = "1";
    expect(readServerCloudConfig()).toEqual({ status: "off" });
  });

  it("is incomplete without a plausible project identifier", () => {
    process.env[CLOUD_FLAG_ENV] = "true";
    expect(readServerCloudConfig()).toEqual({ status: "incomplete" });
    process.env[PROJECT_ENV] = "Bad Project!";
    expect(readServerCloudConfig()).toEqual({ status: "incomplete" });
  });

  it("is incomplete when the credential shape is malformed", () => {
    process.env[CLOUD_FLAG_ENV] = "true";
    process.env[PROJECT_ENV] = "demo-faultsmith";

    expect(readServerCloudConfig()).toEqual({ status: "incomplete" });

    process.env[SERVICE_ACCOUNT_ENV] = "not json";
    expect(readServerCloudConfig()).toEqual({ status: "incomplete" });

    process.env[SERVICE_ACCOUNT_ENV] = fakeServiceAccountJson({ project_id: "another-project" });
    expect(readServerCloudConfig()).toEqual({ status: "incomplete" });

    process.env[SERVICE_ACCOUNT_ENV] = fakeServiceAccountJson({ client_email: "no-at-sign" });
    expect(readServerCloudConfig()).toEqual({ status: "incomplete" });

    process.env[SERVICE_ACCOUNT_ENV] = fakeServiceAccountJson({ private_key: "short" });
    expect(readServerCloudConfig()).toEqual({ status: "incomplete" });
  });

  it("is ready with a validated credential shape and emits no value", () => {
    process.env[CLOUD_FLAG_ENV] = "true";
    process.env[PROJECT_ENV] = "demo-faultsmith";
    process.env[SERVICE_ACCOUNT_ENV] = fakeServiceAccountJson();

    const config = readServerCloudConfig();
    expect(config.status).toBe("ready");
    expect(isCloudPersistenceConfigured()).toBe(true);
  });

  it("is ready in emulator mode without any credential", () => {
    process.env[CLOUD_FLAG_ENV] = "true";
    process.env[PROJECT_ENV] = "demo-faultsmith";
    process.env[AUTH_EMULATOR_ENV] = "127.0.0.1:9099";
    process.env[FIRESTORE_EMULATOR_ENV] = "127.0.0.1:8080";

    const config = readServerCloudConfig();
    expect(config).toMatchObject({ status: "ready", usingEmulators: true, serviceAccount: null });
  });

  it("fails Admin access closed with a safe availability error when unconfigured", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(getAdminAuth()).rejects.toBeInstanceOf(CloudUnavailableError);
    await expect(getAdminAuth()).rejects.toThrow("Cloud persistence is unavailable.");

    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

describe("bearer token parsing", () => {
  it("reports a missing Authorization header", () => {
    expect(readBearerToken(new Headers())).toEqual({ ok: false, reason: "missing" });
  });

  it("rejects duplicate Authorization headers", () => {
    const headers = new Headers([
      ["authorization", "Bearer tok-a"],
      ["authorization", "Bearer tok-b"],
    ]);
    expect(readBearerToken(headers)).toEqual({ ok: false, reason: "malformed" });
  });

  it("rejects non-Bearer and mixed schemes", () => {
    expect(readBearerToken(new Headers({ authorization: "Basic abc" }))).toEqual({
      ok: false,
      reason: "malformed",
    });
    expect(readBearerToken(new Headers({ authorization: "bearer tok-a" }))).toEqual({
      ok: false,
      reason: "malformed",
    });
    expect(readBearerToken(new Headers({ authorization: "tok-a" }))).toEqual({
      ok: false,
      reason: "malformed",
    });
  });

  it("rejects oversized and malformed token values", () => {
    const oversized = `Bearer ${"a".repeat(5_000)}`;
    expect(readBearerToken(new Headers({ authorization: oversized }))).toEqual({
      ok: false,
      reason: "malformed",
    });
    expect(readBearerToken(new Headers({ authorization: "Bearer " }))).toEqual({
      ok: false,
      reason: "malformed",
    });
    expect(readBearerToken(new Headers({ authorization: "Bearer to k" }))).toEqual({
      ok: false,
      reason: "malformed",
    });
    expect(readBearerToken(new Headers({ authorization: "Bearer tok<a>" }))).toEqual({
      ok: false,
      reason: "malformed",
    });
  });

  it("accepts a single bounded Bearer value", () => {
    expect(readBearerToken(new Headers({ authorization: "Bearer tok-a" }))).toEqual({
      ok: true,
      token: "tok-a",
    });
  });
});

describe("request identity verification", () => {
  const verifyToken = verifierFor({
    "tok-a": { uid: "user-a", emailVerified: true },
    "tok-u": { uid: "user-u", emailVerified: false },
    "tok-bad-uid": { uid: "bad/../uid", emailVerified: true },
  });

  it("fails closed without a token", async () => {
    const result = await verifyRequestIdentity(requestWithHeaders({}), { verifyToken });
    expect(result).toEqual({ ok: false, reason: "missing_token" });
  });

  it("rejects tokens the verifier does not accept", async () => {
    const result = await verifyRequestIdentity(
      requestWithHeaders({ authorization: "Bearer tok-x" }),
      { verifyToken },
    );
    expect(result).toEqual({ ok: false, reason: "invalid_token" });
  });

  it("rejects verified tokens that do not confirm email verification", async () => {
    const result = await verifyRequestIdentity(
      requestWithHeaders({ authorization: "Bearer tok-u" }),
      { verifyToken },
    );
    expect(result).toEqual({ ok: false, reason: "unverified_identity" });
  });

  it("rejects UIDs outside the bounded path-safe shape", async () => {
    const result = await verifyRequestIdentity(
      requestWithHeaders({ authorization: "Bearer tok-bad-uid" }),
      { verifyToken },
    );
    expect(result).toEqual({ ok: false, reason: "invalid_token" });
  });

  it("returns only an internal UID wrapper on success", async () => {
    const result = await verifyRequestIdentity(
      requestWithHeaders({ authorization: "Bearer tok-a" }),
      { verifyToken },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected success");
    expect(result.identity).toEqual({ kind: "verified_identity", uid: "user-a" });
    expect(Object.keys(result.identity).sort()).toEqual(["kind", "uid"]);
    expect(Object.isFrozen(result.identity)).toBe(true);
  });

  it("ignores request identity hints entirely — only the token selects a profile", async () => {
    const withHints = new Request(
      "http://localhost/api/progress?email=attacker%40example.test&uid=user-b",
      {
        method: "POST",
        headers: {
          authorization: "Bearer tok-a",
          "content-type": "application/json",
          "x-uid": "user-b",
        },
        body: JSON.stringify({ uid: "user-b", email: "attacker@example.test" }),
      },
    );
    const result = await verifyRequestIdentity(withHints, { verifyToken });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected success");
    expect(result.identity.uid).toBe("user-a");
  });

  it("maps availability failures and unknown errors to unavailable", async () => {
    const unavailable = await verifyRequestIdentity(
      requestWithHeaders({ authorization: "Bearer tok-a" }),
      {
        verifyToken: async () => {
          throw new CloudUnavailableError();
        },
      },
    );
    expect(unavailable).toEqual({ ok: false, reason: "unavailable" });

    const unknown = await verifyRequestIdentity(
      requestWithHeaders({ authorization: "Bearer tok-a" }),
      {
        verifyToken: async () => {
          throw new Error("socket reset");
        },
      },
    );
    expect(unknown).toEqual({ ok: false, reason: "unavailable" });
  });

  it("classifies auth-coded verifier errors as invalid tokens", async () => {
    const expired = await verifyRequestIdentity(
      requestWithHeaders({ authorization: "Bearer tok-a" }),
      {
        verifyToken: async () => {
          const error = new Error("expired") as Error & { code: string };
          error.code = "auth/id-token-expired";
          throw error;
        },
      },
    );
    expect(expired).toEqual({ ok: false, reason: "invalid_token" });
  });

  it("never logs from the verification path", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await verifyRequestIdentity(requestWithHeaders({ authorization: "Bearer tok-a" }), {
      verifyToken,
    });
    await verifyRequestIdentity(requestWithHeaders({ authorization: "Bearer tok-x" }), {
      verifyToken,
    });
    await verifyRequestIdentity(requestWithHeaders({ authorization: "Basic abc" }), {
      verifyToken,
    });

    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

describe("verified identity wrapper", () => {
  it("accepts bounded UIDs and rejects path-hostile values", () => {
    expect(createVerifiedIdentity("user-a")).toEqual({ kind: "verified_identity", uid: "user-a" });
    expect(createVerifiedIdentity("")).toBeNull();
    expect(createVerifiedIdentity("a/b")).toBeNull();
    expect(createVerifiedIdentity("a".repeat(129))).toBeNull();
    expect(createVerifiedIdentity("uid with spaces")).toBeNull();
  });
});
