import { describe, expect, it, vi } from "vitest";

import {
  collapseAuthError,
  createFirebaseAuthAdapter,
  resolveAuthEmulatorHost,
  resolveCloudConfigStatus,
  type CloudAuthGateway,
  type CloudGatewayUser,
  type CloudUserSnapshot,
  type PublicFirebaseEnv,
} from "./firebase-auth";

const readyEnv: PublicFirebaseEnv = {
  apiKey: "demo-public-web-config-value",
  authDomain: "demo-faultsmith.example.test",
  projectId: "demo-faultsmith",
  appId: "1:000000000000:web:demo",
  cloudSyncFlag: "true",
};

const offEnv: PublicFirebaseEnv = { ...readyEnv, cloudSyncFlag: "" };
const partialEnv: PublicFirebaseEnv = { ...readyEnv, appId: "" };

const examplePassphrase = ["correct", "horse", "battery", "example"].join("-");

function gatewayUser(overrides: Partial<CloudGatewayUser> = {}): CloudGatewayUser {
  return {
    uid: "uid-original",
    email: "learner@example.test",
    emailVerified: false,
    providerIds: ["password"],
    ...overrides,
  };
}

function createFakeGateway(overrides: Partial<CloudAuthGateway> = {}): CloudAuthGateway {
  return {
    subscribe: vi.fn(() => () => {}),
    createUser: vi.fn(async () => gatewayUser()),
    signIn: vi.fn(async () => gatewayUser()),
    validatePassword: vi.fn(async () => ({ isValid: true })),
    sendVerificationEmail: vi.fn(async () => {}),
    sendPasswordResetEmail: vi.fn(async () => {}),
    signInWithGooglePopup: vi.fn(async () =>
      gatewayUser({ uid: "uid-google", emailVerified: true, providerIds: ["google.com"] }),
    ),
    linkCurrentUserWithGoogle: vi.fn(async () =>
      gatewayUser({ providerIds: ["password", "google.com"] }),
    ),
    reloadCurrentUser: vi.fn(async () => gatewayUser({ emailVerified: true })),
    deleteCurrentUser: vi.fn(async () => {}),
    signOut: vi.fn(async () => {}),
    getIdToken: vi.fn(async () => "fresh-example-id-token"),
    ...overrides,
  };
}

interface AdapterHarnessOptions {
  env?: PublicFirebaseEnv;
  gateway?: CloudAuthGateway;
  isBrowser?: boolean;
  cooldownMs?: number;
}

function createHarness(options: AdapterHarnessOptions = {}) {
  const gateway = options.gateway ?? createFakeGateway();
  let clock = 0;
  const loadGateway = vi.fn(async () => gateway);
  const adapter = createFirebaseAuthAdapter({
    loadGateway,
    readEnv: () => options.env ?? readyEnv,
    isBrowser: () => options.isBrowser ?? true,
    now: () => clock,
    emailActionCooldownMs: options.cooldownMs,
  });
  return {
    adapter,
    gateway,
    loadGateway,
    advanceClock: (ms: number) => {
      clock += ms;
    },
  };
}

describe("cloud configuration detection", () => {
  it("reports off when the cloud flag is not exactly true", () => {
    expect(resolveCloudConfigStatus(offEnv)).toBe("off");
    expect(resolveCloudConfigStatus({ ...readyEnv, cloudSyncFlag: "yes" })).toBe("off");
    expect(resolveCloudConfigStatus({ ...readyEnv, cloudSyncFlag: "TRUE" })).toBe("ready");
  });

  it("reports incomplete when any public value is missing", () => {
    expect(resolveCloudConfigStatus(partialEnv)).toBe("incomplete");
    expect(resolveCloudConfigStatus({ ...readyEnv, apiKey: "  " })).toBe("incomplete");
  });

  it("reports ready only with the flag on and every value present", () => {
    expect(resolveCloudConfigStatus(readyEnv)).toBe("ready");
  });
});

