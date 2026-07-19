import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const PROGRESS_KEY = "faultsmith:learning-progress:v1";
const HISTORY_KEY = "faultsmith:attempt-history:v1";

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
    { stepId: "evidence-validation", completedAt: 1_700_000_200_000, overallScore: 95, hintsUsed: 0, testRuns: 1, hypothesis: "private learner prose" },
    { stepId: "not-a-real-lesson", completedAt: 1_700_000_300_000, overallScore: 90, hintsUsed: 0, testRuns: 1 },
  ],
};

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

async function openMyProgress(page: Page) {
  await page.getByRole("button", { name: "My Progress", exact: true }).click();
  await expect(page.getByRole("heading", { name: "My Progress" })).toBeVisible();
  await expect(page.getByText("On this device", { exact: true })).toBeVisible();
}

async function completeVerifiedGuidedLab(page: Page) {
  await page.getByRole("button", { name: "Start guided lab", exact: false }).click();
  await expect(page.getByRole("heading", { level: 1, name: "The missing exact-threshold approval" })).toBeVisible();
  await page.getByRole("textbox", { name: "Current hypothesis" }).fill(
    "The exact threshold is excluded because the boundary comparison is strict.",
  );
  const editor = page.getByRole("textbox", { name: "Python code editor" });
  await editor.fill((await editor.inputValue()).replace("expense.amount > 500", "expense.amount >= 500"));
  await page.getByRole("textbox", { name: "Root-cause explanation" }).fill(
    "The strict comparison excluded exactly $500. Restoring the inclusive boundary fixes that case without changing values below the threshold.",
  );
  await page.getByRole("button", { name: "Run tests" }).click();
  await expect(page.getByText("passed · 6 passed · 0 failed · 47ms")).toBeVisible();
  await page.getByRole("button", { name: "Submit patch + reasoning" }).click();
  await expect(page.getByRole("heading", { name: "You proved the fix, not just the outcome." })).toBeVisible();
}

test("existing v1 progress migrates into My Progress and tampered records stay excluded", async ({ page }) => {
  await openSeeded(page, {
    [PROGRESS_KEY]: v1ProgressSeed,
    [HISTORY_KEY]: [
      { ...verifiedSeedAttempt, attemptId: "seed-attempt-0002", hypothesis: "prose smuggled into an attempt" },
      { ...verifiedSeedAttempt, attemptId: "seed-attempt-0003", lessonId: "made-up-lesson" },
      { ...verifiedSeedAttempt, attemptId: "seed-attempt-0004", rootCauseScore: 400 },
    ],
  });

  await expect(page.getByText("2/9 verified")).toBeVisible();
  await openMyProgress(page);

  const roadmap = page.getByRole("region", { name: "Roadmap evidence" });
  await expect(roadmap).toContainText("/ 9 lessons verified");
  await expect(roadmap).toContainText("Read the evidence");
  await expect(roadmap).toContainText("2/3");

  await expect(page.getByRole("region", { name: "Recent attempts" })).toContainText(
    "No attempts recorded on this device yet.",
  );
  await expect(page.getByText("private learner prose")).toHaveCount(0);
  await expect(page.getByText("prose smuggled into an attempt")).toHaveCount(0);

  await page.getByRole("button", { name: "Guided roadmap", exact: true }).click();
  await expect(page.getByRole("button", { name: /Lesson 1 Complete/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Lesson 2 Complete/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Lesson 3 Ready/ })).toBeVisible();
});

test("the dashboard changes only after a verified submission and survives refresh", async ({ page }) => {
  await openSeeded(page);
  await openMyProgress(page);

  const roadmap = page.getByRole("region", { name: "Roadmap evidence" });
  await expect(page.getByText("No local progress yet")).toBeVisible();
  await expect(roadmap).toContainText("0/ 9 lessons verified");
  await expect(page.getByRole("region", { name: "Recent attempts" })).toContainText(
    "No attempts recorded on this device yet.",
  );
  await expect(page.getByText("Practice evidence — not a certification", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: "Guided roadmap", exact: true }).click();
  await completeVerifiedGuidedLab(page);
  await page.getByRole("button", { name: "Continue guided roadmap" }).click();
  await openMyProgress(page);

  await expect(roadmap).toContainText("1/ 9 lessons verified");
  await expect(page.getByRole("region", { name: "Verified score dimensions" })).toContainText("Root-cause accuracy");
  const independent = page.getByRole("region", { name: "Independent solves" });
  await expect(independent).toContainText("100%");
  await expect(independent).toContainText("1 of 1 verified repair used no hints.");
  const recent = page.getByRole("region", { name: "Recent attempts" });
  await expect(recent).toContainText("Lesson 1: Find the failing boundary");
  await expect(recent).toContainText("Verified");
  await expect(page.getByRole("region", { name: "Recommended next step" })).toContainText("Start Lesson 2");
  await expect(page.getByRole("region", { name: "Test-run process evidence" })).toContainText(
    "Test counts never lower a score.",
  );

  const history = await page.evaluate(
    (key) => JSON.parse(window.localStorage.getItem(key) ?? "[]"),
    HISTORY_KEY,
  );
  expect(history).toHaveLength(1);
  expect(history[0]).toMatchObject({
    lessonId: "evidence-boundaries",
    projectId: "expense-approval",
    skill: "Boundary conditions",
    status: "verified",
    provenance: "server_verified",
    hintsUsed: 0,
    changedLines: 1,
  });
  expect(typeof history[0].attemptId).toBe("string");
  expect(typeof history[0].durationBucket).toBe("string");
  const serialized = JSON.stringify(history);
  for (const forbidden of ["hypothesis", "explanation", "approvals.py", "sanitizedOutput", "strengths", "evidenceSummary"]) {
    expect(serialized).not.toContain(forbidden);
  }

  await page.reload();
  await openMyProgress(page);
  await expect(page.getByRole("region", { name: "Roadmap evidence" })).toContainText("1/ 9 lessons verified");
  await expect(page.getByRole("region", { name: "Recent attempts" })).toContainText("Verified");
});

