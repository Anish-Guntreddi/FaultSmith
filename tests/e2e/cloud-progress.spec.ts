import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Firebase emulator browser suite.
 *
 * Runs only through `npm run test:e2e:firebase`, which wraps the dedicated
 * Playwright configuration in `firebase emulators:exec` under the
 * `demo-faultsmith` project. It never contacts real Firebase: the browser
 * adapter is connected to the loopback Auth emulator and the server Admin
 * gateway to both emulators. The default `npm run test:e2e` run skips this
 * file entirely.
 */

const firebaseMode = process.env.FAULTSMITH_FIREBASE_E2E === "true";

const PROGRESS_KEY = "faultsmith:learning-progress:v1";
const HISTORY_KEY = "faultsmith:attempt-history:v1";
const OPT_IN_KEY = "faultsmith:cloud-sync-enabled:v1";

const PROJECT_ID = "demo-faultsmith";
const AUTH_EMULATOR = "http://127.0.0.1:9099";
const FIRESTORE_EMULATOR = "http://127.0.0.1:8080";
const examplePassword = ["correct", "horse", "battery", "example"].join("-");

const verifiedSeedAttempt = {
  attemptId: "seed-attempt-0001",
  lessonId: "evidence-boundaries",
  projectId: "expense-approval",
  skill: "Boundary conditions",
  difficulty: "beginner",
  challengeSource: "prevalidated",
  status: "verified",
  rootCauseScore: 88,
  reasoningScore: 84,
  patchDisciplineScore: 92,
  conceptUnderstandingScore: 86,
  hintsUsed: 1,
  testRuns: 4,
  changedLines: 1,
  durationBucket: "under_5_minutes",
  completedAt: 1_700_000_000_000,
  provenance: "server_verified",
};

const v1ProgressSeed = {
  version: 1,
  completions: [
    { stepId: "evidence-boundaries", completedAt: 1_700_000_000_000, overallScore: 88, hintsUsed: 1, testRuns: 2 },
    { stepId: "evidence-booleans", completedAt: 1_700_000_100_000, overallScore: 91, hintsUsed: 0, testRuns: 1 },
  ],
};

let emailCounter = 0;
function uniqueEmail(prefix: string): string {
  emailCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${emailCounter}@example.test`;
}

async function resetEmulators(): Promise<void> {
  await fetch(`${AUTH_EMULATOR}/emulator/v1/projects/${PROJECT_ID}/accounts`, { method: "DELETE" });
  await fetch(
    `${FIRESTORE_EMULATOR}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: "DELETE" },
  );
}

/** Creates a password account directly in the emulator and marks it verified. */
async function createVerifiedUser(email: string, password: string): Promise<void> {
  const signUp = await fetch(
    `${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-emulator-key`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const created = (await signUp.json()) as { localId?: string };
  if (!created.localId) throw new Error("emulator signUp failed");
  const update = await fetch(`${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:update`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer owner" },
    body: JSON.stringify({ localId: created.localId, emailVerified: true }),
  });
  if (!update.ok) throw new Error("emulator verification update failed");
}

async function latestOobLink(email: string, requestType: string): Promise<string | null> {
  const response = await fetch(`${AUTH_EMULATOR}/emulator/v1/projects/${PROJECT_ID}/oobCodes`);
  const data = (await response.json()) as {
    oobCodes?: Array<{ email: string; requestType: string; oobLink: string }>;
  };
  const matches = (data.oobCodes ?? []).filter(
    (code) => code.email === email && code.requestType === requestType,
  );
  return matches.at(-1)?.oobLink ?? null;
}

async function openSeeded(page: Page, entries: Record<string, unknown> = {}) {
  const token = `${Date.now()}-${Math.random()}`;
  await page.addInitScript(
    ({ cleanToken, seededEntries }) => {
      if (new URLSearchParams(window.location.search).get("e2e-clean") === cleanToken) {
        window.localStorage.clear();
        for (const [key, value] of Object.entries(seededEntries)) {
          window.localStorage.setItem(key, JSON.stringify(value));
        }
      }
    },
    { cleanToken: token, seededEntries: entries },
  );
  await page.goto(`/?e2e-clean=${encodeURIComponent(token)}`);
  await expect(page.getByRole("heading", { name: "Learn to debug code you didn't write." })).toBeVisible();
  await page.evaluate(() => window.history.replaceState(null, "", "/"));
}

