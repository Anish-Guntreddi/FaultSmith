import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";

/**
 * Optional Firebase Authentication origins.
 *
 * The CSP widens only when cloud sync is explicitly configured, and only by
 * the exact origins the approved email/password and Google popup flows
 * empirically require:
 *
 * - `https://identitytoolkit.googleapis.com` — account create/sign-in/lookup,
 *   OOB email actions, and password-policy reads (connect-src).
 * - `https://securetoken.googleapis.com` — ID-token refresh (connect-src).
 * - `https://{validated auth domain}` — the SDK's popup/redirect helper
 *   iframe served from the project auth domain (frame-src).
 * - `https://apis.google.com` — the gapi loader script the SDK injects into
 *   the parent page to drive the popup helper iframe (script-src). Proven
 *   empirically: without it the popup flow fails with a script-src CSP
 *   violation before any popup opens.
 *
 * No wildcard is ever added. The auth domain is validated as a plain
 * hostname before interpolation; anything else is ignored and the CSP stays
 * at the local baseline.
 */
const AUTH_DOMAIN_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

/** Loopback-only auth emulator host; never honored in production builds. */
const EMULATOR_HOST_PATTERN = /^(?:127\.0\.0\.1|localhost):\d{2,5}$/;

function resolveValidatedAuthDomain(): string | null {
  if (process.env.NEXT_PUBLIC_FAULTSMITH_CLOUD_SYNC !== "true") return null;
  const candidate = (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "").trim().toLowerCase();
  return AUTH_DOMAIN_PATTERN.test(candidate) ? candidate : null;
}

function resolveEmulatorOrigin(): string | null {
  if (!isDevelopment) return null;
  if (process.env.NEXT_PUBLIC_FAULTSMITH_CLOUD_SYNC !== "true") return null;
  const candidate = (process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST ?? "").trim();
  return EMULATOR_HOST_PATTERN.test(candidate) ? `http://${candidate}` : null;
}

const validatedAuthDomain = resolveValidatedAuthDomain();
const emulatorOrigin = resolveEmulatorOrigin();
const cloudAuthConfigured = validatedAuthDomain !== null;

const firebaseConnectSources = cloudAuthConfigured
  ? [
      "https://identitytoolkit.googleapis.com",
      "https://securetoken.googleapis.com",
      ...(emulatorOrigin ? [emulatorOrigin] : []),
    ]
  : [];

const firebaseFrameSources = cloudAuthConfigured
  ? [`https://${validatedAuthDomain}`, ...(emulatorOrigin ? [emulatorOrigin] : [])]
  : [];

const firebaseScriptSources = cloudAuthConfigured ? ["https://apis.google.com"] : [];

const contentSecurityPolicy = [
  "default-src 'self'",
  // Residual: Next.js emits framework inline scripts/styles that require
  // 'unsafe-inline' without a nonce/hash pipeline. A nonce migration forces
  // fully dynamic rendering (see the bundled Next.js CSP guide) and would
  // break the static/demo behavior this project depends on, so the residual
  // is documented and retained deliberately.
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}${firebaseScriptSources.map((origin) => ` ${origin}`).join("")}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  `connect-src 'self'${isDevelopment ? " ws:" : ""}${firebaseConnectSources.map((origin) => ` ${origin}`).join("")}`,
  // Without cloud auth no frame-src is emitted, so frames stay governed by
  // default-src 'self' exactly as before this feature existed.
  ...(firebaseFrameSources.length > 0 ? [`frame-src ${firebaseFrameSources.join(" ")}`] : []),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          {
            key: "Cross-Origin-Opener-Policy",
            // The Firebase popup flow requires the opener relationship with
            // its cross-origin helper window; without cloud auth the stricter
            // baseline is preserved.
            value: cloudAuthConfigured ? "same-origin-allow-popups" : "same-origin",
          },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