describe("local-only behavior without configuration", () => {
  it("never loads Firebase when the flag is off", async () => {
    const { adapter, loadGateway } = createHarness({ env: offEnv });

    expect(adapter.getCloudConfigStatus()).toBe("off");
    expect(await adapter.requestCloudSync()).toEqual({ ok: false, error: "local_only" });
    expect(await adapter.createEmailAccount("learner@example.test", examplePassphrase)).toEqual({
      ok: false,
      error: "local_only",
    });
    expect(await adapter.getFreshIdToken()).toEqual({ ok: false, error: "local_only" });
    expect(loadGateway).not.toHaveBeenCalled();
  });

  it("treats partial configuration as local_only without throwing", async () => {
    const { adapter, loadGateway } = createHarness({ env: partialEnv });

    expect(adapter.getCloudConfigStatus()).toBe("incomplete");
    expect(await adapter.signInWithEmail("learner@example.test", examplePassphrase)).toEqual({
      ok: false,
      error: "local_only",
    });
    expect(loadGateway).not.toHaveBeenCalled();
  });

  it("stays local_only outside the browser even with complete configuration", async () => {
    const { adapter, loadGateway } = createHarness({ isBrowser: false });

    expect(await adapter.requestCloudSync()).toEqual({ ok: false, error: "local_only" });
    expect(loadGateway).not.toHaveBeenCalled();
  });

  it("signs out cleanly without ever initializing Firebase", async () => {
    const { adapter, loadGateway } = createHarness({ env: offEnv });

    expect(await adapter.signOutOfCloud()).toEqual({ ok: true });
    expect(adapter.getSnapshot().status).toBe("signed_out");
    expect(loadGateway).not.toHaveBeenCalled();
  });
});

describe("lazy initialization", () => {
  it("initializes Firebase exactly once, only after sync is requested", async () => {
    const { adapter, loadGateway, gateway } = createHarness();

    expect(loadGateway).not.toHaveBeenCalled();
    expect(await adapter.requestCloudSync()).toEqual({ ok: true });
    expect(await adapter.requestCloudSync()).toEqual({ ok: true });
    await adapter.signInWithEmail("learner@example.test", examplePassphrase);

    expect(loadGateway).toHaveBeenCalledTimes(1);
    expect(gateway.subscribe).toHaveBeenCalledTimes(1);
  });

  it("reports unavailable and allows retry when the SDK fails to load", async () => {
    let shouldFail = true;
    const gateway = createFakeGateway();
    const adapter = createFirebaseAuthAdapter({
      loadGateway: async () => {
        if (shouldFail) throw new Error("offline");
        return gateway;
      },
      readEnv: () => readyEnv,
      isBrowser: () => true,
    });

    expect(await adapter.requestCloudSync()).toEqual({ ok: false, error: "unavailable" });
    shouldFail = false;
    expect(await adapter.requestCloudSync()).toEqual({ ok: true });
  });
});

describe("email account lifecycle", () => {
  it("creates the account, sends verification, and enforces a resend cooldown", async () => {
    const { adapter, gateway, advanceClock } = createHarness();

    expect(await adapter.createEmailAccount("learner@example.test", examplePassphrase)).toEqual({
      ok: true,
    });
    expect(gateway.sendVerificationEmail).toHaveBeenCalledTimes(1);
    expect(adapter.getSnapshot()).toMatchObject({
      status: "signed_in",
      uid: "uid-original",
      emailVerified: false,
      hasPasswordProvider: true,
    });

    expect(await adapter.resendVerificationEmail()).toEqual({ ok: false, error: "cooldown" });
    expect(gateway.sendVerificationEmail).toHaveBeenCalledTimes(1);

    advanceClock(61_000);
    expect(await adapter.resendVerificationEmail()).toEqual({ ok: true });
    expect(gateway.sendVerificationEmail).toHaveBeenCalledTimes(2);
  });

  it("collapses signup and login account-existence failures into one state", async () => {
    const gateway = createFakeGateway({
      createUser: vi.fn(async () => {
        throw { code: "auth/email-already-in-use" };
      }),
      signIn: vi.fn(async () => {
        throw { code: "auth/wrong-password" };
      }),
    });
    const { adapter } = createHarness({ gateway });

    const signup = await adapter.createEmailAccount("learner@example.test", examplePassphrase);
    const login = await adapter.signInWithEmail("learner@example.test", examplePassphrase);

    expect(signup).toEqual({ ok: false, error: "credentials_rejected" });
    expect(login).toEqual(signup);
    expect(collapseAuthError({ code: "auth/user-not-found" })).toBe("credentials_rejected");
    expect(collapseAuthError({ code: "auth/invalid-credential" })).toBe("credentials_rejected");
  });

  it("surfaces weak-password policy failures distinctly", async () => {
    const gateway = createFakeGateway({
      createUser: vi.fn(async () => {
        throw { code: "auth/password-does-not-meet-requirements" };
      }),
      validatePassword: vi.fn(async () => ({ isValid: false })),
    });
    const { adapter } = createHarness({ gateway });

    expect(await adapter.createEmailAccount("learner@example.test", "short")).toEqual({
      ok: false,
      error: "weak_password",
    });
    expect(await adapter.checkPasswordAgainstPolicy("short")).toEqual({
      ok: true,
      meetsPolicy: false,
    });
  });
});

