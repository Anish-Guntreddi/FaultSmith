import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
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

const ignoredFiles = new Set(["package-lock.json"]);
const maximumTextBytes = 1_000_000;

export const secretRules = [
  { id: "openai-key", pattern: /\bsk-[A-Za-z0-9_-]{12,}\b/g },
  { id: "github-token", pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g },
  { id: "aws-access-key", pattern: /\bAKIA[A-Z0-9]{16}\b/g },
  { id: "slack-token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  {
    id: "private-key",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  },
  {
    id: "openai-env-assignment",
    pattern: /\bOPENAI_API_KEY\s*=\s*["']?[^"'\s#]{8,}/g,
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
  pattern: /\bNEXT_PUBLIC_[A-Z0-9_]*(?:OPENAI|API_KEY|SECRET|TOKEN)[A-Z0-9_]*/g,
};

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

export function findRuleMatches(text, rules, path = "fixture.txt") {
  const findings = [];

  for (const rule of rules) {
    const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
    for (const match of text.matchAll(pattern)) {
      const value = match[0];
      if (isDeliberateFixture(path, rule.id, value)) continue;
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

export function inspectText(path, text) {
  const findings = findRuleMatches(text, secretRules, path);

  if (shouldInspectRuntimeEnvironment(path)) {
    findings.push(...findRuleMatches(text, [publicSecretRule], path));
  }

  if (shouldInspectHostExecution(path)) {
    findings.push(...findRuleMatches(text, hostExecutionRules, path));
  }

  return findings;
}

function workingTreeFiles(directory = repositoryRoot) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;

    const absolutePath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...workingTreeFiles(absolutePath));
      continue;
    }
    if (!entry.isFile()) continue;

    const path = normalizePath(relative(repositoryRoot, absolutePath));
    if (ignoredFiles.has(path) || statSync(absolutePath).size > maximumTextBytes) continue;
    files.push({ absolutePath, path });
  }
  return files;
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
    "AKIA[A-Z0-9]{16}",
    "xox[baprs]-[A-Za-z0-9-]{10,}",
    "-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----",
    "OPENAI_API_KEY[[:space:]]*=[[:space:]]*[\"']?[^\"'[:space:]#]{8,}",
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

export function scanWorkingTree() {
  const findings = [];
  let inspectedFiles = 0;

  for (const { absolutePath, path } of workingTreeFiles()) {
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
      if (ignoredFiles.has(path)) continue;
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
