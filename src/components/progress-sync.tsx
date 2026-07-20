"use client";

/**
 * Optional account and cloud-synchronization surface for My Progress.
 *
 * Contract:
 * - Guest use is the default. This surface never gates the roadmap, labs,
 *   or reports; it renders only inside the My Progress dashboard.
 * - Local progress is first-class: every phase keeps device progress intact
 *   and every failure degrades to a visible "saved on this device" state.
 * - Passwords pass through the browser Firebase adapter only. They are never
 *   held beyond form state, persisted, logged, or sent to the FaultSmith
 *   server. Tokens are fetched fresh at protected request time and never
 *   stored.
 * - No Firebase user object, UID, email, provider payload, or token enters
 *   FaultSmith localStorage. The single marker key below is an identity-free
 *   boolean that lets an opted-in browser restore its session lazily.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  firebaseAuthAdapter,
  type CloudAuthErrorState,
  type CloudConfigStatus,
  type CloudUserSnapshot,
  type FirebaseAuthAdapter,
} from "@/client/firebase-auth";
import { Button, Card, Field, StatusDot } from "@/components/ui";
import {
  emptyLearnerProfile,
  progressSnapshotSchema,
  type LearnerProfile,
  type ProgressSnapshot,
} from "@/lib/progress-contracts";
import { mergeCloudLearnerProfiles } from "@/lib/progress-merge";

/** Identity-free opt-in marker; contains no account or provider material. */
const CLOUD_OPT_IN_KEY = "faultsmith:cloud-sync-enabled:v1";
const REQUEST_TIMEOUT_MS = 10_000;
const RECENT_AUTH_WINDOW_MS = 5 * 60_000;

export type CloudSyncPhase =
  | "local"
  | "creating_account"
  | "verification_required"
  | "signing_in"
  | "syncing"
  | "synced"
  | "degraded";

export const storageStateLabels: Record<CloudSyncPhase, string> = {
  local: "On this device",
  creating_account: "Creating account",
  verification_required: "Verification required",
  signing_in: "Signing in",
  syncing: "Syncing",
  synced: "Synced to account",
  degraded: "Saved on this device—cloud unavailable",
};

export type ImportState = "idle" | "offered" | "importing" | "completed" | "declined";
export type DeletionState = "idle" | "confirming" | "deleting" | "deleted" | "failed";
export type AccountDeletionState = "unavailable" | "available" | "deleting" | "failed";

export interface CloudProgressSync {
  configStatus: CloudConfigStatus;
  phase: CloudSyncPhase;
  storageLabel: string;
  statusMessage: string;
  errorMessage: string;
  auth: CloudUserSnapshot;
  displayProfile: LearnerProfile;
  cloudSnapshot: ProgressSnapshot | null;
  importState: ImportState;
  deletionState: DeletionState;
  accountDeletionState: AccountDeletionState;
  linkingSupported: boolean;
  collisionDetected: boolean;
  continueAsGuest(): void;
  createAccount(email: string, password: string, confirmPassword: string): Promise<void>;
  signInEmail(email: string, password: string): Promise<void>;
  signInGoogle(): Promise<void>;
  linkGoogle(): Promise<void>;
  resendVerification(): Promise<void>;
  checkVerification(): Promise<void>;
  sendReset(email: string): Promise<void>;
  retrySync(): Promise<void>;
  signOut(): Promise<void>;
  acceptImport(): Promise<void>;
  declineImport(): void;
  requestDataDeletion(): void;
  cancelDataDeletion(): void;
  confirmDataDeletion(): Promise<void>;
  deleteAccount(): Promise<void>;
  getAssessAuthHeader(): Promise<Record<string, string> | undefined>;
  afterAssessment(cloudSync: string | undefined): void;
}