test("a failing submission records process evidence but never roadmap progress", async ({ page }) => {
  await openSeeded(page);
  await page.getByRole("button", { name: "Start guided lab", exact: false }).click();
  await page.getByRole("textbox", { name: "Current hypothesis" }).fill(
    "The threshold comparison appears to exclude the exact policy boundary.",
  );
  await page.getByRole("textbox", { name: "Root-cause explanation" }).fill(
    "I suspect the comparison is strict, but this intentionally submits without repairing it.",
  );
  await page.getByRole("button", { name: "Submit patch + reasoning" }).click();
  await expect(page.getByText("Repair not verified")).toBeVisible();

  await page.getByRole("button", { name: "Continue guided roadmap" }).click();
  await openMyProgress(page);

  await expect(page.getByRole("region", { name: "Roadmap evidence" })).toContainText("0/ 9 lessons verified");
  await expect(page.getByRole("region", { name: "Verified score dimensions" })).toContainText(
    "Verified score averages appear after your first verified repair.",
  );
  await expect(page.getByRole("region", { name: "Independent solves" })).toContainText(
    "Appears after your first verified repair.",
  );
  const recent = page.getByRole("region", { name: "Recent attempts" });
  await expect(recent).toContainText("Lesson 1: Find the failing boundary");
  await expect(recent).toContainText("Not verified");

  const stored = await page.evaluate((keys) => ({
    progress: window.localStorage.getItem(keys[0]),
    history: JSON.parse(window.localStorage.getItem(keys[1]) ?? "[]"),
  }), [PROGRESS_KEY, HISTORY_KEY]);
  expect(stored.progress).toBeNull();
  expect(stored.history).toHaveLength(1);
  expect(stored.history[0].status).toBe("not_verified");
});

test("My Progress is keyboard reachable, axe-clean, and keeps the lesson launch reachable", async ({ page }) => {
  await openSeeded(page);
  await openMyProgress(page);
  const zeroStateResults = await new AxeBuilder({ page }).analyze();
  expect(zeroStateResults.violations).toEqual([]);

  await openSeeded(page, { [PROGRESS_KEY]: v1ProgressSeed, [HISTORY_KEY]: [verifiedSeedAttempt] });
  await openMyProgress(page);
  const populatedResults = await new AxeBuilder({ page }).analyze();
  expect(populatedResults.violations).toEqual([]);

  const toggle = page.getByRole("button", { name: "My Progress", exact: true });
  await toggle.focus();
  await expect(toggle).toBeFocused();
  const startButton = page.getByRole("button", { name: /Start Lesson 3/ });
  await startButton.focus();
  await expect(startButton).toBeFocused();
  await startButton.click();
  await expect(page.getByRole("button", { name: "Run tests" })).toBeVisible();
  await expect(page.getByText("Prevalidated fixture · deterministic verifier")).toBeVisible();
});

test("dashboard layouts at 1440x900 and 390x844 have no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSeeded(page, { [PROGRESS_KEY]: v1ProgressSeed, [HISTORY_KEY]: [verifiedSeedAttempt] });
  await openMyProgress(page);

  const wideLayout = await page.evaluate(() => ({
    viewport: window.innerWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(wideLayout.content).toBeLessThanOrEqual(wideLayout.viewport);
  await expect(page.getByRole("region", { name: "Verified score dimensions" })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  const narrowLayout = await page.evaluate(() => ({
    viewport: window.innerWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(narrowLayout.content).toBeLessThanOrEqual(narrowLayout.viewport);
  await expect(page.getByRole("region", { name: "Recent attempts" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Start Lesson 3/ })).toBeVisible();
});
