import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  normalizeBaseUrl,
  runChallengeLifecycle,
  SmokeFailure,
} from "./release-smoke-core.mjs";

const DEFAULT_BASE_URL = "http://127.0.0.1:3000";
const DEFAULT_TIMEOUT_MS = 10_000;

function fail(ruleId, stage, status) {
  throw new SmokeFailure(ruleId, stage, Number.isInteger(status) ? { status } : {});
}

function requireHeader(response, name, expected, stage) {
  const value = response.headers.get(name);
  if (!value || (typeof expected === "string" && value.toLowerCase() !== expected.toLowerCase())) {
    fail("PRODUCTION_HEADER", `${stage}:${name}`);
  }
  if (expected instanceof RegExp && !expected.test(value)) {
    fail("PRODUCTION_HEADER", `${stage}:${name}`);
  }
  return value;
}

async function surfaceRequest(origin, path, stage, fetchImpl, timeoutMs) {
  let response;
  try {
    response = await fetchImpl(new URL(path, `${origin}/`), {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: path === "/" ? "text/html" : "application/json" },
    });
  } catch {
    fail("PRODUCTION_NETWORK", stage);
  }
  if (response.status !== 200) fail("PRODUCTION_STATUS", stage, response.status);
  if (response.redirected || response.url && new URL(response.url).origin !== origin) {
    fail("PRODUCTION_REDIRECT", stage);
  }
  return response;
}

export async function assertProductionSurface({
  baseUrl,
  expectedMode = "fallback",
  repositorySha,
  fetchImpl = globalThis.fetch,
  lifecycle = runChallengeLifecycle,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  const origin = normalizeBaseUrl(baseUrl);
  const root = await surfaceRequest(origin, "/", "root", fetchImpl, timeoutMs);
  const health = await surfaceRequest(origin, "/api/health", "health", fetchImpl, timeoutMs);

  const csp = requireHeader(root, "content-security-policy", /default-src\s+'self'/i, "root");
  for (const directive of [
    /object-src\s+'none'/i,
    /base-uri\s+'self'/i,
    /form-action\s+'self'/i,
    /frame-ancestors\s+'none'/i,
  ]) {
    if (!directive.test(csp)) fail("PRODUCTION_CSP", "root:content-security-policy");
  }
  requireHeader(root, "cross-origin-opener-policy", "same-origin", "root");
  requireHeader(root, "cross-origin-resource-policy", "same-origin", "root");
  const permissions = requireHeader(root, "permissions-policy", /camera=\(\)/i, "root");
  for (const policy of [/microphone=\(\)/i, /geolocation=\(\)/i]) {
    if (!policy.test(permissions)) fail("PRODUCTION_HEADER", "root:permissions-policy");
  }
  requireHeader(root, "referrer-policy", "no-referrer", "root");
  requireHeader(root, "x-content-type-options", "nosniff", "root");
  requireHeader(root, "x-frame-options", "DENY", "root");
  if (origin.startsWith("https://")) {
    requireHeader(root, "strict-transport-security", /max-age=\d+/i, "root");
  }
  if (root.headers.has("x-powered-by")) fail("PRODUCTION_DISCLOSURE", "root:x-powered-by");
  requireHeader(health, "cache-control", /(?:^|,)\s*(?:private,\s*)?no-store\b/i, "health");

  const lifecycleEvidence = await lifecycle({
    baseUrl: origin,
    expectedMode,
    repositorySha,
    timeoutMs,
    fetchImpl,
  });

  return {
    origin,
    mode: expectedMode,
    repositorySha: lifecycleEvidence.repositorySha,
    rootStatus: 200,
    healthStatus: 200,
    headerPolicy: "verified",
    apiCache: "no-store",
    lifecycleEvidence,
  };
}

function parseArguments(argv) {
  const options = { baseUrl: DEFAULT_BASE_URL, expectedMode: "fallback", help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--live") options.expectedMode = "live";
    else if (argument === "--base-url") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) fail("CLI_ARGUMENT_VALUE", "cli");
      options.baseUrl = value;
      index += 1;
    } else fail("CLI_ARGUMENT_UNKNOWN", "cli");
  }
  return options;
}

function readRepositorySha(cwd) {
  try {
    const value = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!/^[0-9a-f]{40}$/i.test(value)) fail("REPOSITORY_SHA", "evidence");
    return value.toLowerCase();
  } catch {
    fail("REPOSITORY_SHA", "evidence");
  }
}

function safeFailure(error) {
  return error instanceof SmokeFailure
    ? `[${error.ruleId}] ${error.stage}`
    : "[PRODUCTION_UNEXPECTED] production-smoke";
}

export async function runCli(argv, dependencies = {}) {
  const stdout = dependencies.stdout ?? ((line) => console.log(line));
  const stderr = dependencies.stderr ?? ((line) => console.error(line));
  let options;
  try {
    options = parseArguments(argv);
  } catch (error) {
    stderr(safeFailure(error));
    return 1;
  }
  if (options.help) {
    stdout("Usage: npm run smoke:production -- [--base-url URL] [--live]");
    stdout("Live provider use occurs only when --live is present.");
    return 0;
  }

  try {
    const result = await assertProductionSurface({
      baseUrl: options.baseUrl,
      expectedMode: options.expectedMode,
      repositorySha:
        dependencies.repositorySha ?? readRepositorySha(dependencies.cwd ?? process.cwd()),
      fetchImpl: dependencies.fetchImpl,
      lifecycle: dependencies.lifecycle,
      timeoutMs: dependencies.timeoutMs,
    });
    stdout(
      `Production smoke passed: mode=${result.mode} root=${result.rootStatus} ` +
        `health=${result.healthStatus} headers=${result.headerPolicy} cache=${result.apiCache} ` +
        `sha=${result.repositorySha.slice(0, 12)} origin=${result.origin}`,
    );
    return 0;
  } catch (error) {
    stderr(safeFailure(error));
    return 1;
  }
}

const modulePath = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === modulePath) {
  process.exitCode = await runCli(process.argv.slice(2));
}
