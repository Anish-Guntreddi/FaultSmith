import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function openClean(page: Page) {
  const token = `${Date.now()}-${Math.random()}`;
  await page.addInitScript((cleanToken) => {
    if (new URLSearchParams(window.location.search).get("e2e-clean") === cleanToken) {
      window.localStorage.clear();
    }
  }, token);
  await page.goto(`/learn?e2e-clean=${encodeURIComponent(token)}`);
  await expect(page.getByRole("heading", { name: "Learn to debug code you didn't write." })).toBeVisible();
  await page.evaluate(() => window.history.replaceState(null, "", "/learn"));
}

async function openPrimaryFixture(page: Page) {
  await openClean(page);
  await page.getByRole("button", { name: "Practice by skill", exact: true }).click();
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
  await expect(page.getByRole("button", { name: "Guided roadmap", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "Your debugging roadmap" })).toBeVisible();
  await page.getByRole("button", { name: "Practice by skill", exact: true }).click();
  await expect(page.locator("section[aria-labelledby='project-heading']").getByRole("heading", { level: 3 })).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Forge debugging lab" })).toBeDisabled();

  await page.getByRole("combobox", { name: "Target skill" }).selectOption({ label: "Boundary conditions" });
  await page.getByRole("button", { name: "Intermediate" }).click();
  const forgeAction = page.getByRole("button", { name: "Forge debugging lab" });
  await expect(forgeAction).not.toHaveClass(/forge-pulse/);
  await forgeAction.click();
  await expect(page.locator("section[aria-busy='true'] .forge-pulse")).toBeVisible();

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

  const savedImmediately = await page.evaluate(() => JSON.parse(window.localStorage.getItem("faultsmith:attempt:v2") ?? "{}"));
  expect(savedImmediately.files?.[0]?.content).toContain("expense.amount >= 500");
  expect(savedImmediately.explanation).toContain("Restoring >= includes the threshold");

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
  await expect(page.getByText("PASSED · 6 passed · 0 failed")).toBeVisible();
});

test("guided roadmap records only verified progress and restores the next lesson", async ({ page }) => {
  await openClean(page);
  await expect(page.getByText("0/9 verified")).toBeVisible();
  await expect(page.getByText("Prevalidated lab · no API credits required")).toBeVisible();
  await page.getByRole("button", { name: "Start guided lab", exact: false }).click();

  await expect(page.getByRole("heading", { level: 1, name: "The missing exact-threshold approval" })).toBeVisible();
  await expect(page.getByText("Prevalidated fixture · deterministic verifier")).toBeVisible();
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

  await expect(page.getByText("Guided roadmap updated")).toBeVisible();
  await expect(page.getByText(/1\/9 lessons verified/)).toBeVisible();
  await expect(page.getByText("Next: Lesson 2")).toBeVisible();
  const savedProgress = await page.evaluate(() => JSON.parse(window.localStorage.getItem("faultsmith:learning-progress:v1") ?? "{}"));
  expect(savedProgress).toEqual({
    version: 1,
    completions: [expect.objectContaining({
      stepId: "evidence-boundaries",
      hintsUsed: 0,
    })],
  });
  expect(JSON.stringify(savedProgress)).not.toContain("hypothesis");
  expect(JSON.stringify(savedProgress)).not.toContain("explanation");
  expect(JSON.stringify(savedProgress)).not.toContain("approvals.py");

  await page.reload();
  await expect(page.getByText("Guided roadmap updated")).toBeVisible();
  await page.getByRole("button", { name: "Continue guided roadmap" }).click();
  await expect(page.getByText("1/9 verified")).toBeVisible();
  await expect(page.getByRole("button", { name: /Lesson 1 Complete/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Lesson 2 Ready/ })).toBeVisible();
});

test("a failing guided patch is never verified or recorded as progress", async ({ page }) => {
  await openClean(page);
  await page.getByRole("button", { name: "Start guided lab", exact: false }).click();
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
  await expect(page.getByText("Lesson remains incomplete")).toBeVisible();
  const savedProgress = await page.evaluate(() => window.localStorage.getItem("faultsmith:learning-progress:v1"));
  expect(savedProgress).toBeNull();
});

