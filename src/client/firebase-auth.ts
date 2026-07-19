/**
 * Browser-only, lazily initialized Firebase Authentication adapter.
 *
 * Contract:
 * - Importing this module never loads Firebase, touches the network, or
 *   requires configuration. It is safe in every build and server context.
 * - Firebase initializes only after the learner explicitly requests cloud
 *   sync (or performs an auth operation, which implies that request).
 * - Missing, partial, or disabled configuration produces `local_only`
 *   results instead of throwing at import, build, or call time.
 * - Provider errors collapse into a bounded, enumeration-resistant set of
 *   states. No password, token, email, or provider payload ever leaves this
 *   module through an error state.
 * - The server owns persistence. This module never writes credentials,
 *   tokens, or account material to any storage.
 */

import type { User } from "firebase/auth";

export type CloudConfigStatus = "off" | "incomplete" | "ready";

export type CloudAuthErrorState =
  | "local_only"
  | "not_signed_in"
  | "cancelled"
  | "popup_blocked"
  | "weak_password"
  | "credentials_rejected"
  | "provider_collision"
  | "cooldown"
  | "link_unavailable"
  | "recent_login_required"
  | "unavailable";

export type CloudAuthResult = { ok: true } | { ok: false; error: CloudAuthErrorState };

export type CloudTokenResult =
  | { ok: true; token: string }
  | { ok: false; error: CloudAuthErrorState };

export type PasswordPolicyResult =
  | { ok: true; meetsPolicy: boolean }
  | { ok: false; error: CloudAuthErrorState };

export interface PublicFirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  /**
   * Non-production only: when set, the browser gateway redirects every auth
   * request to the local Authentication emulator instead of real Firebase.
   * The value is validated to a loopback host so it can never widen to a
   * real origin.
   */
  authEmulatorHost?: string;
}

export interface PublicFirebaseEnv extends PublicFirebaseWebConfig {
  cloudSyncFlag: string;
  /** Test-gated provider-linking capability flag; unset means unsupported. */
  providerLinkingFlag?: string;
}

export interface CloudGatewayUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  providerIds: string[];
}

/**
 * Thin seam over the Firebase Web SDK. The default implementation is loaded
 * dynamically in the browser; tests substitute a fake so no test ever
 * contacts real Firebase.
 */
export interface CloudAuthGateway {
  subscribe(listener: (user: CloudGatewayUser | null) => void): () => void;
  createUser(email: string, password: string): Promise<CloudGatewayUser>;
  signIn(email: string, password: string): Promise<CloudGatewayUser>;
  validatePassword(password: string): Promise<{ isValid: boolean }>;
  sendVerificationEmail(): Promise<void>;
  sendPasswordResetEmail(email: string): Promise<void>;
  signInWithGooglePopup(): Promise<CloudGatewayUser>;
  linkCurrentUserWithGoogle(): Promise<CloudGatewayUser>;
  reloadCurrentUser(): Promise<CloudGatewayUser>;
  deleteCurrentUser(): Promise<void>;
  signOut(): Promise<void>;
  getIdToken(forceRefresh: boolean): Promise<string>;
}

export interface CloudUserSnapshot {
  status: "signed_out" | "signed_in";
  uid: string | null;
  email: string | null;
  emailVerified: boolean;
  hasPasswordProvider: boolean;
  hasGoogleProvider: boolean;
}