describe("password reset", () => {
  it("returns a generic success whether or not the account exists", async () => {
    const gateway = createFakeGateway({
      sendPasswordResetEmail: vi.fn(async () => {
        throw { code: "auth/user-not-found" };
      }),
    });
    const { adapter } = createHarness({ gateway });

    expect(await adapter.sendPasswordReset("unknown@example.test")).toEqual({ ok: true });
  });

  it("applies a local cooldown to repeated reset requests", async () => {
    const { adapter, gateway, advanceClock } = createHarness();

    expect(await adapter.sendPasswordReset("learner@example.test")).toEqual({ ok: true });
    expect(await adapter.sendPasswordReset("learner@example.test")).toEqual({
      ok: false,
      error: "cooldown",
    });
    expect(gateway.sendPasswordResetEmail).toHaveBeenCalledTimes(1);

    advanceClock(61_000);
    expect(await adapter.sendPasswordReset("learner@example.test")).toEqual({ ok: true });
  });

  it("still reports transient infrastructure failures", async () => {
    const gateway = createFakeGateway({
      sendPasswordResetEmail: vi.fn(async () => {
        throw { code: "auth/network-request-failed" };
      }),
    });
    const { adapter } = createHarness({ gateway });

    expect(await adapter.sendPasswordReset("learner@example.test")).toEqual({
      ok: false,
      error: "unavailable",
    });
  });
});

describe("Google sign-in and provider collisions", () => {
  it("treats popup cancellation and blockage as bounded non-fatal states", async () => {
    const cancelGateway = createFakeGateway({
      signInWithGooglePopup: vi.fn(async () => {
        throw { code: "auth/popup-closed-by-user" };
      }),
    });
    const blockedGateway = createFakeGateway({
      signInWithGooglePopup: vi.fn(async () => {
        throw { code: "auth/popup-blocked" };
      }),
    });

    const cancelled = createHarness({ gateway: cancelGateway });
    const blocked = createHarness({ gateway: blockedGateway });

    expect(await cancelled.adapter.signInWithGoogle()).toEqual({ ok: false, error: "cancelled" });
    expect(await blocked.adapter.signInWithGoogle()).toEqual({ ok: false, error: "popup_blocked" });
    expect(cancelled.adapter.getSnapshot().status).toBe("signed_out");
  });

  it("reports provider collisions without merging or splitting accounts", async () => {
    const gateway = createFakeGateway({
      signInWithGooglePopup: vi.fn(async () => {
        throw { code: "auth/account-exists-with-different-credential" };
      }),
    });
    const { adapter } = createHarness({ gateway });

    expect(await adapter.signInWithGoogle()).toEqual({ ok: false, error: "provider_collision" });
    expect(adapter.getSnapshot().status).toBe("signed_out");
  });
});