test("network actions remain single-flight under same-tick duplicate activation", async ({ page }) => {
  const counts = {
    generate: 0,
    execute: 0,
    hint: 0,
    assess: 0,
  };
  page.on("request", (request) => {
    if (request.method() !== "POST") return;
    const action = new URL(request.url()).pathname.split("/").at(-1);
    if (action && action in counts) counts[action as keyof typeof counts] += 1;
  });

  await openClean(page);
  await page.getByRole("button", { name: "Practice by skill", exact: true }).click();
  await page.getByRole("combobox", { name: "Target skill" }).selectOption({ label: "Boundary conditions" });
  await page.getByRole("button", { name: "Intermediate" }).click();
  await page.getByRole("button", { name: "Prevalidated Reliable demo fixture" }).click();
  await page.getByRole("button", { name: "Forge debugging lab" }).evaluate((button) => {
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });
  await expect(page.getByRole("button", { name: "Run tests" })).toBeVisible();
  expect(counts.generate).toBe(1);

  await page.getByRole("textbox", { name: "Current hypothesis" }).fill(
    "The exact threshold is excluded because the boundary comparison is strict.",
  );
  await page.getByRole("button", { name: "Reveal hint 1" }).evaluate((button) => {
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });
  await expect(page.getByText("1/3 used")).toBeVisible();
  expect(counts.hint).toBe(1);

  const editor = page.getByRole("textbox", { name: "Python code editor" });
  await editor.fill((await editor.inputValue()).replace("expense.amount > 500", "expense.amount >= 500"));
  await page.getByRole("button", { name: "Run tests" }).evaluate((button) => {
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });
  await expect(page.getByText("passed · 6 passed · 0 failed · 47ms")).toBeVisible();
  expect(counts.execute).toBe(1);

  await page.getByRole("textbox", { name: "Root-cause explanation" }).fill(
    "The strict comparison excluded exactly $500. Restoring the inclusive boundary fixes that case without changing values below the threshold.",
  );
  await page.getByRole("button", { name: "Submit patch + reasoning" }).evaluate((button) => {
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });
  await expect(page.getByRole("heading", { name: "You proved the fix, not just the outcome." })).toBeVisible();
  expect(counts.assess).toBe(1);
});