export interface FirebaseAuthAdapter {
  getCloudConfigStatus(): CloudConfigStatus;
  getSnapshot(): CloudUserSnapshot;
  subscribe(listener: (snapshot: CloudUserSnapshot) => void): () => void;
  requestCloudSync(): Promise<CloudAuthResult>;
  createEmailAccount(email: string, password: string): Promise<CloudAuthResult>;
  signInWithEmail(email: string, password: string): Promise<CloudAuthResult>;
  checkPasswordAgainstPolicy(password: string): Promise<PasswordPolicyResult>;
  resendVerificationEmail(): Promise<CloudAuthResult>;
  refreshVerificationStatus(): Promise<CloudAuthResult>;
  sendPasswordReset(email: string): Promise<CloudAuthResult>;
  signInWithGoogle(): Promise<CloudAuthResult>;
  /**
   * UID-preserving provider linking is test-gated: it is offered only when
   * emulator and real-provider proof are green. When false, collision
   * handling must fall back to safe existing-provider guidance.
   */
  isProviderLinkingSupported(): boolean;
  linkGoogleToCurrentAccount(): Promise<CloudAuthResult>;
  signOutOfCloud(): Promise<CloudAuthResult>;
  /**
   * Deletes the Firebase account itself. Requires recent authentication
   * (surfaced as `recent_login_required`) and must only be offered after
   * cloud learning data has been deleted.
   */
  deleteCloudAccount(): Promise<CloudAuthResult>;
  getFreshIdToken(): Promise<CloudTokenResult>;
}

export interface FirebaseAuthAdapterOptions {
  loadGateway?: (config: PublicFirebaseWebConfig) => Promise<CloudAuthGateway>;
  readEnv?: () => PublicFirebaseEnv;
  isBrowser?: () => boolean;
  now?: () => number;
  emailActionCooldownMs?: number;
}

export const DEFAULT_EMAIL_ACTION_COOLDOWN_MS = 60_000;

const SIGNED_OUT_SNAPSHOT: CloudUserSnapshot = {
  status: "signed_out",
  uid: null,
  email: null,
  emailVerified: false,
  hasPasswordProvider: false,
  hasGoogleProvider: false,
};

const NOT_SIGNED_IN_ERROR = { code: "adapter/not-signed-in" } as const;

/**
 * Reads the documented public Firebase web configuration. References must be
 * literal `process.env.NEXT_PUBLIC_*` member expressions so Next.js can
 * inline the values into the browser bundle at build time. These values are
 * public project metadata by design; they are never authorization material.
 */
export function readPublicFirebaseEnv(): PublicFirebaseEnv {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
    cloudSyncFlag: process.env.NEXT_PUBLIC_FAULTSMITH_CLOUD_SYNC ?? "",
    authEmulatorHost: process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST ?? "",
    providerLinkingFlag: process.env.NEXT_PUBLIC_FAULTSMITH_PROVIDER_LINKING ?? "",
  };
}

/**
 * The auth emulator host must be a loopback origin. Anything else is treated
 * as absent so a non-production knob can never redirect auth traffic to an
 * arbitrary host.
 */
const LOOPBACK_EMULATOR_HOST_PATTERN = /^(?:127\.0\.0\.1|localhost):\d{2,5}$/;

export function resolveAuthEmulatorHost(value: string | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return LOOPBACK_EMULATOR_HOST_PATTERN.test(trimmed) ? trimmed : null;
}

export function resolveCloudConfigStatus(env: PublicFirebaseEnv = readPublicFirebaseEnv()): CloudConfigStatus {
  if (env.cloudSyncFlag.trim().toLowerCase() !== "true") return "off";
  const required = [env.apiKey, env.authDomain, env.projectId, env.appId];
  if (required.some((value) => value.trim().length === 0)) return "incomplete";
  return "ready";
}

/**
 * Collapses any provider error into one bounded, enumeration-resistant
 * state. Account-existence signals (unknown user, wrong password, address
 * already registered) intentionally share a single state so callers cannot
 * distinguish whether an account exists. The original error object — which
 * may embed emails, tokens, or provider payloads — is never propagated.
 */
