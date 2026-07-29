import "server-only";

import type { App } from "firebase-admin/app";
import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";

/**
 * Server-only lazy Firebase Admin gateway.
 *
 * - Importing this module never touches the Firebase Admin SDK; every SDK
 *   load happens through dynamic import inside a function call.
 * - Admin initializes only when the complete cloud configuration exists:
 *   the cloud flag, a plausible project identifier, and either a validated
 *   in-memory service-account shape or both emulator hosts.
 * - Configuration and credential problems collapse into a single safe
 *   {@link CloudUnavailableError}; no credential value, project detail, or
 *   provider error ever reaches a log or an error message.
 */

/** Single bounded availability failure for every cloud persistence problem. */
export class CloudUnavailableError extends Error {
  constructor() {
    super("Cloud persistence is unavailable.");
    this.name = "CloudUnavailableError";
  }
}

const ADMIN_APP_NAME = "faultsmith-cloud-progress";

/** Firebase project identifiers: lowercase, digits, hyphens, bounded length. */
const PROJECT_ID_PATTERN = /^[a-z][a-z0-9-]{3,39}$/;

const MAX_SERVICE_ACCOUNT_JSON_LENGTH = 20_000;

type ValidatedServiceAccount = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

export type ServerCloudConfig =
  | { status: "off" }
  | { status: "incomplete" }
  | {
      status: "ready";
      projectId: string;
      serviceAccount: ValidatedServiceAccount | null;
      usingEmulators: boolean;
    };

/**
 * Validate the in-memory credential shape without emitting any value. The
 * check is structural only: required fields exist, are strings, stay within
 * bounds, and the embedded project matches the configured project.
 */
function validateServiceAccountShape(
  raw: string | undefined,
  expectedProjectId: string,
): ValidatedServiceAccount | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_SERVICE_ACCOUNT_JSON_LENGTH) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;

  const record = parsed as Record<string, unknown>;
  const projectId = record.project_id;
  const clientEmail = record.client_email;
  const privateKey = record.private_key;

  if (typeof projectId !== "string" || projectId !== expectedProjectId) return null;
  if (
    typeof clientEmail !== "string" ||
    clientEmail.length < 3 ||
    clientEmail.length > 320 ||
    !clientEmail.includes("@")
  ) {
    return null;
  }
  if (typeof privateKey !== "string" || privateKey.length < 40 || privateKey.length > 10_000) {
    return null;
  }

  return { projectId, clientEmail, privateKey };
}

/**
 * Read the server cloud configuration. `off` means the learner never opted
 * into cloud sync; `incomplete` means the flag is on but the server-side
 * values are missing or malformed. Only `ready` permits Admin initialization.
 */
export function readServerCloudConfig(): ServerCloudConfig {
  if (process.env.NEXT_PUBLIC_FAULTSMITH_CLOUD_SYNC !== "true") return { status: "off" };

  const projectId = (process.env.FIREBASE_PROJECT_ID ?? "").trim();
  if (!PROJECT_ID_PATTERN.test(projectId)) return { status: "incomplete" };

  const usingEmulators =
    (process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "").trim().length > 0 &&
    (process.env.FIRESTORE_EMULATOR_HOST ?? "").trim().length > 0;
  if (usingEmulators) {
    return { status: "ready", projectId, serviceAccount: null, usingEmulators: true };
  }

  const serviceAccount = validateServiceAccountShape(
    process.env.FIREBASE_SERVICE_ACCOUNT,
    projectId,
  );
  if (!serviceAccount) return { status: "incomplete" };

  return { status: "ready", projectId, serviceAccount, usingEmulators: false };
}

export function isCloudPersistenceConfigured(): boolean {
  return readServerCloudConfig().status === "ready";
}

let cachedApp: App | null = null;

async function getAdminApp(): Promise<App> {
  const config = readServerCloudConfig();
  if (config.status !== "ready") throw new CloudUnavailableError();
  if (cachedApp) return cachedApp;

  try {
    const { initializeApp, cert, getApps } = await import("firebase-admin/app");
    const existing = getApps().find((app) => app.name === ADMIN_APP_NAME);
    if (existing) {
      cachedApp = existing;
      return existing;
    }
    cachedApp = initializeApp(
      config.serviceAccount
        ? {
            projectId: config.projectId,
            credential: cert({
              projectId: config.serviceAccount.projectId,
              clientEmail: config.serviceAccount.clientEmail,
              privateKey: config.serviceAccount.privateKey,
            }),
          }
        : { projectId: config.projectId },
      ADMIN_APP_NAME,
    );
    return cachedApp;
  } catch {
    cachedApp = null;
    throw new CloudUnavailableError();
  }
}

export async function getAdminAuth(): Promise<Auth> {
  const app = await getAdminApp();
  try {
    const { getAuth } = await import("firebase-admin/auth");
    return getAuth(app);
  } catch {
    throw new CloudUnavailableError();
  }
}

export async function getAdminFirestore(): Promise<Firestore> {
  const app = await getAdminApp();
  try {
    const { getFirestore } = await import("firebase-admin/firestore");
    return getFirestore(app);
  } catch {
    throw new CloudUnavailableError();
  }
}

/**
 * Dispose the cached Admin app so the next call re-reads configuration.
 * Used by integration tests to model process restarts and configuration
 * loss; harmless in production.
 */
export async function resetFirebaseAdmin(): Promise<void> {
  cachedApp = null;
  try {
    const { getApps, deleteApp } = await import("firebase-admin/app");
    const existing = getApps().find((app) => app.name === ADMIN_APP_NAME);
    if (existing) await deleteApp(existing);
  } catch {
    // The SDK was never loaded or the app is already gone; nothing to release.
  }
}
