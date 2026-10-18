import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function openClean(page: Page) {
  const token = `${Date.now()}-${Math.random()}`;
  await page.addInitScript((cleanToken) => {
    if (new URLSearchParams(window.location.search).get("e2e-clean") === cleanToken) {
      window.localStorage.clear();
    }
  }, token);
  await page.goto(`/?e2e-clean=${encodeURIComponent(token)}`);
  await expect(page.getByRole("heading", { name: "Learn to debug code you didn't write." })).toBeVisible();
  await page.evaluate(() => window.history.replaceState(null, "", "/"));
}

async function openPrimaryFixture(page: Page) {
  await openClean(page);
  await page.getByRole("combobox", { name: "Target skill" }).selectOption({ label: "Boundary conditions" });
  await page.getByRole("button", { name: "Intermediate" }).click();
  await page.getByRole("button", { name: "Prevalidated Reliable demo fixture" }).click();
  await page.getByRole("button", { name: "Forge debugging lab" }).click();
  await expect(page.getByRole("button", { name: "Run tests" })).toBeVisible();
  await expect(page.getByText("Prevalidated fixture · deterministic verifier")).toBeVisible();
  await expect(page.getByText("Prevalidated verification evidence")).toBeVisible();
}

test("primary Expense Approval demo completes with persisted evidence", async ({ page }) => {
  await openClean(page);
  await expect(page.getByRole("heading", { level: 3 })).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Forge debugging lab" })).toBeDisabled();

  await page.getByRole("combobox", { name: "Target skill" }).selectOption({ label: "Boundary conditions" });
  await page.getByRole("button", { name: "Intermediate" }).click();
  await page.getByRole("button", { name: "Forge debugging lab" }).click();

  await expect(page.getByRole("button", { name: "Run tests" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Live GPT-5.6 generation is unavailable because the server has no API credential.");
  await expect(page.getByText("failed · 5 passed · 1 failed · 47ms")).toBeVisible();
  const savedBeforeHint = await page.evaluate(() => JSON.parse(window.localStorage.getItem("faultsmith:attempt:v2") ?? "{}"));
  expect(savedBeforeHint.challenge?.hints).toBeUndefined();
  expect(savedBeforeHint.revealedHints).toEqual([]);

  const hint = page.getByRole("button", { name: "Reveal hint 1" });
  await expect(hint).toBeDisabled();
  await page.getByRole("textbox", { name: "Current hypothesis" }).fill(
    "The exact $500 boundary is excluded by a strict greater-than comparison.",
  );
  await expect(hint).toBeEnabled();
  await hint.click();
  await expect(page.getByText("1/3 used")).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const saved = JSON.parse(window.localStorage.getItem("faultsmith:attempt:v2") ?? "{}");
    return saved.revealedHints?.length ?? 0;
  })).toBe(1);

  const editor = page.getByRole("textbox", { name: "Python code editor" });
  await editor.fill((await editor.inputValue()).replace("expense.amount > 500", "expense.amount >= 500"));
  await page.getByRole("textbox", { name: "Root-cause explanation" }).fill(
    "The mutation made an inclusive boundary strict, so exactly $500 skipped finance. Restoring >= includes the threshold without changing other routing.",
  );

  await page.reload();
  await expect(page.getByRole("textbox", { name: "Python code editor" })).toHaveValue(/expense\.amount >= 500/);
  await expect(page.getByText("1/3 used")).toBeVisible();

  await page.getByRole("button", { name: "Run tests" }).click();
  await expect(page.getByText("passed · 6 passed · 0 failed · 47ms")).toBeVisible();
  await page.getByRole("button", { name: "Submit patch + reasoning" }).click();

  await expect(page.getByRole("heading", { name: "You proved the fix, not just the outcome." })).toBeVisible();
  await expect(page.getByText("The missing exact-threshold approval", { exact: true })).toBeVisible();
  await expect(page.getByText("PASSED · 6 passed · 0 failed")).toBeVisible();
  await expect(page.getByText("Prevalidated fixture gate")).toBeVisible();
  await expect(page.getByText("no learner Python ran on the application host", { exact: false })).toBeVisible();
  await expect(page.getByText("Skill evidence — not a certification")).toBeVisible();
  await expect(page.getByText("Assessment: Deterministic fallback rubric")).toBeVisible();
  await expect(page.getByText("Hypothesis revisions: 1")).toBeVisible();
  await expect(page.getByText("Files changed: approvals.py")).toBeVisible();
  await expect(page.getByText(/Time: \d/)).toBeVisible();
  const anonymousEvents = await page.evaluate(() => JSON.parse(window.localStorage.getItem("faultsmith:events:v1") ?? "[]"));
  const eventNames = anonymousEvents.map((event: { name: string }) => event.name);
  expect(eventNames).toEqual(expect.arrayContaining([
    "project_selected",
    "generation_started",
    "generation_succeeded",
    "validation_succeeded",
    "hint_requested",
    "test_run_completed",
    "patch_submitted",
    "challenge_verified",
  ]));
  expect(JSON.stringify(anonymousEvents)).not.toContain("hypothesis");
  expect(JSON.stringify(anonymousEvents)).not.toContain("explanation");

  await page.reload();
  await expect(page.getByRole("heading", { name: "You proved the fix, not just the outcome." })).toBeVisible();
  await expect(page.getByText("The missing exact-threshold approval", { exact: true })).toBeVisible();
  await expect(page.getByText("PASSED · 6 passed · 0 failed")).toBeVisible();
  await expect(page.getByText("Hypothesis revisions: 1")).toBeVisible();
});