export function collapseAuthError(error: unknown): CloudAuthErrorState {
  const code =
    typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
      ? error.code
      : "";

  switch (code) {
    case "adapter/not-signed-in":
      return "not_signed_in";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
    case "auth/user-cancelled":
      return "cancelled";
    case "auth/popup-blocked":
      return "popup_blocked";
    case "auth/weak-password":
    case "auth/password-does-not-meet-requirements":
      return "weak_password";
    case "auth/email-already-in-use":
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-email":
    case "auth/missing-email":
    case "auth/user-disabled":
      return "credentials_rejected";
    case "auth/account-exists-with-different-credential":
    case "auth/credential-already-in-use":
      return "provider_collision";
    case "auth/requires-recent-login":
      return "recent_login_required";
    case "auth/too-many-requests":
      return "cooldown";
    default:
      return "unavailable";
  }
}

async function loadBrowserGateway(config: PublicFirebaseWebConfig): Promise<CloudAuthGateway> {
  const [appModule, authModule] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
  ]);

  const app =
    appModule.getApps().length > 0
      ? appModule.getApp()
      : appModule.initializeApp({
          apiKey: config.apiKey,
          authDomain: config.authDomain,
          projectId: config.projectId,
          appId: config.appId,
        });
  const auth = authModule.getAuth(app);

  const emulatorHost = resolveAuthEmulatorHost(config.authEmulatorHost);
  if (emulatorHost) {
    // Non-production only: every auth request targets the local emulator.
    authModule.connectAuthEmulator(auth, `http://${emulatorHost}`, { disableWarnings: true });
  }

  const toGatewayUser = (user: User): CloudGatewayUser => ({
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    providerIds: user.providerData.map((profile) => profile.providerId),
  });

  const requireUser = (): User => {
    const user = auth.currentUser;
    if (!user) throw NOT_SIGNED_IN_ERROR;
    return user;
  };

  return {
    subscribe: (listener) =>
      authModule.onAuthStateChanged(auth, (user) => listener(user ? toGatewayUser(user) : null)),
    createUser: async (email, password) =>
      toGatewayUser((await authModule.createUserWithEmailAndPassword(auth, email, password)).user),
    signIn: async (email, password) =>
      toGatewayUser((await authModule.signInWithEmailAndPassword(auth, email, password)).user),
    validatePassword: async (password) => {
      const status = await authModule.validatePassword(auth, password);
      return { isValid: status.isValid };
    },
    sendVerificationEmail: async () => {
      await authModule.sendEmailVerification(requireUser());
    },
    sendPasswordResetEmail: async (email) => {
      await authModule.sendPasswordResetEmail(auth, email);
    },
    signInWithGooglePopup: async () =>
      toGatewayUser(
        (await authModule.signInWithPopup(auth, new authModule.GoogleAuthProvider())).user,
      ),
    linkCurrentUserWithGoogle: async () =>
      toGatewayUser(
        (await authModule.linkWithPopup(requireUser(), new authModule.GoogleAuthProvider())).user,
      ),
    reloadCurrentUser: async () => {
      const user = requireUser();
      await user.reload();
      return toGatewayUser(requireUser());
    },
    deleteCurrentUser: async () => {
      await authModule.deleteUser(requireUser());
    },
    signOut: async () => {
      await authModule.signOut(auth);
    },
    getIdToken: async (forceRefresh) => requireUser().getIdToken(forceRefresh),
  };
}