function authErrorMessage(error: CloudAuthErrorState): string {
  switch (error) {
    case "local_only":
      return "Cloud sync is not configured. Progress stays safely on this device.";
    case "not_signed_in":
      return "You are signed out. Progress stays on this device.";
    case "cancelled":
      return "Sign-in was cancelled. Your progress is safe on this device.";
    case "popup_blocked":
      return "The sign-in popup was blocked by the browser. Allow popups for this site and try again.";
    case "weak_password":
      return "That password does not meet the account password policy. Use a longer, less common password.";
    case "credentials_rejected":
      return "Those account details were not accepted. Check the email and password, or use password reset.";
    case "provider_collision":
      return "This email already uses a different sign-in method. Sign in with the method you used originally—no progress was moved.";
    case "cooldown":
      return "Please wait about a minute before requesting another email.";
    case "link_unavailable":
      return "Linking is unavailable for this account, so nothing was changed or merged. Sign in with your existing method.";
    case "recent_login_required":
      return "For security, sign in again immediately before deleting the account.";
    default:
      return "Cloud sign-in is temporarily unavailable. Your progress is safe on this device.";
  }
}

function readOptInMarker(): boolean {
  try {
    return window.localStorage.getItem(CLOUD_OPT_IN_KEY) === "true";
  } catch {
    return false;
  }
}

function writeOptInMarker(enabled: boolean): void {
  try {
    if (enabled) window.localStorage.setItem(CLOUD_OPT_IN_KEY, "true");
    else window.localStorage.removeItem(CLOUD_OPT_IN_KEY);
  } catch {
    // The marker is an optional convenience; storage failures never block.
  }
}

async function fetchWithTimeout(input: string, init: RequestInit): Promise<Response> {
  return fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
}

export interface UseCloudProgressSyncOptions {
  adapter?: FirebaseAuthAdapter;
}