test("a failing patch is never marked verified", async ({ page }) => {
  await openPrimaryFixture(page);
  await page.getByRole("textbox", { name: "Current hypothesis" }).fill(
    "The threshold comparison appears to exclude the exact policy boundary.",
  );
  await page.getByRole("textbox", { name: "Root-cause explanation" }).fill(
    "I suspect the comparison is strict, but this intentionally submits without repairing it.",
  );
  await page.getByRole("button", { name: "Submit patch + reasoning" }).click();

  await expect(page.getByRole("heading", { name: "The evidence found more work to do." })).toBeVisible();
  await expect(page.getByText("Repair not verified")).toBeVisible();
  await expect(page.getByText("FAILED · 5 passed · 1 failed")).toBeVisible();
});

test("selection and workspace are keyboard reachable and axe-clean", async ({ page }) => {
  await openClean(page);
  const selectionResults = await new AxeBuilder({ page }).analyze();
  expect(selectionResults.violations).toEqual([]);

  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: /Inventory Reservation/ })).toBeFocused();

  await openPrimaryFixture(page);
  const workspaceResults = await new AxeBuilder({ page }).analyze();
  expect(workspaceResults.violations).toEqual([]);
});

test("Inventory and Notification each forge a functioning prevalidated workspace", async ({ page }) => {
  const secondaryProjects = [
    {
      card: /Inventory Reservation/,
      skill: "Idempotency",
      challenge: "The duplicate reservation decrement",
    },
    {
      card: /Notification Preferences/,
      skill: "Boolean logic",
      challenge: "The quiet-hours boundary",
    },
  ];

  for (const project of secondaryProjects) {
    await openClean(page);
    await page.getByRole("button", { name: project.card }).click();
    await page.getByRole("combobox", { name: "Target skill" }).selectOption({ label: project.skill });
    await page.getByRole("button", { name: "Beginner", exact: true }).click();
    await page.getByRole("button", { name: "Prevalidated Reliable demo fixture" }).click();
    await page.getByRole("button", { name: "Forge debugging lab" }).click();

    await expect(page.getByRole("heading", { level: 1, name: project.challenge })).toBeVisible();
    await expect(page.getByText("Prevalidated fixture · deterministic verifier")).toBeVisible();
    await expect(page.getByText(/failed · \d+ passed · 1 failed/)).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Python code editor" })).toBeEditable();
  }
});

test("narrow recording layout has no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPrimaryFixture(page);
  const layout = await page.evaluate(() => ({
    viewport: window.innerWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(layout.content).toBeLessThanOrEqual(layout.viewport);
  await expect(page.getByRole("textbox", { name: "Python code editor" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit patch + reasoning" })).toBeVisible();
});