describe("provider linking preserves the UID or fails safe", () => {
  it("links Google onto the current account when the UID is preserved", async () => {
    const { adapter } = createHarness();

    await adapter.signInWithEmail("learner@example.test", examplePassphrase);
    expect(await adapter.linkGoogleToCurrentAccount()).toEqual({ ok: true });
    expect(adapter.getSnapshot()).toMatchObject({
      uid: "uid-original",
      hasPasswordProvider: true,
      hasGoogleProvider: true,
    });
  });

  it("refuses a link that would change the UID and signs out safely", async () => {
    const gateway = createFakeGateway({
      linkCurrentUserWithGoogle: vi.fn(async () =>
        gatewayUser({ uid: "uid-different", providerIds: ["google.com"] }),
      ),
    });
    const { adapter } = createHarness({ gateway });

    await adapter.signInWithEmail("learner@example.test", examplePassphrase);
    expect(await adapter.linkGoogleToCurrentAccount()).toEqual({
      ok: false,
      error: "link_unavailable",
    });
    expect(gateway.signOut).toHaveBeenCalledTimes(1);
    expect(adapter.getSnapshot().status).toBe("signed_out");
  });

  it("requires an existing session and collapses collision failures", async () => {
    const { adapter } = createHarness();
    expect(await adapter.linkGoogleToCurrentAccount()).toEqual({
      ok: false,
      error: "not_signed_in",
    });

    const gateway = createFakeGateway({
      linkCurrentUserWithGoogle: vi.fn(async () => {
        throw { code: "auth/credential-already-in-use" };
      }),
    });
    const collision = createHarness({ gateway });
    await collision.adapter.signInWithEmail("learner@example.test", examplePassphrase);
    expect(await collision.adapter.linkGoogleToCurrentAccount()).toEqual({
      ok: false,
      error: "provider_collision",
    });
  });
});

describe("session state and tokens", () => {
  it("sign-out clears the published snapshot", async () => {
    const { adapter } = createHarness();
    const seen: CloudUserSnapshot[] = [];
    adapter.subscribe((next) => seen.push(next));

    await adapter.signInWithEmail("learner@example.test", examplePassphrase);
    expect(await adapter.signOutOfCloud()).toEqual({ ok: true });

    expect(seen[0].status).toBe("signed_out");
    expect(seen.at(-1)?.status).toBe("signed_out");
    expect(seen.some((snapshot) => snapshot.status === "signed_in")).toBe(true);
  });

  it("returns fresh ID tokens only for active sessions", async () => {
    const { adapter, gateway } = createHarness();

    expect(await adapter.getFreshIdToken()).toEqual({ ok: false, error: "not_signed_in" });

    await adapter.signInWithEmail("learner@example.test", examplePassphrase);
    expect(await adapter.getFreshIdToken()).toEqual({ ok: true, token: "fresh-example-id-token" });
    expect(gateway.getIdToken).toHaveBeenCalledWith(true);
  });

  it("token failures never leak token material", async () => {
    const gateway = createFakeGateway({
      getIdToken: vi.fn(async () => {
        throw { code: "auth/network-request-failed", message: "leaky-token-material" };
      }),
    });
    const { adapter } = createHarness({ gateway });

    await adapter.signInWithEmail("learner@example.test", examplePassphrase);
    const result = await adapter.getFreshIdToken();
    expect(result).toEqual({ ok: false, error: "unavailable" });
    expect(JSON.stringify(result)).not.toContain("leaky-token-material");
  });
});

describe("credential material never persists or leaks", () => {
  it("keeps passwords and emails out of snapshots, results, errors, and the adapter", async () => {
    const gateway = createFakeGateway({
      signIn: vi.fn(async () => {
        throw {
          code: "auth/wrong-password",
          message: `rejected ${examplePassphrase} for learner@example.test`,
          customData: { email: "learner@example.test" },
        };
      }),
    });
    const { adapter } = createHarness({ gateway });
    const seen: CloudUserSnapshot[] = [];
    adapter.subscribe((next) => seen.push(next));

    const created = await adapter.createEmailAccount("learner@example.test", examplePassphrase);
    const failed = await adapter.signInWithEmail("learner@example.test", examplePassphrase);

    const serialized = JSON.stringify({ created, failed, seen, adapter });
    expect(created).toEqual({ ok: true });
    expect(failed).toEqual({ ok: false, error: "credentials_rejected" });
    expect(serialized).not.toContain(examplePassphrase);
    expect(JSON.stringify({ failed })).not.toContain("learner@example.test");
  });

  it("collapses unknown provider errors to a bounded state", () => {
    expect(collapseAuthError({ code: "auth/something-novel" })).toBe("unavailable");
    expect(collapseAuthError(new Error("raw failure"))).toBe("unavailable");
    expect(collapseAuthError(undefined)).toBe("unavailable");
    expect(collapseAuthError({ code: "auth/too-many-requests" })).toBe("cooldown");
  });
});