export function useCloudProgressSync(
  localProfile: LearnerProfile,
  options: UseCloudProgressSyncOptions = {},
): CloudProgressSync {
  const adapter = options.adapter ?? firebaseAuthAdapter;
  const configStatus = adapter.getCloudConfigStatus();

  const [phase, setPhase] = useState<CloudSyncPhase>("local");
  const [auth, setAuth] = useState<CloudUserSnapshot>(adapter.getSnapshot());
  const [cloudSnapshot, setCloudSnapshot] = useState<ProgressSnapshot | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [importState, setImportState] = useState<ImportState>("idle");
  const [deletionState, setDeletionState] = useState<DeletionState>("idle");
  const [accountDeletionState, setAccountDeletionState] =
    useState<AccountDeletionState>("unavailable");
  const [collisionDetected, setCollisionDetected] = useState(false);

  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  const localProfileRef = useRef(localProfile);
  useEffect(() => {
    localProfileRef.current = localProfile;
  }, [localProfile]);
  const lastInteractiveAuthAtRef = useRef<number | null>(null);

  const markRecentAuth = useCallback(() => {
    lastInteractiveAuthAtRef.current = Date.now();
  }, []);
  const hasRecentAuth = useCallback(
    () =>
      lastInteractiveAuthAtRef.current !== null &&
      Date.now() - lastInteractiveAuthAtRef.current < RECENT_AUTH_WINDOW_MS,
    [],
  );

  const setStatus = useCallback((message: string) => {
    setStatusMessage(message);
    setErrorMessage("");
  }, []);
  const setFailure = useCallback((message: string) => {
    setErrorMessage(message);
  }, []);

  const degrade = useCallback(
    (message?: string) => {
      setPhase("degraded");
      setStatus(message ?? "Cloud is unreachable right now. Progress keeps saving on this device.");
    },
    [setStatus],
  );

  const syncNow = useCallback(
    async (silent = false) => {
      const snapshot = adapter.getSnapshot();
      if (snapshot.status !== "signed_in") return;
      if (!snapshot.emailVerified) {
        setPhase("verification_required");
        setStatus("Verify your email to enable cloud sync. Progress keeps saving on this device.");
        return;
      }
      if (!silent) {
        setPhase("syncing");
        setStatus("Syncing progress with your account…");
      }
      const token = await adapter.getFreshIdToken();
      if (!token.ok) {
        degrade();
        return;
      }
      try {
        const response = await fetchWithTimeout("/api/progress", {
          method: "GET",
          headers: { authorization: `Bearer ${token.token}` },
        });
        if (!response.ok) {
          degrade(
            response.status === 401
              ? "Cloud sync is not authorized for this session yet. Progress keeps saving on this device."
              : undefined,
          );
          return;
        }
        const parsed = progressSnapshotSchema.safeParse(await response.json());
        if (!parsed.success) {
          degrade();
          return;
        }
        setCloudSnapshot(parsed.data);
        setPhase("synced");
        setStatus("Synced to your account. Local progress stays on this device too.");
        setImportState((current) => {
          if (parsed.data.localImportCompleted) return "completed";
          if (current === "declined" || current === "offered") return current;
          const local = localProfileRef.current;
          const hasLocal = local.completions.length > 0 || local.attempts.length > 0;
          return hasLocal ? "offered" : "idle";
        });
      } catch {
        degrade();
      }
    },
    [adapter, degrade, setStatus],
  );
  const syncNowRef = useRef(syncNow);
  useEffect(() => {
    syncNowRef.current = syncNow;
  }, [syncNow]);

  useEffect(() => {
    if (configStatus !== "ready") return;
    let disposed = false;
    const unsubscribe = adapter.subscribe((snapshot) => {
      if (disposed) return;
      setAuth(snapshot);
      if (
        snapshot.status === "signed_in" &&
        snapshot.emailVerified &&
        phaseRef.current === "local"
      ) {
        void syncNowRef.current(false);
      }
      if (snapshot.status === "signed_in" && !snapshot.emailVerified) {
        if (phaseRef.current === "local") setPhase("verification_required");
      }
    });
    // Restore an opted-in session lazily; pure guests never load Firebase.
    if (readOptInMarker()) {
      void adapter.requestCloudSync();
    }
    return () => {
      disposed = true;
      unsubscribe();
    };
    // The adapter identity and config status are stable for the page lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayProfile = useMemo(() => {
    if ((phase === "synced" || phase === "syncing") && cloudSnapshot) {
      return mergeCloudLearnerProfiles(localProfile, cloudSnapshot.profile);
    }
    return localProfile;
  }, [phase, cloudSnapshot, localProfile]);

  const continueAsGuest = useCallback(() => {
    setCollisionDetected(false);
    setStatus(
      "Guest practice is active. Progress stays on this device unless you add an optional account.",
    );
  }, [setStatus]);

  const createAccount = useCallback(
    async (email: string, password: string, confirmPassword: string) => {
      if (password !== confirmPassword) {
        setFailure("The passwords do not match. Re-enter the same password in both fields.");
        return;
      }
      setPhase("creating_account");
      setStatus("Creating your account…");
      const policy = await adapter.checkPasswordAgainstPolicy(password);
      if (policy.ok && !policy.meetsPolicy) {
        setPhase("local");
        setFailure(authErrorMessage("weak_password"));
        return;
      }
      const result = await adapter.createEmailAccount(email, password);
      if (!result.ok) {
        setPhase("local");
        setFailure(authErrorMessage(result.error));
        return;
      }
      markRecentAuth();
      writeOptInMarker(true);
      setPhase("verification_required");
      setStatus(
        "Account created. Open the verification email we sent, then choose “I verified my email”. Progress keeps saving on this device meanwhile.",
      );
    },
    [adapter, markRecentAuth, setFailure, setStatus],
  );

  const signInEmail = useCallback(
    async (email: string, password: string) => {
      setPhase("signing_in");
      setStatus("Signing in…");
      const result = await adapter.signInWithEmail(email, password);
      if (!result.ok) {
        setPhase("local");
        if (result.error === "provider_collision") setCollisionDetected(true);
        setFailure(authErrorMessage(result.error));
        return;
      }
      markRecentAuth();
      writeOptInMarker(true);
      await syncNow();
    },
    [adapter, markRecentAuth, setFailure, setStatus, syncNow],
  );

  const signInGoogle = useCallback(async () => {
    setPhase("signing_in");
    setStatus("Opening Google sign-in…");
    const result = await adapter.signInWithGoogle();
    if (!result.ok) {
      setPhase("local");
      if (result.error === "provider_collision") setCollisionDetected(true);
      setFailure(authErrorMessage(result.error));
      return;
    }
    markRecentAuth();
    writeOptInMarker(true);
    setCollisionDetected(false);
    await syncNow();
  }, [adapter, markRecentAuth, setFailure, setStatus, syncNow]);

  const linkGoogle = useCallback(async () => {
    if (!adapter.isProviderLinkingSupported()) {
      setFailure(authErrorMessage("link_unavailable"));
      return;
    }
    if (!hasRecentAuth()) {
      setFailure(authErrorMessage("recent_login_required"));
      return;
    }
    const result = await adapter.linkGoogleToCurrentAccount();
    if (!result.ok) {
      if (result.error === "link_unavailable") {
        setPhase("local");
        setCloudSnapshot(null);
      }
      setFailure(authErrorMessage(result.error));
      return;
    }
    setStatus("Google is now linked to this same account. Your progress ownership did not change.");
    await syncNow(true);
  }, [adapter, hasRecentAuth, setFailure, setStatus, syncNow]);

  const resendVerification = useCallback(async () => {
    const result = await adapter.resendVerificationEmail();
    if (!result.ok) {
      setFailure(authErrorMessage(result.error));
      return;
    }
    setStatus("Verification email sent. Open the link, then choose “I verified my email”.");
  }, [adapter, setFailure, setStatus]);

  const checkVerification = useCallback(async () => {
    const result = await adapter.refreshVerificationStatus();
    if (!result.ok) {
      setFailure(authErrorMessage(result.error));
      return;
    }
    if (adapter.getSnapshot().emailVerified) {
      setStatus("Email verified.");
      await syncNow();
    } else {
      setStatus(
        "Not verified yet. Open the link in the verification email, then check again. Progress keeps saving on this device.",
      );
    }
  }, [adapter, setFailure, setStatus, syncNow]);

  const sendReset = useCallback(
    async (email: string) => {
      const result = await adapter.sendPasswordReset(email);
      if (!result.ok) {
        setFailure(authErrorMessage(result.error));
        return;
      }
      setStatus("If an account exists for that address, a password reset email is on its way.");
    },
    [adapter, setFailure, setStatus],
  );

  const retrySync = useCallback(async () => {
    await syncNow();
  }, [syncNow]);

  const signOut = useCallback(async () => {
    const result = await adapter.signOutOfCloud();
    writeOptInMarker(false);
    setCloudSnapshot(null);
    setImportState("idle");
    setDeletionState("idle");
    setAccountDeletionState("unavailable");
    setCollisionDetected(false);
    setPhase("local");
    if (result.ok) {
      setStatus("Signed out. Showing the progress saved on this device. Your cloud data was not deleted.");
    } else {
      setFailure(authErrorMessage(result.error));
    }
  }, [adapter, setFailure, setStatus]);

  const acceptImport = useCallback(async () => {
    setImportState("importing");
    const token = await adapter.getFreshIdToken();
    if (!token.ok) {
      setImportState("offered");
      setFailure("The import could not start. Try again after the connection recovers.");
      return;
    }
    try {
      const response = await fetchWithTimeout("/api/progress", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ profile: localProfileRef.current }),
      });
      if (response.status === 409) {
        setImportState("completed");
        setStatus("This account already imported local progress once, so nothing was imported again.");
        await syncNow(true);
        return;
      }
      if (!response.ok) {
        setImportState("offered");
        setFailure("The import failed and nothing was copied. Your local progress is unchanged. Try again shortly.");
        return;
      }
      const parsed = progressSnapshotSchema.safeParse(await response.json());
      if (!parsed.success) {
        setImportState("offered");
        setFailure("The import response was invalid, so nothing was accepted. Try again shortly.");
        return;
      }
      setCloudSnapshot(parsed.data);
      setImportState("completed");
      setStatus("Local progress imported to your account as imported history (it never counts as verified cloud evidence).");
    } catch {
      setImportState("offered");
      setFailure("The import failed and nothing was copied. Your local progress is unchanged. Try again shortly.");
    }
  }, [adapter, setFailure, setStatus, syncNow]);

  const declineImport = useCallback(() => {
    setImportState("declined");
    setStatus("Local history stays on this device only. New verified labs still sync to your account.");
  }, [setStatus]);

  const requestDataDeletion = useCallback(() => {
    setDeletionState("confirming");
  }, []);

  const cancelDataDeletion = useCallback(() => {
    setDeletionState("idle");
  }, []);

  const confirmDataDeletion = useCallback(async () => {
    setDeletionState("deleting");
    const token = await adapter.getFreshIdToken();
    if (!token.ok) {
      setDeletionState("failed");
      setFailure("Cloud progress could not be deleted. Nothing was removed.");
      return;
    }
    try {
      const response = await fetchWithTimeout("/api/progress", {
        method: "DELETE",
        headers: { authorization: `Bearer ${token.token}` },
      });
      if (!response.ok) {
        setDeletionState("failed");
        setFailure("Cloud progress could not be deleted. Nothing was removed. Try again shortly.");
        return;
      }
      setCloudSnapshot({ profile: emptyLearnerProfile, localImportCompleted: false });
      setDeletionState("deleted");
      setImportState("idle");
      setAccountDeletionState("available");
      setStatus("Cloud progress deleted. Progress on this device is untouched.");
    } catch {
      setDeletionState("failed");
      setFailure("Cloud progress could not be deleted. Nothing was removed. Try again shortly.");
    }
  }, [adapter, setFailure, setStatus]);

  const deleteAccount = useCallback(async () => {
    if (deletionState !== "deleted") {
      setFailure("Delete your cloud learning data first, then delete the account.");
      return;
    }
    if (!hasRecentAuth()) {
      setFailure(authErrorMessage("recent_login_required"));
      return;
    }
    setAccountDeletionState("deleting");
    const result = await adapter.deleteCloudAccount();
    if (!result.ok) {
      setAccountDeletionState(result.error === "recent_login_required" ? "available" : "failed");
      setFailure(authErrorMessage(result.error));
      return;
    }
    writeOptInMarker(false);
    setCloudSnapshot(null);
    setImportState("idle");
    setDeletionState("idle");
    setAccountDeletionState("unavailable");
    setPhase("local");
    setStatus("Account deleted. Progress on this device is untouched.");
  }, [adapter, deletionState, hasRecentAuth, setFailure, setStatus]);

  const getAssessAuthHeader = useCallback(async (): Promise<
    Record<string, string> | undefined
  > => {
    try {
      const snapshot = adapter.getSnapshot();
      if (
        adapter.getCloudConfigStatus() !== "ready" ||
        snapshot.status !== "signed_in" ||
        !snapshot.emailVerified
      ) {
        return undefined;
      }
      const token = await Promise.race([
        adapter.getFreshIdToken(),
        new Promise<{ ok: false; error: CloudAuthErrorState }>((resolve) =>
          window.setTimeout(() => resolve({ ok: false, error: "unavailable" }), 8_000),
        ),
      ]);
      return token.ok ? { authorization: `Bearer ${token.token}` } : undefined;
    } catch {
      return undefined;
    }
  }, [adapter]);

  const afterAssessment = useCallback(
    (cloudSync: string | undefined) => {
      const snapshot = adapter.getSnapshot();
      if (adapter.getCloudConfigStatus() !== "ready" || snapshot.status !== "signed_in") return;
      if (cloudSync === "cloud_saved") {
        void syncNowRef.current(true);
        return;
      }
      if (cloudSync === "cloud_unavailable") {
        degrade("Your report is saved on this device—cloud is unavailable right now.");
        return;
      }
      if (cloudSync === "unauthorized" && !snapshot.emailVerified) {
        setPhase("verification_required");
      }
    },
    [adapter, degrade],
  );

  return {
    configStatus,
    phase,
    storageLabel: storageStateLabels[phase],
    statusMessage,
    errorMessage,
    auth,
    displayProfile,
    cloudSnapshot,
    importState,
    deletionState,
    accountDeletionState,
    linkingSupported: adapter.isProviderLinkingSupported(),
    collisionDetected,
    continueAsGuest,
    createAccount,
    signInEmail,
    signInGoogle,
    linkGoogle,
    resendVerification,
    checkVerification,
    sendReset,
    retrySync,
    signOut,
    acceptImport,
    declineImport,
    requestDataDeletion,
    cancelDataDeletion,
    confirmDataDeletion,
    deleteAccount,
    getAssessAuthHeader,
    afterAssessment,
  };
}

