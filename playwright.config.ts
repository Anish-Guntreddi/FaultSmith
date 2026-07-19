import { defineConfig } from "@playwright/test";

// The standard browser suite is the explicit configuration-off regression
// gate. Keep it deterministic even when a developer has real Firebase values
// in an untracked .env.local; emulator/real-cloud proof uses separate configs.
const localOnlyEnv: Record<string, string> = {
  NEXT_PUBLIC_FAULTSMITH_CLOUD_SYNC: "false",
  NEXT_PUBLIC_FIREBASE_API_KEY: "",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "",
  NEXT_PUBLIC_FIREBASE_APP_ID: "",
  FIREBASE_PROJECT_ID: "",
  FIREBASE_SERVICE_ACCOUNT: "",
};

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3101",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3101",
    url: "http://127.0.0.1:3101/api/health",
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      ...(process.env as Record<string, string>),
      ...localOnlyEnv,
    },
  },
});