describe("verification refresh", () => {
  it("publishes the reloaded verification state", async () => {
    const { adapter, gateway } = createHarness();

    await adapter.createEmailAccount("learner@example.test", examplePassphrase);
    expect(adapter.getSnapshot().emailVerified).toBe(false);

    expect(await adapter.refreshVerificationStatus()).toEqual({ ok: true });
    expect(gateway.reloadCurrentUser).toHaveBeenCalledTimes(1);
    expect(adapter.getSnapshot().emailVerified).toBe(true);
  });

  it("never initializes Firebase just to refresh verification", async () => {
    const { adapter, loadGateway } = createHarness();

    expect(await adapter.refreshVerificationStatus()).toEqual({
      ok: false,
      error: "not_signed_in",
    });
    expect(loadGateway).not.toHaveBeenCalled();
  });
});

describe("account deletion", () => {
  it("deletes the account only for an active session and clears the snapshot", async () => {
    const { adapter, gateway } = createHarness();

    expect(await adapter.deleteCloudAccount()).toEqual({ ok: false, error: "not_signed_in" });
    expect(gateway.deleteCurrentUser).not.toHaveBeenCalled();

    await adapter.signInWithEmail("learner@example.test", examplePassphrase);
    expect(await adapter.deleteCloudAccount()).toEqual({ ok: true });
    expect(gateway.deleteCurrentUser).toHaveBeenCalledTimes(1);
    expect(adapter.getSnapshot().status).toBe("signed_out");
  });

  it("surfaces the recent-authentication requirement distinctly", async () => {
    const gateway = createFakeGateway({
      deleteCurrentUser: vi.fn(async () => {
        throw { code: "auth/requires-recent-login" };
      }),
    });
    const { adapter } = createHarness({ gateway });

    await adapter.signInWithEmail("learner@example.test", examplePassphrase);
    expect(await adapter.deleteCloudAccount()).toEqual({
      ok: false,
      error: "recent_login_required",
    });
    expect(collapseAuthError({ code: "auth/requires-recent-login" })).toBe(
      "recent_login_required",
    );
  });
});

describe("provider-linking capability gate", () => {
  it("reports unsupported unless the test-gated flag is exactly true", () => {
    const unsupported = createHarness();
    expect(unsupported.adapter.isProviderLinkingSupported()).toBe(false);

    const supported = createHarness({ env: { ...readyEnv, providerLinkingFlag: "true" } });
    expect(supported.adapter.isProviderLinkingSupported()).toBe(true);

    const variant = createHarness({ env: { ...readyEnv, providerLinkingFlag: "yes" } });
    expect(variant.adapter.isProviderLinkingSupported()).toBe(false);
  });
});

describe("auth emulator host validation", () => {
  it("accepts only loopback host:port values", () => {
    expect(resolveAuthEmulatorHost("127.0.0.1:9099")).toBe("127.0.0.1:9099");
    expect(resolveAuthEmulatorHost("localhost:9099")).toBe("localhost:9099");
    expect(resolveAuthEmulatorHost("")).toBeNull();
    expect(resolveAuthEmulatorHost(undefined)).toBeNull();
    expect(resolveAuthEmulatorHost("evil.example.com:9099")).toBeNull();
    expect(resolveAuthEmulatorHost("127.0.0.1")).toBeNull();
    expect(resolveAuthEmulatorHost("https://127.0.0.1:9099")).toBeNull();
    expect(resolveAuthEmulatorHost("127.0.0.1:9099/extra")).toBeNull();
  });
});