type PanelMode = "summary" | "create" | "login" | "reset";

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  show,
  onToggleShow,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "new-password" | "current-password";
  show: boolean;
  onToggleShow: () => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-zinc-400">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          name={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="field-input w-full px-4 py-2.5 text-sm"
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-pressed={show}
          aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          onClick={onToggleShow}
          className="shrink-0 px-3"
        >
          {show ? "Hide" : "Show"}
        </Button>
      </div>
    </div>
  );
}

export function ProgressSyncPanel({ sync }: { sync: CloudProgressSync }) {
  const [mode, setMode] = useState<PanelMode>("summary");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const resetForms = useCallback(() => {
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  }, []);

  const run = useCallback(
    async (action: () => Promise<void>, options: { clearPasswords?: boolean } = {}) => {
      setBusy(true);
      try {
        await action();
      } finally {
        setBusy(false);
        if (options.clearPasswords !== false) resetForms();
      }
    },
    [resetForms],
  );

  if (sync.configStatus !== "ready") {
    return (
      <Card as="section" aria-labelledby="progress-sync-heading" variant="panel" padding="md" className="mb-4">
        <h3 id="progress-sync-heading" className="instrument-label">
          Progress storage
        </h3>
        <p className="mt-2 text-xs leading-5 text-zinc-500">
          Progress is saved on this device. Optional account sync is not configured in this
          deployment, and nothing about your practice leaves the browser.
        </p>
      </Card>
    );
  }

  const signedIn = sync.auth.status === "signed_in";
  const statusLine = sync.statusMessage && (
    <p role="status" className="mt-2 text-xs leading-5 text-amber-200/90">
      {sync.statusMessage}
    </p>
  );
  const errorLine = sync.errorMessage && (
    <p role="alert" className="mt-2 text-xs leading-5 text-red-300">
      {sync.errorMessage}
    </p>
  );

  return (
    <Card as="section" aria-labelledby="progress-sync-heading" variant="panel" padding="md" className="mb-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="progress-sync-heading" className="instrument-label">
          Optional account sync
        </h3>
        <span className="status-pill px-2.5 py-1">
          <StatusDot
            tone={sync.phase === "synced" ? "verified" : sync.phase === "degraded" ? "failure" : "investigation"}
            size="sm"
          />
          Account sync · {sync.storageLabel}
        </span>
      </div>

      {!signedIn && (
        <div className="mt-3">
          <p className="text-xs leading-5 text-zinc-500">
            Guest practice is the default and never requires an account. Add an optional account
            only if you want the same progress on another device.
          </p>

          {mode === "summary" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  resetForms();
                  setMode("summary");
                  sync.continueAsGuest();
                }}
              >
                Continue as guest
              </Button>
              <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => setMode("create")}>
                Create account
              </Button>
              <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => setMode("login")}>
                Log in
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => void run(() => sync.signInGoogle())}
              >
                Continue with Google
              </Button>
            </div>
          )}

          {mode === "create" && (
            <form
              className="mt-3 max-w-sm space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void run(() => sync.createAccount(email, password, confirmPassword));
              }}
            >
              <Field
                id="sync-create-email"
                name="email"
                label="Email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <PasswordField
                id="sync-create-password"
                label="Password"
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
                show={showPassword}
                onToggleShow={() => setShowPassword((value) => !value)}
              />
              <PasswordField
                id="sync-create-confirm"
                label="Confirm password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
                show={showPassword}
                onToggleShow={() => setShowPassword((value) => !value)}
              />
              <p className="text-[10px] leading-4 text-zinc-600">
                Passwords are checked against the account password policy and belong to the
                identity service — FaultSmith never stores or transmits them itself. New accounts
                verify their email before cloud sync starts.
              </p>
              <div className="flex gap-2">
                <Button type="submit" variant="primary" size="sm" disabled={busy}>
                  {busy ? "Creating…" : "Create account"}
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => setMode("summary")}>
                  Back
                </Button>
              </div>
            </form>
          )}

          {mode === "login" && (
            <form
              className="mt-3 max-w-sm space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void run(() => sync.signInEmail(email, password));
              }}
            >
              <Field
                id="sync-login-email"
                name="email"
                label="Email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <PasswordField
                id="sync-login-password"
                label="Password"
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
                show={showPassword}
                onToggleShow={() => setShowPassword((value) => !value)}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" variant="primary" size="sm" disabled={busy}>
                  {busy ? "Signing in…" : "Log in"}
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => setMode("summary")}>
                  Back
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setMode("reset")}
                  className="px-2 text-[11px] text-zinc-500 underline underline-offset-4 hover:text-zinc-200"
                >
                  Forgot password?
                </Button>
              </div>
            </form>
          )}

          {mode === "reset" && (
            <form
              className="mt-3 max-w-sm space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void run(() => sync.sendReset(email));
              }}
            >
              <Field
                id="sync-reset-email"
                name="email"
                label="Email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <div className="flex gap-2">
                <Button type="submit" variant="primary" size="sm" disabled={busy}>
                  Send reset email
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => setMode("login")}>
                  Back to log in
                </Button>
              </div>
            </form>
          )}

          {sync.collisionDetected && (
            <p className="mt-3 max-w-md text-[11px] leading-4 text-amber-200/80">
              This email already has a different sign-in method. Use that original method to keep
              one account; nothing is merged or copied automatically.
            </p>
          )}
        </div>
      )}

      {signedIn && sync.phase === "verification_required" && (
        <div className="mt-3">
          <p className="text-xs leading-5 text-zinc-400">
            Verify your email to enable cloud sync. Until then everything keeps saving on this
            device and nothing is lost.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="primary" size="sm" disabled={busy} onClick={() => void run(() => sync.checkVerification())}>
              I verified my email
            </Button>
            <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => void run(() => sync.resendVerification())}>
              Resend verification email
            </Button>
            <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => void run(() => sync.signOut())}>
              Sign out
            </Button>
          </div>
        </div>
      )}

      {signedIn && sync.phase !== "verification_required" && (
        <div className="mt-3">
          <p className="text-xs leading-5 text-zinc-400">
            {sync.phase === "synced"
              ? "Verified labs sync to your account after each report. Local progress stays first-class on this device."
              : sync.phase === "degraded"
                ? "Cloud is unreachable, so progress keeps saving on this device. Nothing is lost; sync retries when you ask."
                : "Preparing cloud sync…"}
          </p>

          {sync.importState === "offered" && (
            <div className="mt-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-3">
              <p className="text-xs leading-5 text-zinc-300">
                Import the progress already on this device into your account? Imported history is
                labeled as an import and can happen only once for this account.
              </p>
              <div className="mt-2 flex gap-2">
                <Button type="button" variant="primary" size="sm" disabled={busy} onClick={() => void run(() => sync.acceptImport())}>
                  Import local progress
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => sync.declineImport()}>
                  Not now
                </Button>
              </div>
            </div>
          )}
          {sync.importState === "importing" && (
            <p className="mt-3 text-xs text-zinc-500">Importing local progress…</p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {sync.phase === "degraded" && (
              <Button type="button" variant="primary" size="sm" disabled={busy} onClick={() => void run(() => sync.retrySync())}>
                Retry sync
              </Button>
            )}
            <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => void run(() => sync.signOut())}>
              Sign out
            </Button>
            {sync.linkingSupported && sync.auth.hasPasswordProvider && !sync.auth.hasGoogleProvider && (
              <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => void run(() => sync.linkGoogle())}>
                Link Google to this account
              </Button>
            )}
            {sync.deletionState !== "confirming" && sync.deletionState !== "deleting" && (
              <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => sync.requestDataDeletion()}>
                Delete cloud data
              </Button>
            )}
          </div>

          {sync.deletionState === "confirming" && (
            <div className="mt-3 rounded-xl border border-red-400/15 bg-red-400/[0.04] p-3">
              <p className="text-xs leading-5 text-zinc-300">
                Delete all learning progress stored in your account? Progress on this device is
                not affected. This cannot be undone.
              </p>
              <div className="mt-2 flex gap-2">
                <Button type="button" variant="danger" size="sm" disabled={busy} onClick={() => void run(() => sync.confirmDataDeletion())}>
                  Yes, delete cloud data
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => sync.cancelDataDeletion()}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
          {sync.deletionState === "deleting" && (
            <p className="mt-3 text-xs text-zinc-500">Deleting cloud data…</p>
          )}

          {sync.accountDeletionState !== "unavailable" && (
            <div className="mt-3 rounded-xl border border-white/7 bg-black/15 p-3">
              <p className="text-xs leading-5 text-zinc-400">
                Cloud data is deleted. You can now delete the account itself. This requires a
                recent sign-in.
              </p>
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={busy || sync.accountDeletionState === "deleting"}
                onClick={() => void run(() => sync.deleteAccount())}
                className="mt-2"
              >
                {sync.accountDeletionState === "deleting" ? "Deleting account…" : "Delete account"}
              </Button>
            </div>
          )}
        </div>
      )}

      {statusLine}
      {errorLine}
    </Card>
  );
}

export function AccountSyncCallout({
  sync,
  context,
}: {
  sync: CloudProgressSync;
  context: "lab" | "result";
}) {
  if (sync.configStatus !== "ready" || sync.auth.status === "signed_in") return null;

  const title = context === "lab" ? "Keep this investigation with you" : "Keep your verified evidence";
  const description = context === "lab"
    ? "This attempt is already saved on this device. Create an account to back up verified lessons and carry personalized skill metrics to another device."
    : "Your result is already safe on this device. Create an account to sync verified progress, recommendations, and personalized skill metrics across devices.";

  return (
    <details className="account-sync-callout mt-4">
      <summary className="account-sync-callout-summary focus-brackets">
        <span className="account-sync-callout-copy">
          <span className="instrument-label text-cyan-200">Optional account · guest-first</span>
          <strong>{title}</strong>
          <span>{description}</span>
        </span>
        <span aria-hidden="true" className="account-sync-callout-action">
          Create account or sign in <i>+</i>
        </span>
      </summary>
      <div className="account-sync-callout-panel">
        <ProgressSyncPanel sync={sync} />
      </div>
    </details>
  );
}
