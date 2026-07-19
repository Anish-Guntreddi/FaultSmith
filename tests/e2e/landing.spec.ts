import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("landing page tells the FaultSmith story and routes into the complete product", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      runtimeErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => runtimeErrors.push(error.message));

  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: "AI can write the patch. FaultSmith teaches you to prove it." }),
  ).toBeVisible();
  await expect(page.getByText("OpenAI Build Week · Education")).toBeVisible();
  await expect(page.getByRole("heading", { name: "The shortcut becomes the dependency." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "See the investigation, not just the answer." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ground beginners. Stretch advanced learners." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "The AI proposes. The evidence decides." })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /^http:\/\/localhost:3000\/?$/);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    "FaultSmith — Learn to prove the fix",
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", /^http:\/\/localhost:3000\/?$/);
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
    "content",
    "FaultSmith — Learn to prove the fix",
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    /^http:\/\/localhost:3000\/opengraph-image(?:\?.*)?$/,
  );
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
    "content",
    /^http:\/\/localhost:3000\/twitter-image(?:\?.*)?$/,
  );

  const productLinks = page.getByRole("link", { name: /Open FaultSmith|Start a guided lab|Explore the learning system|Open the debugging lab|Launch application/ });
  await expect(productLinks).toHaveCount(5);
  for (const link of await productLinks.all()) {
    await expect(link).toHaveAttribute("href", "/learn");
  }

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);

  await page.getByRole("link", { name: "Start a guided lab" }).click();
  await expect(page).toHaveURL(/\/learn$/);
  await expect(page.getByRole("heading", { name: "Learn to debug code you didn't write." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your debugging roadmap" })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "http://localhost:3000/learn");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", "Learning Lab — FaultSmith");
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    "http://localhost:3000/learn",
  );
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute("content", "Learning Lab — FaultSmith");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    /^http:\/\/localhost:3000\/opengraph-image(?:\?.*)?$/,
  );
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
    "content",
    /^http:\/\/localhost:3000\/twitter-image(?:\?.*)?$/,
  );

  await page.getByRole("link", { name: "Return to the FaultSmith landing page" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1, name: /FaultSmith teaches you to prove it/ })).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test("landing and product routes remain responsive while the health API stays available", async ({ page, request }) => {
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect(health.headers()["cache-control"]).toContain("no-store");
  await expect(health.json()).resolves.toMatchObject({
    status: "ok",
    liveOpenAIConfigured: false,
  });

  for (const imagePath of ["/opengraph-image", "/twitter-image"]) {
    const image = await request.get(imagePath);
    expect(image.status()).toBe(200);
    expect(image.headers()["content-type"]).toContain("image/png");
    expect((await image.body()).byteLength).toBeGreaterThan(1_000);
  }

  for (const path of ["/", "/learn"]) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    await expect(page.locator("body")).toBeVisible();
    const overflow = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth,
    }));
    expect(overflow.page).toBeLessThanOrEqual(overflow.viewport);
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Method" })).toHaveAttribute("href", "#method");
  await expect(page.getByRole("link", { name: "Learning system", exact: true })).toHaveAttribute("href", "#learning-system");
  await expect(page.getByRole("link", { name: "Evidence" })).toHaveAttribute("href", "#evidence");

  await page.setViewportSize({ width: 1280, height: 600 });
  await page.goto("/");
  const lowHeightStory = page.locator("[data-debugging-story]");
  await lowHeightStory.scrollIntoViewIfNeeded();
  await expect(lowHeightStory).toHaveAttribute("data-motion", "static");
  await expect(lowHeightStory.locator(".case-monitor-sticky")).toHaveCSS("position", "static");
  const lowHeightOverflow = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
  }));
  expect(lowHeightOverflow.page).toBeLessThanOrEqual(lowHeightOverflow.viewport);
});
