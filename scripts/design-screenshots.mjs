#!/usr/bin/env node
/**
 * Design-pass screenshot tooling.
 *
 * Captures /styleguide, /, and /learn at 1440x900 and 390x844 into
 * test-results/design/ (already gitignored via /test-results). Reuses the
 * installed @playwright/test chromium — no new dependencies.
 *
 * Usage:
 *   node scripts/design-screenshots.mjs
 *     Reuses a dev server at DESIGN_BASE_URL (default http://127.0.0.1:3000)
 *     when one is running; otherwise starts `npm run dev` on that port and
 *     stops it afterwards.
 */
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const repositoryRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputDirectory = path.join(repositoryRoot, "test-results", "design");
const baseUrl = (process.env.DESIGN_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");

const routes = [
  { name: "styleguide", route: "/styleguide" },
  { name: "landing", route: "/" },
  { name: "learn", route: "/learn" },
];

const viewports = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "390x844", width: 390, height: 844 },
];

async function serverIsUp(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
    return response.status < 500;
  } catch {
    return false;
  }
}

async function ensureDevServer() {
  if (await serverIsUp(`${baseUrl}/api/health`)) {
    console.log(`Reusing running dev server at ${baseUrl}`);
    return null;
  }

  const { hostname, port } = new URL(baseUrl);
  console.log(`Starting dev server at ${baseUrl} ...`);
  const child = spawn(
    "npm",
    ["run", "dev", "--", "--hostname", hostname, "--port", port || "3000"],
    { cwd: repositoryRoot, stdio: "ignore", detached: false },
  );

  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (await serverIsUp(`${baseUrl}/api/health`)) return child;
    if (child.exitCode !== null) {
      throw new Error(`Dev server exited early with code ${child.exitCode}.`);
    }
    await delay(1_000);
  }
  child.kill("SIGTERM");
  throw new Error(`Dev server did not become ready at ${baseUrl} within 120s.`);
}

async function captureAll() {
  await mkdir(outputDirectory, { recursive: true });
  const devServer = await ensureDevServer();
  const browser = await chromium.launch();

  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
      });
      const page = await context.newPage();

      for (const target of routes) {
        const url = `${baseUrl}${target.route}`;
        await page.goto(url, { waitUntil: "networkidle" });
        // Let entrance motion and lazy content settle before capturing.
        await delay(600);
        const filePath = path.join(outputDirectory, `${target.name}-${viewport.name}.png`);
        await page.screenshot({ path: filePath, fullPage: true });
        console.log(`Captured ${url} @ ${viewport.name} -> ${path.relative(repositoryRoot, filePath)}`);
      }

      await context.close();
    }
  } finally {
    await browser.close();
    if (devServer) devServer.kill("SIGTERM");
  }
}

captureAll().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