export function createFirebaseAuthAdapter(
  options: FirebaseAuthAdapterOptions = {},
): FirebaseAuthAdapter {
  const loadGateway = options.loadGateway ?? loadBrowserGateway;
  const readEnv = options.readEnv ?? readPublicFirebaseEnv;
  const isBrowser = options.isBrowser ?? (() => typeof window !== "undefined");
  const now = options.now ?? (() => Date.now());
  const cooldownMs = options.emailActionCooldownMs ?? DEFAULT_EMAIL_ACTION_COOLDOWN_MS;

  let gatewayPromise: Promise<CloudAuthGateway> | null = null;
  let snapshot: CloudUserSnapshot = SIGNED_OUT_SNAPSHOT;
  const listeners = new Set<(next: CloudUserSnapshot) => void>();
  let lastVerificationEmailAt: number | null = null;
  let lastPasswordResetAt: number | null = null;

  const publish = (next: CloudUserSnapshot): void => {
    snapshot = next;
    for (const listener of [...listeners]) listener(snapshot);
  };

  const toSnapshot = (user: CloudGatewayUser | null): CloudUserSnapshot =>
    user
      ? {
          status: "signed_in",
          uid: user.uid,
          email: user.email,
          emailVerified: user.emailVerified,
          hasPasswordProvider: user.providerIds.includes("password"),
          hasGoogleProvider: user.providerIds.includes("google.com"),
        }
      : SIGNED_OUT_SNAPSHOT;

  const cooldownActive = (lastAt: number | null): boolean =>
    lastAt !== null && now() - lastAt < cooldownMs;

  type GatewayHandle =
    | { ok: true; gateway: CloudAuthGateway }
    | { ok: false; error: CloudAuthErrorState };

  const ensureGateway = async (): Promise<GatewayHandle> => {
    const env = readEnv();
    if (resolveCloudConfigStatus(env) !== "ready" || !isBrowser()) {
      return { ok: false, error: "local_only" };
    }
    if (!gatewayPromise) {
      gatewayPromise = loadGateway({
        apiKey: env.apiKey,
        authDomain: env.authDomain,
        projectId: env.projectId,
        appId: env.appId,
        authEmulatorHost: env.authEmulatorHost,
      }).then((gateway) => {
        gateway.subscribe((user) => publish(toSnapshot(user)));
        return gateway;
      });
    }
    try {
      return { ok: true, gateway: await gatewayPromise };
    } catch {
      gatewayPromise = null;
      return { ok: false, error: "unavailable" };
    }
  };

  return {
    getCloudConfigStatus: () => resolveCloudConfigStatus(readEnv()),

    getSnapshot: () => snapshot,

    subscribe: (listener) => {
      listeners.add(listener);
      listener(snapshot);
      return () => {
        listeners.delete(listener);
      };
    },

    requestCloudSync: async () => {
      const handle = await ensureGateway();
      return handle.ok ? { ok: true } : { ok: false, error: handle.error };
    },

    createEmailAccount: async (email, password) => {
      const handle = await ensureGateway();
      if (!handle.ok) return { ok: false, error: handle.error };
      try {
        publish(toSnapshot(await handle.gateway.createUser(email, password)));
      } catch (error) {
        return { ok: false, error: collapseAuthError(error) };
      }
      try {
        await handle.gateway.sendVerificationEmail();
        lastVerificationEmailAt = now();
      } catch {
        // The account exists; the learner can resend verification later.
      }
      return { ok: true };
    },

    signInWithEmail: async (email, password) => {
      const handle = await ensureGateway();
      if (!handle.ok) return { ok: false, error: handle.error };
      try {
        publish(toSnapshot(await handle.gateway.signIn(email, password)));
        return { ok: true };
      } catch (error) {
        return { ok: false, error: collapseAuthError(error) };
      }
    },

    checkPasswordAgainstPolicy: async (password) => {
      const handle = await ensureGateway();
      if (!handle.ok) return { ok: false, error: handle.error };
      try {
        const { isValid } = await handle.gateway.validatePassword(password);
        return { ok: true, meetsPolicy: isValid };
      } catch (error) {
        return { ok: false, error: collapseAuthError(error) };
      }
    },

    resendVerificationEmail: async () => {
      const handle = await ensureGateway();
      if (!handle.ok) return { ok: false, error: handle.error };
      if (cooldownActive(lastVerificationEmailAt)) return { ok: false, error: "cooldown" };
      try {
        await handle.gateway.sendVerificationEmail();
        lastVerificationEmailAt = now();
        return { ok: true };
      } catch (error) {
        return { ok: false, error: collapseAuthError(error) };
      }
    },

    refreshVerificationStatus: async () => {
      if (!gatewayPromise) return { ok: false, error: "not_signed_in" };
      const handle = await ensureGateway();
      if (!handle.ok) return { ok: false, error: handle.error };
      try {
        publish(toSnapshot(await handle.gateway.reloadCurrentUser()));
        return { ok: true };
      } catch (error) {
        return { ok: false, error: collapseAuthError(error) };
      }
    },

    sendPasswordReset: async (email) => {
      const handle = await ensureGateway();
      if (!handle.ok) return { ok: false, error: handle.error };
      if (cooldownActive(lastPasswordResetAt)) return { ok: false, error: "cooldown" };
      try {
        await handle.gateway.sendPasswordResetEmail(email);
      } catch (error) {
        const state = collapseAuthError(error);
        // Account-existence outcomes stay generic: report success whether or
        // not the address maps to an account, so reset cannot enumerate.
        if (state !== "credentials_rejected") return { ok: false, error: state };
      }
      lastPasswordResetAt = now();
      return { ok: true };
    },

    signInWithGoogle: async () => {
      const handle = await ensureGateway();
      if (!handle.ok) return { ok: false, error: handle.error };
      try {
        publish(toSnapshot(await handle.gateway.signInWithGooglePopup()));
        return { ok: true };
      } catch (error) {
        return { ok: false, error: collapseAuthError(error) };
      }
    },

    isProviderLinkingSupported: () =>
      (readEnv().providerLinkingFlag ?? "").trim().toLowerCase() === "true",

    linkGoogleToCurrentAccount: async () => {
      const handle = await ensureGateway();
      if (!handle.ok) return { ok: false, error: handle.error };
      const before = snapshot;
      if (before.status !== "signed_in" || before.uid === null) {
        return { ok: false, error: "not_signed_in" };
      }
      try {
        const linked = await handle.gateway.linkCurrentUserWithGoogle();
        if (linked.uid !== before.uid) {
          // Safe fallback: a link attempt must never adopt a different UID,
          // silently merge accounts, or copy progress between accounts.
          try {
            await handle.gateway.signOut();
          } catch {
            // The unsafe session is discarded locally regardless.
          }
          publish(SIGNED_OUT_SNAPSHOT);
          return { ok: false, error: "link_unavailable" };
        }
        publish(toSnapshot(linked));
        return { ok: true };
      } catch (error) {
        const state = collapseAuthError(error);
        return { ok: false, error: state === "unavailable" ? "link_unavailable" : state };
      }
    },

    signOutOfCloud: async () => {
      if (!gatewayPromise) {
        publish(SIGNED_OUT_SNAPSHOT);
        return { ok: true };
      }
      const handle = await ensureGateway();
      if (!handle.ok) return { ok: false, error: handle.error };
      try {
        await handle.gateway.signOut();
        publish(SIGNED_OUT_SNAPSHOT);
        return { ok: true };
      } catch (error) {
        return { ok: false, error: collapseAuthError(error) };
      }
    },

    deleteCloudAccount: async () => {
      if (!gatewayPromise) return { ok: false, error: "not_signed_in" };
      const handle = await ensureGateway();
      if (!handle.ok) return { ok: false, error: handle.error };
      if (snapshot.status !== "signed_in") return { ok: false, error: "not_signed_in" };
      try {
        await handle.gateway.deleteCurrentUser();
        publish(SIGNED_OUT_SNAPSHOT);
        return { ok: true };
      } catch (error) {
        return { ok: false, error: collapseAuthError(error) };
      }
    },

    getFreshIdToken: async () => {
      const env = readEnv();
      if (resolveCloudConfigStatus(env) !== "ready" || !isBrowser()) {
        return { ok: false, error: "local_only" };
      }
      if (!gatewayPromise) return { ok: false, error: "not_signed_in" };
      const handle = await ensureGateway();
      if (!handle.ok) return { ok: false, error: handle.error };
      try {
        return { ok: true, token: await handle.gateway.getIdToken(true) };
      } catch (error) {
        return { ok: false, error: collapseAuthError(error) };
      }
    },
  };
}

/** Shared adapter instance for application code. */
export const firebaseAuthAdapter = createFirebaseAuthAdapter();