test("selection and workspace are keyboard reachable and axe-clean", async ({ page }) => {
  await openClean(page);
  const selectionResults = await new AxeBuilder({ page }).analyze();
  expect(selectionResults.violations).toEqual([]);

  await page.getByRole("button", { name: "Guided roadmap", exact: true }).focus();
  await expect(page.getByRole("button", { name: "Guided roadmap", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Start guided lab", exact: false }).focus();
  await expect(page.getByRole("button", { name: "Start guided lab", exact: false })).toBeFocused();
  await page.getByRole("button", { name: "Practice by skill", exact: true }).click();
  await page.getByRole("button", { name: /Inventory Reservation/ }).focus();
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
    await page.getByRole("button", { name: "Practice by skill", exact: true }).click();
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
  await openClean(page);
  const roadmapLayout = await page.evaluate(() => ({
    viewport: window.innerWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(roadmapLayout.content).toBeLessThanOrEqual(roadmapLayout.viewport);
  await expect(page.getByRole("button", { name: "Start guided lab", exact: false })).toBeVisible();

  await openPrimaryFixture(page);
  const layout = await page.evaluate(() => ({
    viewport: window.innerWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(layout.content).toBeLessThanOrEqual(layout.viewport);
  await expect(page.getByRole("textbox", { name: "Python code editor" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit patch + reasoning" })).toBeVisible();
});

test("debugging case file enhances lazily and follows chapter scroll order", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openClean(page);

  const story = page.locator("[data-debugging-story]");
  await expect(story).toHaveAttribute("data-motion", "static");
  await expect(story.getByRole("heading", { level: 3 })).toHaveText([
    "Observe",
    "Hypothesize",
    "Repair",
    "Verify",
  ]);
  expect(await page.getByRole("button", { name: "Start guided lab", exact: false }).evaluate(
    (control, caseFile) => Boolean(control.compareDocumentPosition(caseFile as Node) & Node.DOCUMENT_POSITION_FOLLOWING),
    await story.elementHandle(),
  )).toBe(true);

  await story.scrollIntoViewIfNeeded();
  await expect(story).toHaveAttribute("data-motion", "enhanced");

  const verifyChapter = story.getByRole("heading", { name: "Verify", exact: true });
  await verifyChapter.evaluate((heading) => heading.closest("li")?.scrollIntoView({ block: "center" }));
  await expect(story).toHaveAttribute("data-active-stage", "3");

  const hypothesisChapter = story.getByRole("heading", { name: "Hypothesize", exact: true });
  await hypothesisChapter.evaluate((heading) => heading.closest("li")?.scrollIntoView({ block: "center" }));
  await expect(story).toHaveAttribute("data-active-stage", "1");

  const desktopLayout = await page.evaluate(() => ({
    viewport: window.innerWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(desktopLayout.content).toBeLessThanOrEqual(desktopLayout.viewport);
});

test("debugging case file stays static and readable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openClean(page);

  const story = page.locator("[data-debugging-story]");
  await story.scrollIntoViewIfNeeded();
  await expect(story).toHaveAttribute("data-motion", "static");
  await expect(story.getByRole("heading", { level: 3 })).toHaveCount(4);
  expect(await story.locator(".case-monitor-sticky").evaluate((element) => getComputedStyle(element).position)).toBe("static");

  const mobileLayout = await page.evaluate(() => ({
    viewport: window.innerWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(mobileLayout.content).toBeLessThanOrEqual(mobileLayout.viewport);
});

test("debugging case file honors reduced motion without hiding its story", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openClean(page);

  const story = page.locator("[data-debugging-story]");
  await story.scrollIntoViewIfNeeded();
  await expect(story).toHaveAttribute("data-motion", "static");
  await expect(story).toHaveAttribute("data-active-stage", "0");
  await expect(story.getByRole("heading", { name: "Observe", exact: true })).toBeVisible();
  await expect(story.getByRole("heading", { name: "Verify", exact: true })).toBeVisible();
});

test("debugging case file restores its static monitor after resizing to mobile", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openClean(page);

  const story = page.locator("[data-debugging-story]");
  await story.scrollIntoViewIfNeeded();
  await expect(story).toHaveAttribute("data-motion", "enhanced");
  await story.getByRole("heading", { name: "Verify", exact: true }).evaluate(
    (heading) => heading.closest("li")?.scrollIntoView({ block: "center" }),
  );
  await expect(story).toHaveAttribute("data-active-stage", "3");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(story).toHaveAttribute("data-motion", "static");
  await expect(story).toHaveAttribute("data-active-stage", "0");
  const observeVisual = story.locator("[data-case-visual-stage='0']");
  await expect(observeVisual).toBeVisible();
  await expect(observeVisual).toContainText("1 failure captured at the exact boundary");
  await expect.poll(() => observeVisual.evaluate((element) => ({
    computedOpacity: getComputedStyle(element).opacity,
    inlineOpacity: (element as HTMLElement).style.opacity,
    inlineTransform: (element as HTMLElement).style.transform,
  }))).toEqual({ computedOpacity: "1", inlineOpacity: "", inlineTransform: "" });
  await expect.poll(() => story.locator("[data-case-monitor]").evaluate(
    (element) => (element as HTMLElement).style.transform,
  )).toBe("");
});

test("debugging case file restores its static monitor when reduced motion turns on", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openClean(page);

  const story = page.locator("[data-debugging-story]");
  await story.scrollIntoViewIfNeeded();
  await expect(story).toHaveAttribute("data-motion", "enhanced");
  await story.getByRole("heading", { name: "Verify", exact: true }).evaluate(
    (heading) => heading.closest("li")?.scrollIntoView({ block: "center" }),
  );
  await expect(story).toHaveAttribute("data-active-stage", "3");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(story).toHaveAttribute("data-motion", "static");
  await expect(story).toHaveAttribute("data-active-stage", "0");
  const observeVisual = story.locator("[data-case-visual-stage='0']");
  await expect(observeVisual).toBeVisible();
  await expect.poll(() => observeVisual.evaluate((element) => ({
    computedOpacity: getComputedStyle(element).opacity,
    inlineOpacity: (element as HTMLElement).style.opacity,
    inlineTransform: (element as HTMLElement).style.transform,
  }))).toEqual({ computedOpacity: "1", inlineOpacity: "", inlineTransform: "" });
  await expect.poll(() => story.locator("[data-case-monitor]").evaluate(
    (element) => (element as HTMLElement).style.transform,
  )).toBe("");
});
