import "server-only";

import { CloudUnavailableError, getAdminAuth } from "./firebase-admin";

/**
 * Server-only identity data-access layer.
 *
 * The server derives identity exclusively from a verified Firebase ID token
 * presented as a single bounded Bearer Authorization value. No client-supplied
 * email, provider, or profile field can select, merge, or influence an
 * identity: the only output is an internal UID wrapper produced after
 * verification. Email/password identities whose verified token does not
 * confirm email verification are rejected; Google and email identities that
 * pass verification share the same wrapper and profile path.
 */

/** Internal verified identity wrapper. Only the UID crosses this boundary. */
export type VerifiedIdentity = {
  readonly kind: "verified_identity";
  readonly uid: string;
};

/** Firebase UIDs are bounded identifiers safe for fixed path construction. */
const UID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

const BEARER_PREFIX = "Bearer ";
const MAX_AUTHORIZATION_HEADER_LENGTH = 4_608;
const TOKEN_PATTERN = /^[A-Za-z0-9._-]{1,4096}$/;

/**
 * Wrap a UID that has already been verified by the identity DAL (or a trusted
 * test double). Returns null for anything outside the bounded UID shape so an
 * unexpected value can never become a document path segment.
 */
export function createVerifiedIdentity(uid: string): VerifiedIdentity | null {
  if (!UID_PATTERN.test(uid)) return null;
  return Object.freeze({ kind: "verified_identity", uid });
}

export type BearerTokenResult =
  | { ok: true; token: string }
  | { ok: false; reason: "missing" | "malformed" };

/**
 * Parse a single bounded Bearer Authorization value.
 *
 * The fetch Headers API joins duplicate Authorization headers with a comma,
 * and a legitimate Firebase ID token can never contain one — so any comma is
 * treated as a duplicate/mixed submission and rejected. Missing, oversized,
 * non-Bearer, and malformed values are rejected without detail.
 */
export function readBearerToken(headers: Headers): BearerTokenResult {
  const raw = headers.get("authorization");
  if (raw === null) return { ok: false, reason: "missing" };
  if (raw.length === 0 || raw.length > MAX_AUTHORIZATION_HEADER_LENGTH) {
    return { ok: false, reason: "malformed" };
  }
  if (raw.includes(",")) return { ok: false, reason: "malformed" };
  if (!raw.startsWith(BEARER_PREFIX)) return { ok: false, reason: "malformed" };

  const token = raw.slice(BEARER_PREFIX.length);
  if (!TOKEN_PATTERN.test(token)) return { ok: false, reason: "malformed" };
  return { ok: true, token };
}

/** Minimal claims contract returned by a token verifier. */
export interface VerifiedTokenClaims {
  uid: string;
  emailVerified: boolean;
}

export type TokenVerifier = (token: string) => Promise<VerifiedTokenClaims>;

export type IdentityFailureReason =
  | "missing_token"
  | "invalid_token"
  | "unverified_identity"
  | "unavailable";

export type IdentityResult =
  | { ok: true; identity: VerifiedIdentity }
  | { ok: false; reason: IdentityFailureReason };

/**
 * Production verifier: verifies the ID token against the configured Firebase
 * project through the lazy Admin gateway. Signature, audience, issuer, and
 * expiry are all enforced by the Admin SDK.
 */
async function verifyWithFirebase(token: string): Promise<VerifiedTokenClaims> {
  const auth = await getAdminAuth();
  const decoded = await auth.verifyIdToken(token);
  return {
    uid: typeof decoded.uid === "string" ? decoded.uid : "",
    emailVerified: decoded.email_verified === true,
  };
}

function classifyVerifierError(error: unknown): IdentityFailureReason {
  if (error instanceof CloudUnavailableError) return "unavailable";
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code === "string" && code.startsWith("auth/")) return "invalid_token";
  return "unavailable";
}

/**
 * Verify the request identity for protected cloud routes.
 *
 * Fail-closed rules:
 * - No token, duplicate/mixed/oversized/malformed header → rejected.
 * - Token that does not verify for the configured project → rejected.
 * - Verified token that does not confirm email verification → rejected.
 *   This is provider-independent, which covers the unverified email
 *   sign-up case without trusting any provider detail from the client.
 * - Verification infrastructure unavailable → rejected as unavailable.
 *
 * Nothing is ever logged from this path: no token, UID, email, or provider
 * response leaves the function except the internal UID wrapper.
 */
export async function verifyRequestIdentity(
  request: Request,
  deps: { verifyToken?: TokenVerifier } = {},
): Promise<IdentityResult> {
  const bearer = readBearerToken(request.headers);
  if (!bearer.ok) {
    return { ok: false, reason: bearer.reason === "missing" ? "missing_token" : "invalid_token" };
  }

  const verifyToken = deps.verifyToken ?? verifyWithFirebase;
  let claims: VerifiedTokenClaims;
  try {
    claims = await verifyToken(bearer.token);
  } catch (error) {
    return { ok: false, reason: classifyVerifierError(error) };
  }

  if (claims.emailVerified !== true) return { ok: false, reason: "unverified_identity" };

  const identity = createVerifiedIdentity(claims.uid);
  if (!identity) return { ok: false, reason: "invalid_token" };
  return { ok: true, identity };
}