/** The application's inline alert; excludes Next.js's empty route announcer. */
function syncAlert(page: Page) {
  return page.locator('p[role="alert"]');
}

async function openMyProgress(page: Page) {
  await page.getByRole("button", { name: "My Progress", exact: true }).click();
  await expect(page.getByRole("heading", { name: "My Progress" })).toBeVisible();
}

async function logInWithEmail(page: Page, email: string, password: string) {
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
}

async function createAccountThroughUi(page: Page, email: string, password: string, confirm = password) {
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password", { exact: true }).fill(confirm);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
}

async function expectSynced(page: Page) {
  await expect(page.getByText("Synced to account").first()).toBeVisible({ timeout: 15_000 });
}

async function completeVerifiedGuidedLab(page: Page) {
  await page.getByRole("button", { name: "Start guided lab", exact: false }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "The missing exact-threshold approval" }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Current hypothesis" }).fill(
    "The exact threshold is excluded because the boundary comparison is strict.",
  );
  const editor = page.getByRole("textbox", { name: "Python code editor" });
  await editor.fill((await editor.inputValue()).replace("expense.amount > 500", "expense.amount >= 500"));
  await page.getByRole("textbox", { name: "Root-cause explanation" }).fill(
    "The strict comparison excluded exactly $500. Restoring the inclusive boundary fixes that case.",
  );
  await page.getByRole("button", { name: "Submit patch + reasoning" }).click();
  await expect(page.getByRole("heading", { name: "You proved the fix, not just the outcome." })).toBeVisible({
    timeout: 20_000,
  });
}

