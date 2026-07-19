import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  normalizeBaseUrl,
  runChallengeLifecycle,
  SmokeFailure,
  writeEvidence,
} from "./release-smoke-core.mjs";

const DEFAULT_BASE_URL = "http://127.0.0.1:3000";
const DEFAULT_SURFACE_TIMEOUT_MS = 10_000;
const DEFAULT_LIFECYCLE_TIMEOUT_MS = 35_000;
const MAX_ROOT_BYTES = 512_000;
const MAX_SOCIAL_IMAGE_BYTES = 1_500_000;

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
      headers: {
        Accept:
          path === "/" || path === "/learn"
            ? "text/html"
            : path.includes("image")
              ? "image/png,image/*"
              : "application/json",
      },
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

async function readBoundedImage(response, stage) {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_SOCIAL_IMAGE_BYTES) {
    fail("PRODUCTION_IMAGE", stage);
  }
  if (!response.body) fail("PRODUCTION_IMAGE", stage);
  const reader = response.body.getReader();
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_SOCIAL_IMAGE_BYTES) {
        await reader.cancel();
        fail("PRODUCTION_IMAGE", stage);
      }
    }
  } catch (error) {
    if (error instanceof SmokeFailure) throw error;
    fail("PRODUCTION_IMAGE", stage);
  }
  if (total < 1_000) fail("PRODUCTION_IMAGE", stage);
  return total;
}

async function readBoundedText(response, stage, maxBytes = MAX_ROOT_BYTES) {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) fail("PRODUCTION_SHELL", stage);
  if (!response.body) fail("PRODUCTION_SHELL", stage);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        fail("PRODUCTION_SHELL", stage);
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text;
  } catch (error) {
    if (error instanceof SmokeFailure) throw error;
    fail("PRODUCTION_SHELL", stage);
  }
}

function cspDirective(policy, name) {
  const prefix = `${name.toLowerCase()} `;
  return policy
    .split(";")
    .map((part) => part.trim().toLowerCase())
    .find((part) => part.startsWith(prefix));
}

function assertSecurityHeaders(response, origin, stage) {
  const csp = requireHeader(
    response,
    "content-security-policy",
    /default-src\s+'self'/i,
    stage,
  );
  for (const directive of [
    /object-src\s+'none'/i,
    /base-uri\s+'self'/i,
    /form-action\s+'self'/i,
    /frame-ancestors\s+'none'/i,
  ]) {
    if (!directive.test(csp)) fail("PRODUCTION_CSP", `${stage}:content-security-policy`);
  }
  for (const directiveName of ["script-src", "connect-src"]) {
    const directive = cspDirective(csp, directiveName);
    if (!directive || !directive.includes("'self'") || /(?:^|\s)\*(?:\s|$)/.test(directive)) {
      fail("PRODUCTION_CSP", `${stage}:${directiveName}`);
    }
  }
  if (cspDirective(csp, "script-src")?.includes("'unsafe-eval'")) {
    fail("PRODUCTION_CSP", `${stage}:script-src`);
  }
  requireHeader(
    response,
    "cross-origin-opener-policy",
    /^same-origin(?:-allow-popups)?$/i,
    stage,
  );
  requireHeader(response, "cross-origin-resource-policy", "same-origin", stage);
  const permissions = requireHeader(response, "permissions-policy", /camera=\(\)/i, stage);
  for (const policy of [/microphone=\(\)/i, /geolocation=\(\)/i]) {
    if (!policy.test(permissions)) fail("PRODUCTION_HEADER", `${stage}:permissions-policy`);
  }
  requireHeader(response, "referrer-policy", "no-referrer", stage);
  requireHeader(response, "x-content-type-options", "nosniff", stage);
  requireHeader(response, "x-frame-options", "DENY", stage);
  if (origin.startsWith("https://")) {
    requireHeader(
      response,
      "strict-transport-security",
      /(?:^|;)\s*max-age=63072000(?:;|$)/i,
      stage,
    );
  }
  if (response.headers.has("x-powered-by")) {
    fail("PRODUCTION_DISCLOSURE", `${stage}:x-powered-by`);
  }
}

