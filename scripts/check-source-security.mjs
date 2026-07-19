import { execFileSync } from "node:child_process";
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

const ignoredDirectories = new Set([
  ".git",
  ".next",
  "coverage",
  "node_modules",
  "playwright-report",
  "test-results",
]);

export const secretRules = [
  { id: "openai-key", pattern: /\bsk-[A-Za-z0-9_-]{12,}\b/g },
  { id: "github-token", pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g },
  { id: "aws-access-key", pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g },
  { id: "slack-token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  { id: "google-api-key", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { id: "stripe-live-key", pattern: /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b/g },
  { id: "npm-token", pattern: /\bnpm_[A-Za-z0-9]{20,}\b/g },
  { id: "pypi-token", pattern: /\bpypi-[A-Za-z0-9_-]{20,}\b/g },
  { id: "gitlab-token", pattern: /\bglpat-[A-Za-z0-9_-]{20,}\b/g },
  {
    id: "sendgrid-key",
    pattern: /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/g,
  },
  {
    id: "private-key",
    pattern: /-----BEGIN [A-Z0-9 ]{0,40}PRIVATE KEY-----/g,
  },
  {
    id: "gcp-service-account-json",
    pattern: /"type"\s*:\s*"service_account"/g,
  },
  {
    id: "gcp-service-account-email",
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.iam\.gserviceaccount\.com\b/g,
  },
  {
    id: "gcp-private-key-id",
    pattern: /"private_key_id"\s*:\s*"[0-9a-fA-F]{8,}"/g,
  },
  {
    id: "jwt-bearer-token",
    pattern: /\beyJ[A-Za-z0-9_-]{14,}\.[A-Za-z0-9_-]{14,}\.[A-Za-z0-9_-]{10,}/g,
  },
  {
    id: "openai-env-assignment",
    pattern: /\bOPENAI_API_KEY\s*=\s*["']?[^"'\s#]{8,}/g,
  },
  {
    id: "secret-assignment",
    // `(?!string\b)` keeps TypeScript annotations like `password: string):`
    // from matching; a real secret value is never the bare type keyword.
    pattern:
      /\b(?:API_KEY|ACCESS_TOKEN|AUTH_TOKEN|CLIENT_SECRET|PASSWORD|NPM_TOKEN|SERVICE_ACCOUNT|PRIVATE_KEY)\s*[:=]\s*["']?(?!string\b)[^"'\\,\s#]{8,}/gi,
  },
  {
    id: "registry-auth",
    pattern:
      /(?:(?:"?\/\/[^"'\s]*:)?_auth(?:Token)?"?)\s*[:=]\s*["']?[^"'\\,\s]{8,}/gi,
  },
  {
    id: "authorization-header",
    pattern:
      /\b(?:Authorization|Proxy-Authorization)\s*:\s*(?:Bearer|Basic)\s+[A-Za-z0-9._~+/-]{12,}={0,2}/gi,
  },
  {
    id: "credential-url",
    pattern: /\bhttps?:\/\/[^/\s:@]{1,128}:[^/\s@]{8,}@/gi,
  },
];

export const hostExecutionRules = [
  { id: "node-child-process", pattern: /(?:node:)?child_process/g },
  { id: "exec-file", pattern: /\bexecFile(?:Sync)?\b/g },
  { id: "exec-sync", pattern: /\bexecSync\b/g },
  { id: "spawn", pattern: /\bspawn(?:Sync)?\b/g },
  { id: "exec", pattern: /\bexec\s*(?:\(|[,}])/g },
];

const publicSecretRule = {
  id: "public-secret-environment",
  pattern:
    /\bNEXT_PUBLIC_[A-Z0-9_]*(?:OPENAI|API_KEY|SECRET|TOKEN|SERVICE_ACCOUNT|PRIVATE_KEY|CREDENTIAL)[A-Z0-9_]*/g,
};

// Documented public Firebase web configuration names. Firebase's browser API
// key is public project metadata that Next.js inlines into the bundle by
// design; it is never authorization material. Only these exact names are
// treated as public — any variant (for example a service-account or
// private-key name publicized with NEXT_PUBLIC_) still fails the scan.
export const expectedPublicFirebaseConfigNames = new Set([
  "NEXT_PUBLIC_FIREBASE_API_KEY",
]);

export const passwordBoundaryRules = [
  {
    // Password fields must never cross into server, persistence, or
    // evidence code: Firebase owns password material and the only
    // legitimate handler is the browser auth adapter in src/client/.
    id: "password-boundary",
    pattern: /\bpassword\b\s*[:=]|["']password["']|\.password\b/gi,
  },
];

function normalizePath(path) {
  return path.split(sep).join("/");
}

function lineNumberAt(text, index) {
  let line = 1;
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (text.charCodeAt(cursor) === 10) line += 1;
  }
  return line;
}

function isDeliberateFixture(path, ruleId, value) {
  return (
    path === "src/server/fixtures.test.ts" &&
    ruleId === "openai-key" &&
    value === ["sk", "abcdefghijklmnop"].join("-")
  );
}

function isExpectedPublicConfigName(ruleId, value) {
  return ruleId === "public-secret-environment" && expectedPublicFirebaseConfigNames.has(value);
}

export function findRuleMatches(text, rules, path = "fixture.txt") {
  const findings = [];

  for (const rule of rules) {
    const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
    for (const match of text.matchAll(pattern)) {
      const value = match[0];
      if (isDeliberateFixture(path, rule.id, value)) continue;
      if (isExpectedPublicConfigName(rule.id, value)) continue;
      findings.push({
        path,
        line: lineNumberAt(text, match.index ?? 0),
        rule: rule.id,
      });
    }
  }

  return findings;
}

function isProbablyText(buffer) {
  return !buffer.subarray(0, Math.min(buffer.length, 8_192)).includes(0);
}

function shouldInspectRuntimeEnvironment(path) {
  return (
    path.startsWith("src/") ||
    path === ".env.example" ||
    path === "next.config.ts" ||
    path === "package.json"
  );
}

function shouldInspectHostExecution(path) {
  return (
    path.startsWith("src/") &&
    !path.endsWith(".test.ts") &&
    !path.endsWith(".test.tsx") &&
    !path.endsWith(".spec.ts") &&
    !path.endsWith(".spec.tsx")
  );
}

function shouldInspectPasswordBoundary(path) {
  return (
    (path.startsWith("src/server/") ||
      path.startsWith("src/lib/") ||
      path.startsWith("src/app/")) &&
    !path.endsWith(".test.ts") &&
    !path.endsWith(".test.tsx") &&
    !path.endsWith(".spec.ts") &&
    !path.endsWith(".spec.tsx")
  );
}

export function inspectText(path, text) {
  const findings = findRuleMatches(text, secretRules, path);

  if (shouldInspectRuntimeEnvironment(path)) {
    findings.push(...findRuleMatches(text, [publicSecretRule], path));
  }

  if (shouldInspectHostExecution(path)) {
    findings.push(...findRuleMatches(text, hostExecutionRules, path));
  }

  if (shouldInspectPasswordBoundary(path)) {
    findings.push(...findRuleMatches(text, passwordBoundaryRules, path));
  }

  return findings;
}

function workingTreeFiles(directory, scanRoot) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;

    const absolutePath = resolve(directory, entry.name);
    const path = normalizePath(relative(scanRoot, absolutePath));
    if (entry.isSymbolicLink()) {
      files.push({ absolutePath, path, symbolicLink: true });
      continue;
    }
    if (entry.isDirectory()) {
      files.push(...workingTreeFiles(absolutePath, scanRoot));
      continue;
    }
    if (!entry.isFile()) continue;

    files.push({ absolutePath, path, symbolicLink: false });
  }
  return files;
}

function trackedWorkingTreeFiles() {
  return git(["ls-files", "-z"])
    .split("\0")
    .filter(Boolean)
    .map((path) => {
      const absolutePath = resolve(repositoryRoot, path);
      const stats = lstatSync(absolutePath);
      return {
        absolutePath,
        path: normalizePath(path),
        symbolicLink: stats.isSymbolicLink(),
      };
    });
}

function git(args, options = {}) {
  return execFileSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
}

function candidateHistoryPaths(commit) {
  const expression = [
    "sk-[A-Za-z0-9_-]{12,}",
    "gh[pousr]_[A-Za-z0-9]{20,}",
    "(AKIA|ASIA)[A-Z0-9]{16}",
    "xox[baprs]-[A-Za-z0-9-]{10,}",
    "AIza[0-9A-Za-z_-]{35}",
    "(sk|rk)_live_[A-Za-z0-9]{16,}",
    "npm_[A-Za-z0-9]{20,}",
    "pypi-[A-Za-z0-9_-]{20,}",
    "glpat-[A-Za-z0-9_-]{20,}",
    "SG\\.[A-Za-z0-9_-]{16,}\\.[A-Za-z0-9_-]{16,}",
    "-----BEGIN [A-Z0-9 ]{0,40}PRIVATE KEY-----",
    "\"type\"[[:space:]]*:[[:space:]]*\"service_account\"",
    "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.iam\\.gserviceaccount\\.com",
    "\"private_key_id\"[[:space:]]*:[[:space:]]*\"[0-9a-fA-F]{8,}\"",
    "eyJ[A-Za-z0-9_-]{14,}\\.[A-Za-z0-9_-]{14,}\\.[A-Za-z0-9_-]{10,}",
    "OPENAI_API_KEY[[:space:]]*=[[:space:]]*[\"']?[^\"'[:space:]#]{8,}",
    "(API_KEY|ACCESS_TOKEN|AUTH_TOKEN|CLIENT_SECRET|PASSWORD|NPM_TOKEN|SERVICE_ACCOUNT|PRIVATE_KEY)[[:space:]]*[:=][[:space:]]*[\"']?[^\"'\\,[:space:]#]{8,}",
    "_auth(Token)?[\"']?[[:space:]]*[:=][[:space:]]*[\"']?[^\"'\\,[:space:]]{8,}",
    "(Authorization|Proxy-Authorization)[[:space:]]*:[[:space:]]*(Bearer|Basic)[[:space:]]+[A-Za-z0-9._~+/-]{12,}",
    "https?://[^/[:space:]:@]{1,128}:[^/[:space:]@]{8,}@",
  ].join("|");

  try {
    return git(["grep", "-I", "-l", "-E", expression, commit, "--", "."])
      .split("\n")
      .filter(Boolean)
      .map((entry) => entry.slice(entry.indexOf(":") + 1));
  } catch (error) {
    if (typeof error === "object" && error && "status" in error && error.status === 1) {
      return [];
    }
    throw error;
  }
}

export function scanWorkingTree(scanRoot = repositoryRoot) {
  const findings = [];
  let inspectedFiles = 0;
  const entries = workingTreeFiles(scanRoot, scanRoot);

  if (scanRoot === repositoryRoot) {
    const knownPaths = new Set(entries.map(({ path }) => path));
    for (const entry of trackedWorkingTreeFiles()) {
      if (!knownPaths.has(entry.path)) entries.push(entry);
    }
  }

  for (const { absolutePath, path, symbolicLink } of entries) {
    if (symbolicLink) {
      findings.push({ path, line: 1, rule: "symbolic-link" });
      continue;
    }
    const buffer = readFileSync(absolutePath);
    if (!isProbablyText(buffer)) continue;
    inspectedFiles += 1;
    findings.push(...inspectText(path, buffer.toString("utf8")));
  }

  return { findings, inspectedFiles };
}

export function scanReachableHistory() {
  const commits = git(["rev-list", "--all"]).split("\n").filter(Boolean);
  const findings = [];

  for (const commit of commits) {
    const shortCommit = commit.slice(0, 12);
    for (const path of candidateHistoryPaths(commit)) {
      const text = git(["show", `${commit}:${path}`]);
      for (const finding of findRuleMatches(text, secretRules, path)) {
        findings.push({ ...finding, commit: shortCommit });
      }
    }
  }

  return { findings, inspectedCommits: commits.length };
}

export function formatFinding(finding) {
  const location = finding.commit ? `history:${finding.commit}` : "working-tree";
  return `${location}:${finding.path}:${finding.line} [${finding.rule}]`;
}

function main() {
  const workingTree = scanWorkingTree();
  const history = scanReachableHistory();
  const findings = [...workingTree.findings, ...history.findings];

  if (findings.length > 0) {
    console.error("Source security scan failed. Matching values are intentionally not printed.");
    for (const finding of findings) console.error(`- ${formatFinding(finding)}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `Source security scan passed: ${workingTree.inspectedFiles} working-tree files and ${history.inspectedCommits} reachable commits inspected.`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