test.describe("cloud progress in Firebase emulator mode", () => {
  test.skip(!firebaseMode, "Requires the Firebase emulator configuration (npm run test:e2e:firebase).");

  test.beforeEach(async () => {
    await resetEmulators();
  });

  test("continuing as guest announces confirmation and keeps device storage", async ({ page }) => {
    await openSeeded(page);
    await openMyProgress(page);

    await page.getByRole("button", { name: "Continue as guest", exact: true }).click();
    await expect(page.locator('p[role="status"]')).toContainText("Guest practice is active");
    await expect(page.getByText("On this device", { exact: true }).first()).toBeVisible();
  });

  test("password creation enforces confirm match and the password policy", async ({ page }) => {
    await openSeeded(page);
    await openMyProgress(page);

    const email = uniqueEmail("policy");
    await createAccountThroughUi(page, email, examplePassword, `${examplePassword}-different`);
    await expect(syncAlert(page)).toContainText("passwords do not match");
    await expect(page.getByText("On this device", { exact: true }).first()).toBeVisible();

    await page.getByLabel("Password", { exact: true }).fill("ab1");
    await page.getByLabel("Confirm password", { exact: true }).fill("ab1");
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    await expect(syncAlert(page)).toContainText("password policy");
    await expect(page.getByText("On this device", { exact: true }).first()).toBeVisible();
  });

  test("an unverified account keeps learning locally with resend cooldown", async ({ page }) => {
    await openSeeded(page);
    await openMyProgress(page);

    const email = uniqueEmail("unverified");
    await createAccountThroughUi(page, email, examplePassword);
    await expect(page.getByText("Verification required").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "I verified my email" })).toBeVisible();

    // The very first verification email was sent during creation, so an
    // immediate resend is inside the cooldown window.
    await page.getByRole("button", { name: "Resend verification email" }).click();
    await expect(syncAlert(page)).toContainText("wait about a minute");

    // Local continuity: the roadmap and labs remain fully usable.
    await page.getByRole("button", { name: "Guided roadmap", exact: true }).click();
    await expect(page.getByRole("button", { name: "Start guided lab", exact: false })).toBeVisible();
  });

  test("email verification through the emulator link enables sync", async ({ page }) => {
    await openSeeded(page);
    await openMyProgress(page);

    const email = uniqueEmail("verify");
    await createAccountThroughUi(page, email, examplePassword);
    await expect(page.getByText("Verification required").first()).toBeVisible();

    // Checking before the link is applied stays safely unverified.
    await page.getByRole("button", { name: "I verified my email" }).click();
    await expect(page.getByText("Not verified yet", { exact: false })).toBeVisible();

    const link = await latestOobLink(email, "VERIFY_EMAIL");
    expect(link).not.toBeNull();
    await fetch(link as string);

    await page.getByRole("button", { name: "I verified my email" }).click();
    await expectSynced(page);
  });

  test("invalid logins stay generic and enumeration-resistant", async ({ page }) => {
    const email = uniqueEmail("enum");
    await createVerifiedUser(email, examplePassword);

    await openSeeded(page);
    await openMyProgress(page);

    await logInWithEmail(page, uniqueEmail("does-not-exist"), examplePassword);
    const unknownMessage = await syncAlert(page).innerText();

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(`${examplePassword}-wrong`);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(syncAlert(page)).toBeVisible();
    const wrongPasswordMessage = await syncAlert(page).innerText();

    expect(unknownMessage).toBe(wrongPasswordMessage);
    expect(unknownMessage).not.toMatch(/exist|found|unknown|registered/i);
  });

  test("password reset reports generic success and rate limits locally", async ({ page }) => {
    await openSeeded(page);
    await openMyProgress(page);

    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page.getByRole("button", { name: "Forgot password?" }).click();
    await page.getByLabel("Email").fill(uniqueEmail("no-account"));
    await page.getByRole("button", { name: "Send reset email" }).click();
    await expect(page.getByText("If an account exists for that address", { exact: false })).toBeVisible();

    await page.getByLabel("Email").fill(uniqueEmail("no-account"));
    await page.getByRole("button", { name: "Send reset email" }).click();
    await expect(syncAlert(page)).toContainText("wait about a minute");
  });

  test("Google sign-in through the emulator popup syncs progress", async ({ page }) => {
    await openSeeded(page);
    await openMyProgress(page);

    const popupPromise = page.waitForEvent("popup");
    await page.getByRole("button", { name: "Continue with Google" }).click();
    const popup = await popupPromise;
    await popup.waitForLoadState("load");
    await popup.getByRole("button", { name: /add new account/i }).click();
    const autoGenerate = popup.getByRole("button", { name: /auto-generate/i });
    await expect(autoGenerate).toBeVisible({ timeout: 15_000 });
    await autoGenerate.click();
    await popup.getByRole("button", { name: /sign in with google/i }).click();

    await expectSynced(page);
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  });

  test("Google cancellation and popup blocking degrade to guest safely", async ({ page }) => {
    await openSeeded(page);
    await openMyProgress(page);

    const popupPromise = page.waitForEvent("popup");
    await page.getByRole("button", { name: "Continue with Google" }).click();
    const popup = await popupPromise;
    await popup.close();
    await expect(syncAlert(page)).toContainText("cancelled", { timeout: 20_000 });
    await expect(page.getByText("On this device", { exact: true }).first()).toBeVisible();

    // Popup blocking: window.open returns null for the next attempt.
    await page.evaluate(() => {
      window.open = () => null;
    });
    await page.getByRole("button", { name: "Continue with Google" }).click();
    await expect(syncAlert(page)).toContainText("popup was blocked", { timeout: 20_000 });
    await expect(page.getByText("On this device", { exact: true }).first()).toBeVisible();

    // Guest learning continues after both failures.
    await page.getByRole("button", { name: "Guided roadmap", exact: true }).click();
    await expect(page.getByRole("button", { name: "Start guided lab", exact: false })).toBeVisible();
  });

  test("bounded local import happens exactly once with import provenance", async ({ page }) => {
    const email = uniqueEmail("import");
    await createVerifiedUser(email, examplePassword);

    await openSeeded(page, { [PROGRESS_KEY]: v1ProgressSeed, [HISTORY_KEY]: [verifiedSeedAttempt] });
    await openMyProgress(page);
    await logInWithEmail(page, email, examplePassword);
    await expectSynced(page);

    await expect(page.getByText("Import the progress already on this device", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Import local progress" }).click();
    await expect(page.getByText("Local progress imported", { exact: false })).toBeVisible({ timeout: 15_000 });

    // A fresh browser context state with no local data restores cloud data
    // and never offers the one-time import again.
    await page.getByRole("button", { name: "Sign out" }).click();
    await openSeeded(page);
    await openMyProgress(page);
    await logInWithEmail(page, email, examplePassword);
    await expectSynced(page);
    await expect(page.getByRole("region", { name: "Roadmap evidence" })).toContainText("2/ 9 lessons verified");
    await expect(page.getByText("Import the progress already on this device", { exact: false })).toHaveCount(0);
  });

  test("a signed session restores after refresh without re-authentication", async ({ page }) => {
    const email = uniqueEmail("restore");
    await createVerifiedUser(email, examplePassword);

    await openSeeded(page);
    await openMyProgress(page);
    await logInWithEmail(page, email, examplePassword);
    await expectSynced(page);

    await page.reload();
    await openMyProgress(page);
    await expectSynced(page);
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  });

  test("sign-out returns to guest device data without deleting cloud data", async ({ page }) => {
    const email = uniqueEmail("signout");
    await createVerifiedUser(email, examplePassword);

    await openSeeded(page, { [PROGRESS_KEY]: v1ProgressSeed, [HISTORY_KEY]: [verifiedSeedAttempt] });
    await openMyProgress(page);
    await logInWithEmail(page, email, examplePassword);
    await expectSynced(page);
    await page.getByRole("button", { name: "Import local progress" }).click();
    await expect(page.getByText("Local progress imported", { exact: false })).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByText("On this device", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Signed out", { exact: false })).toBeVisible();

    // Cloud data still exists: signing back in restores it.
    await logInWithEmail(page, email, examplePassword);
    await expectSynced(page);
    await expect(page.getByRole("region", { name: "Roadmap evidence" })).toContainText("2/ 9 lessons verified");
  });

  test("cloud data deletion reports real failure, then real success, then account deletion", async ({ page }) => {
    const email = uniqueEmail("delete");
    await createVerifiedUser(email, examplePassword);

    await openSeeded(page);
    await openMyProgress(page);
    await logInWithEmail(page, email, examplePassword);
    await expectSynced(page);

    // Failure first: the DELETE is forced to fail and must not claim success.
    await page.route("**/api/progress", (route) => {
      if (route.request().method() === "DELETE") return route.abort();
      return route.continue();
    });
    await page.getByRole("button", { name: "Delete cloud data" }).click();
    await page.getByRole("button", { name: "Yes, delete cloud data" }).click();
    await expect(syncAlert(page)).toContainText("could not be deleted");
    await expect(page.getByText("Cloud progress deleted", { exact: false })).toHaveCount(0);
    await page.unroute("**/api/progress");

    await page.getByRole("button", { name: "Delete cloud data" }).click();
    await page.getByRole("button", { name: "Yes, delete cloud data" }).click();
    await expect(page.getByText("Cloud progress deleted. Progress on this device is untouched.")).toBeVisible({
      timeout: 15_000,
    });

    // Account deletion is offered only after data deletion and succeeds with
    // the recent interactive sign-in.
    await page.getByRole("button", { name: "Delete account" }).click();
    await expect(page.getByText("Account deleted", { exact: false })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("On this device", { exact: true }).first()).toBeVisible();
  });

  test("quota- and timeout-shaped cloud failures degrade to visible local safety", async ({ page }) => {
    const email = uniqueEmail("degraded");
    await createVerifiedUser(email, examplePassword);

    await openSeeded(page, { [PROGRESS_KEY]: v1ProgressSeed });
    await openMyProgress(page);

    await page.route("**/api/progress", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 429,
          contentType: "application/json",
          body: JSON.stringify({ error: "Too many progress requests.", code: "RATE_LIMITED", retryable: true }),
        });
      }
      return route.continue();
    });
    await logInWithEmail(page, email, examplePassword);
    await expect(page.getByText("Saved on this device—cloud unavailable").first()).toBeVisible({
      timeout: 15_000,
    });
    // Local progress remains visible and the roadmap stays usable.
    await expect(page.getByRole("region", { name: "Roadmap evidence" })).toContainText("2/ 9 lessons verified");
    await page.unroute("**/api/progress");

    await page.getByRole("button", { name: "Retry sync" }).click();
    await expectSynced(page);
  });

  test("a verified report survives cloud persistence failure as local evidence", async ({ page }) => {
    const email = uniqueEmail("persistfail");
    await createVerifiedUser(email, examplePassword);

    await openSeeded(page);
    await openMyProgress(page);
    await logInWithEmail(page, email, examplePassword);
    await expectSynced(page);

    // The deterministic assessment succeeds while cloud persistence reports
    // unavailability (quota/timeout shape at the persistence hook).
    await page.route("**/api/challenges/assess", async (route) => {
      const response = await route.fetch();
      const body = (await response.json()) as Record<string, unknown>;
      body.cloudSync = "cloud_unavailable";
      await route.fulfill({ response, body: JSON.stringify(body) });
    });

    await page.getByRole("button", { name: "Guided roadmap", exact: true }).click();
    await completeVerifiedGuidedLab(page);
    await page.unroute("**/api/challenges/assess");

    await page.getByRole("button", { name: "Continue guided roadmap" }).click();
    await openMyProgress(page);
    await expect(page.getByText("Saved on this device—cloud unavailable").first()).toBeVisible();
    await expect(page.getByRole("region", { name: "Roadmap evidence" })).toContainText("1/ 9 lessons verified");
    await expect(page.getByRole("region", { name: "Recent attempts" })).toContainText("Verified");
  });

  test("no password, token, or identity object enters persisted application state", async ({ page }) => {
    const email = uniqueEmail("leakcheck");
    await createVerifiedUser(email, examplePassword);

    await openSeeded(page, { [PROGRESS_KEY]: v1ProgressSeed, [HISTORY_KEY]: [verifiedSeedAttempt] });
    await openMyProgress(page);
    await logInWithEmail(page, email, examplePassword);
    await expectSynced(page);
    await page.getByRole("button", { name: "Import local progress" }).click();
    await expect(page.getByText("Local progress imported", { exact: false })).toBeVisible({ timeout: 15_000 });

    const storage = await page.evaluate(() => {
      const entries: Record<string, string> = {};
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index) as string;
        if (key.startsWith("faultsmith:")) entries[key] = window.localStorage.getItem(key) ?? "";
      }
      return entries;
    });
    const serialized = JSON.stringify(storage);
    expect(serialized).not.toContain(email);
    expect(serialized).not.toContain(examplePassword);
    expect(serialized).not.toContain("eyJ");
    expect(serialized).not.toMatch(/uid|idToken|accessToken|refreshToken|providerId|firebaseapp/i);
    expect(storage[OPT_IN_KEY]).toBe("true");
  });

  test("the account surface is accessible, password-manager friendly, and overflow-free", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openSeeded(page, { [PROGRESS_KEY]: v1ProgressSeed, [HISTORY_KEY]: [verifiedSeedAttempt] });
    await openMyProgress(page);

    // Signed-out surface with the create form expanded.
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    await expect(page.getByLabel("Confirm password", { exact: true })).toBeVisible();

    // Password-manager semantics.
    await expect(page.getByLabel("Email")).toHaveAttribute("autocomplete", "email");
    await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("autocomplete", "new-password");
    await expect(page.getByLabel("Confirm password", { exact: true })).toHaveAttribute("autocomplete", "new-password");
    const showToggle = page.getByRole("button", { name: "Show password", exact: true });
    await expect(showToggle).toHaveAttribute("aria-pressed", "false");
    await showToggle.click();
    await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");

    // Login mode uses current-password.
    await page.getByRole("button", { name: "Back" }).click();
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
      "autocomplete",
      "current-password",
    );

    // Focus order reaches the form controls in sequence.
    await page.getByLabel("Email").focus();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Password", { exact: true })).toBeFocused();

    const axeResults = await new AxeBuilder({ page }).analyze();
    expect(axeResults.violations).toEqual([]);

    const wideLayout = await page.evaluate(() => ({
      viewport: window.innerWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(wideLayout.content).toBeLessThanOrEqual(wideLayout.viewport);

    await page.setViewportSize({ width: 390, height: 844 });
    const narrowLayout = await page.evaluate(() => ({
      viewport: window.innerWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(narrowLayout.content).toBeLessThanOrEqual(narrowLayout.viewport);
    await expect(page.getByRole("button", { name: "Log in", exact: true })).toBeVisible();
  });
});
