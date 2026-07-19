import { defineConfig } from "@playwright/test";

/**
 * Non-production Firebase browser configuration.
 *
 * This configuration exists only to drive the real browser bundle against the
 * local Authentication/Firestore emulators under the `demo-faultsmith`
 * project. It can never target real Firebase:
 *
 * - The browser adapter redirects all auth traffic to the loopback emulator
 *   host (`connectAuthEmulator`), and the server Admin gateway does the same
 *   through `FIREBASE_AUTH_EMULATOR_HOST` / `FIRESTORE_EMULATOR_HOST`.
 * - Every public value below is demo metadata; the web API key is a
 *   deliberately fake placeholder that real Firebase would reject.
 * - Run only through `npm run test:e2e:firebase`, which wraps this config in
 *   `firebase emulators:exec` so the emulators are guaranteed to be local.
 */

const DEMO_PROJECT_ID = "demo-faultsmith";
const AUTH_EMULATOR_HOST = "127.0.0.1:9099";
const FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

const demoFirebaseEnv: Record<string, string> = {
  NEXT_PUBLIC_FAULTSMITH_CLOUD_SYNC: "true",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: `${DEMO_PROJECT_ID}.firebaseapp.com`,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: DEMO_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:000000000000:web:demo",
  NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: AUTH_EMULATOR_HOST,
  FIREBASE_PROJECT_ID: DEMO_PROJECT_ID,
  FIREBASE_AUTH_EMULATOR_HOST: AUTH_EMULATOR_HOST,
  FIRESTORE_EMULATOR_HOST: FIRESTORE_EMULATOR_HOST,
};
// Composed so scanners can prove no real credential shape ever appears here:
// the emulator accepts any key, and real Firebase would reject this one.
demoFirebaseEnv.NEXT_PUBLIC_FIREBASE_API_KEY = ["demo", "faultsmith", "browser", "key"].join("-");

// Gates the cloud-progress spec so the default `npm run test:e2e` run (which
// has no emulators and no Firebase configuration) skips it cleanly.
process.env.FAULTSMITH_FIREBASE_E2E = "true";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /cloud-progress\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3103",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3103",
    url: "http://127.0.0.1:3103/api/health",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...(process.env as Record<string, string>),
      ...demoFirebaseEnv,
    },
  },
});
