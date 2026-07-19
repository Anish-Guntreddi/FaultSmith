import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  runChallengeLifecycle,
  SmokeFailure,
  writeEvidence,
} from "./release-smoke-core.mjs";

const DEFAULT_BASE_URL = "http://127.0.0.1:3000";

function cliFailure(ruleId) {
  const error = new Error(ruleId);
  error.ruleId = ruleId;
  return error;
}

export function parseArguments(argv) {
  const options = {
    baseUrl: DEFAULT_BASE_URL,
    expectedMode: "fallback",
    evidence: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else if (argument === "--live") {
      options.expectedMode = "live";
    } else if (argument === "--base-url" || argument === "--evidence") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw cliFailure("CLI_ARGUMENT_VALUE");
      options[argument === "--base-url" ? "baseUrl" : "evidence"] = value;
      index += 1;
    } else {
      throw cliFailure("CLI_ARGUMENT_UNKNOWN");
    }
  }

  return options;
}

function repositorySha(cwd) {
  try {
    const value = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!/^[0-9a-f]{40}$/i.test(value)) throw cliFailure("REPOSITORY_SHA");
    return value.toLowerCase();
  } catch {
    throw cliFailure("REPOSITORY_SHA");
  }
}

function safeFailure(error) {
  if (error instanceof SmokeFailure) return `[${error.ruleId}] ${error.stage}`;
  if (error && typeof error === "object" && typeof error.ruleId === "string") {
    return `[${error.ruleId}] smoke`;
  }
  return "[SMOKE_UNEXPECTED] smoke";
}

export async function runCli(argv, dependencies = {}) {
  const cwd = dependencies.cwd ?? process.cwd();
  const stdout = dependencies.stdout ?? ((line) => console.log(line));
  const stderr = dependencies.stderr ?? ((line) => console.error(line));
  const lifecycle = dependencies.runLifecycle ?? runChallengeLifecycle;
  const publishEvidence = dependencies.writeEvidenceFn ?? writeEvidence;

  let options;
  try {
    options = parseArguments(argv);
  } catch (error) {
    stderr(safeFailure(error));
    return 1;
  }

  if (options.help) {
    stdout("Usage: npm run smoke:fallback -- [--base-url URL] [--evidence test-results/file.json]");
    stdout("       npm run smoke:live -- [--base-url URL] [--evidence test-results/file.json]");
    stdout("Live provider use occurs only when --live is present.");
    return 0;
  }

  try {
    const sha = dependencies.repositorySha ?? repositorySha(cwd);
    const evidence = await lifecycle({
      baseUrl: options.baseUrl,
      expectedMode: options.expectedMode,
      repositorySha: sha,
    });
    if (options.evidence) {
      publishEvidence(evidence, {
        outputPath: resolve(cwd, options.evidence),
        allowedDirectory: resolve(cwd, "test-results"),
      });
    }
    stdout(
      `FaultSmith smoke passed: mode=${evidence.mode} stages=${Object.keys(evidence.stages).length} ` +
        `sha=${evidence.repositorySha.slice(0, 12)} origin=${evidence.origin}`,
    );
    if (options.evidence) stdout("Sanitized evidence written under test-results/.");
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