function findHtmlAttribute(html, tagName, identityAttribute, identityValue, valueAttribute) {
  const tags = html.match(new RegExp(`<${tagName}\\b[^>]*>`, "gi")) ?? [];
  for (const tag of tags) {
    const attributes = new Map();
    for (const match of tag.matchAll(/([a-z_:][-a-z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
      attributes.set(match[1].toLowerCase(), (match[2] ?? match[3] ?? "").replaceAll("&amp;", "&"));
    }
    if (attributes.get(identityAttribute)?.toLowerCase() === identityValue.toLowerCase()) {
      return attributes.get(valueAttribute);
    }
  }
  return undefined;
}

function readableHtmlText(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replaceAll("&#x27;", "'")
    .replaceAll("&#39;", "'")
    .replace(/\s+/g, " ");
}

function requireMetadataUrl(
  html,
  { tagName, identityAttribute, identityValue, valueAttribute, expectedOrigin, expectedPath, stage },
) {
  const value = findHtmlAttribute(
    html,
    tagName,
    identityAttribute,
    identityValue,
    valueAttribute,
  );
  let url;
  try {
    url = new URL(value);
  } catch {
    fail("PRODUCTION_METADATA", `${stage}:${identityValue}`);
  }
  if (
    url.origin !== expectedOrigin ||
    url.pathname !== expectedPath ||
    url.username ||
    url.password ||
    url.hash ||
    (!identityValue.includes("image") && url.search)
  ) {
    fail("PRODUCTION_METADATA", `${stage}:${identityValue}`);
  }
}

function assertRouteMetadata(html, origin, pathname, stage) {
  requireMetadataUrl(html, {
    tagName: "link",
    identityAttribute: "rel",
    identityValue: "canonical",
    valueAttribute: "href",
    expectedOrigin: origin,
    expectedPath: pathname,
    stage,
  });
  requireMetadataUrl(html, {
    tagName: "meta",
    identityAttribute: "property",
    identityValue: "og:url",
    valueAttribute: "content",
    expectedOrigin: origin,
    expectedPath: pathname,
    stage,
  });
  for (const [identityAttribute, identityValue, expectedPath] of [
    ["property", "og:image", "/opengraph-image"],
    ["name", "twitter:image", "/twitter-image"],
  ]) {
    requireMetadataUrl(html, {
      tagName: "meta",
      identityAttribute,
      identityValue,
      valueAttribute: "content",
      expectedOrigin: origin,
      expectedPath,
      stage,
    });
  }
}

export async function assertProductionSurface({
  baseUrl,
  expectedMode = "fallback",
  repositorySha,
  fetchImpl = globalThis.fetch,
  lifecycle = runChallengeLifecycle,
  surfaceTimeoutMs = DEFAULT_SURFACE_TIMEOUT_MS,
  lifecycleTimeoutMs = DEFAULT_LIFECYCLE_TIMEOUT_MS,
} = {}) {
  const origin = normalizeBaseUrl(baseUrl);
  const root = await surfaceRequest(origin, "/", "root", fetchImpl, surfaceTimeoutMs);
  requireHeader(root, "content-type", /^text\/html(?:;|$)/i, "root");
  const rootHtml = await readBoundedText(root, "root");
  if (
    !/<title[^>]*>\s*FaultSmith\b/i.test(rootHtml) ||
    !/AI can write the patch/i.test(rootHtml)
  ) {
    fail("PRODUCTION_SHELL", "root");
  }
  assertRouteMetadata(rootHtml, origin, "/", "root");
  assertSecurityHeaders(root, origin, "root");

  const learn = await surfaceRequest(origin, "/learn", "learn", fetchImpl, surfaceTimeoutMs);
  requireHeader(learn, "content-type", /^text\/html(?:;|$)/i, "learn");
  const learnHtml = await readBoundedText(learn, "learn");
  if (
    !/<title[^>]*>\s*Learning Lab\s+[^<]*FaultSmith/i.test(learnHtml) ||
    !/Learn to debug code you didn't write/i.test(readableHtmlText(learnHtml))
  ) {
    fail("PRODUCTION_SHELL", "learn");
  }
  assertRouteMetadata(learnHtml, origin, "/learn", "learn");
  assertSecurityHeaders(learn, origin, "learn");

  for (const [path, stage] of [
    ["/opengraph-image", "opengraph-image"],
    ["/twitter-image", "twitter-image"],
  ]) {
    const image = await surfaceRequest(origin, path, stage, fetchImpl, surfaceTimeoutMs);
    requireHeader(image, "content-type", /^image\/png(?:;|$)/i, stage);
    await readBoundedImage(image, stage);
  }

  const health = await surfaceRequest(
    origin,
    "/api/health",
    "health",
    fetchImpl,
    surfaceTimeoutMs,
  );

  const cacheControl = requireHeader(health, "cache-control", /(?:^|,)\s*no-store\b/i, "health");
  if (/(?:^|,)\s*(?:public|s-maxage|max-age)\b/i.test(cacheControl)) {
    fail("PRODUCTION_CACHE", "health:cache-control");
  }

  const lifecycleEvidence = await lifecycle({
    baseUrl: origin,
    expectedMode,
    repositorySha,
    timeoutMs: lifecycleTimeoutMs,
    fetchImpl,
  });

  return {
    origin,
    mode: expectedMode,
    repositorySha: lifecycleEvidence.repositorySha,
    rootStatus: 200,
    learnStatus: 200,
    socialImages: "verified",
    healthStatus: 200,
    headerPolicy: "verified",
    apiCache: "no-store",
    lifecycleEvidence,
  };
}

function parseArguments(argv) {
  const options = {
    baseUrl: DEFAULT_BASE_URL,
    expectedMode: "fallback",
    evidence: null,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--live") options.expectedMode = "live";
    else if (argument === "--base-url" || argument === "--evidence") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) fail("CLI_ARGUMENT_VALUE", "cli");
      options[argument === "--base-url" ? "baseUrl" : "evidence"] = value;
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
  const cwd = dependencies.cwd ?? process.cwd();
  const publishEvidence = dependencies.writeEvidenceFn ?? writeEvidence;
  let options;
  try {
    options = parseArguments(argv);
  } catch (error) {
    stderr(safeFailure(error));
    return 1;
  }
  if (options.help) {
    stdout(
      "Usage: npm run smoke:production -- [--base-url URL] [--live] [--evidence test-results/file.json]",
    );
    stdout("Live provider use occurs only when --live is present.");
    return 0;
  }

  try {
    const result = await assertProductionSurface({
      baseUrl: options.baseUrl,
      expectedMode: options.expectedMode,
      repositorySha:
        dependencies.repositorySha ?? readRepositorySha(cwd),
      fetchImpl: dependencies.fetchImpl,
      lifecycle: dependencies.lifecycle,
      surfaceTimeoutMs: dependencies.surfaceTimeoutMs,
      lifecycleTimeoutMs: dependencies.lifecycleTimeoutMs,
    });
    if (options.evidence) {
      publishEvidence(result.lifecycleEvidence, {
        outputPath: resolve(cwd, options.evidence),
        allowedDirectory: resolve(cwd, "test-results"),
      });
    }
    stdout(
      `Production smoke passed: mode=${result.mode} root=${result.rootStatus} ` +
        `learn=${result.learnStatus} social=${result.socialImages} health=${result.healthStatus} ` +
        `headers=${result.headerPolicy} cache=${result.apiCache} ` +
        `sha=${result.repositorySha.slice(0, 12)} origin=${result.origin}`,
    );
    if (options.evidence) stdout("Sanitized lifecycle evidence written under test-results/.");
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
