import "server-only";

import type { FileSnapshot, TestResult } from "@/lib/contracts";
import type { ChallengeFixture } from "./fixtures";

const MAX_OUTPUT_LENGTH = 8_000;

const credentialPatterns = [
  /\bsk-[A-Za-z0-9_-]{12,}\b/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  /\bAIza[0-9A-Za-z_-]{35}\b/g,
  /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b/g,
  /\bnpm_[A-Za-z0-9]{20,}\b/g,
  /\bpypi-[A-Za-z0-9_-]{20,}\b/g,
  /\bglpat-[A-Za-z0-9_-]{20,}\b/g,
  /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/g,
];

const authorizationPatterns = [
  /\b(?:Authorization|Proxy-Authorization)\s*:\s*(?:Bearer|Basic)\s+[A-Za-z0-9._~+/-]{12,}={0,2}/gi,
  /\bhttps?:\/\/[^/\s:@]{1,128}:[^/\s@]{8,}@/gi,
  /(?:(?:"?\/\/[^"'\s]*:)?_auth(?:Token)?"?|(?:API_KEY|ACCESS_TOKEN|AUTH_TOKEN|CLIENT_SECRET|PASSWORD|NPM_TOKEN))\s*[:=]\s*["']?[^"'\\,\s]{8,}/gi,
];

function redactSensitiveOutput(output: string) {
  let sanitized = output
    .replace(
      /-----BEGIN [A-Z0-9 ]{0,40}PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]{0,40}PRIVATE KEY-----/g,
      "[REDACTED_PRIVATE_KEY]",
    )
    .replace(
      /-----(?:BEGIN|END) [A-Z0-9 ]{0,40}PRIVATE KEY-----/g,
      "[REDACTED_PRIVATE_KEY]",
    );

  for (const pattern of credentialPatterns) {
    sanitized = sanitized.replace(pattern, "[REDACTED_CREDENTIAL]");
  }
  for (const pattern of authorizationPatterns) {
    sanitized = sanitized.replace(pattern, "[REDACTED_AUTH]");
  }

  return sanitized;
}

export function sanitizeTestOutput(output: string) {
  return redactSensitiveOutput(output)
    .replace(/(?:\/Users|\/home)\/[^/\\\s]+/g, "/workspace")
    .replace(/\b[A-Za-z]:[\\/]+Users[\\/]+[^/\\\s]+/gi, "/workspace")
    .replace(/(^|[\s"'(])\/root(?=\/|\\|\s|["')]|$)/gm, "$1/workspace")
    .replace(
      /\b(?:resp|req|thread|run|asst|assistant|batch|vector_store|vs|container|cntr|chatcmpl|file)[_-][A-Za-z0-9_-]{8,}\b/g,
      "[REDACTED_PROVIDER_ID]",
    )
    .replace(
      /\b(?:request|response|container|sandbox|thread|run|file|assistant|vector(?:_store)?)[ _-]?id\s*[:=]\s*["']?[A-Za-z0-9_-]{8,}["']?/gi,
      "[REDACTED_PROVIDER_ID]",
    )
    .replace(
      /\b(?:container|sandbox)\s+(?:id\s*[:=]\s*)?[a-f0-9]{12,64}\b/gi,
      "[REDACTED_PROVIDER_ID]",
    )
    .replace(/\u001B\][^\u0007\u001B]*(?:\u0007|\u001B\\)/g, "")
    .replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, "")
    .slice(0, MAX_OUTPUT_LENGTH);
}

export function countChangedLines(before: string, after: string) {
  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");
  const length = Math.max(beforeLines.length, afterLines.length);
  let changed = 0;

  for (let index = 0; index < length; index += 1) {
    if (beforeLines[index] !== afterLines[index]) changed += 1;
  }

  return changed;
}

export function validateSubmittedFiles(fixture: ChallengeFixture, files: FileSnapshot[]) {
  const submittedPaths = new Set(files.map((file) => file.path));
  const duplicates = files.length !== submittedPaths.size;
  const unexpected = files.filter((file) => !fixture.allowedFiles.includes(file.path));
  const missing = fixture.allowedFiles.filter((path) => !submittedPaths.has(path));

  if (duplicates) return "Duplicate file paths are not allowed.";
  if (unexpected.length > 0) return "Only allowlisted source files may be submitted.";
  if (missing.length > 0) return "Every allowlisted source file must be submitted.";
  return null;
}

export function runFixtureTests(
  fixture: ChallengeFixture,
  files: FileSnapshot[],
  durationMs = 47,
): TestResult {
  const validationError = validateSubmittedFiles(fixture, files);
  if (validationError) {
    return {
      status: "error",
      passedCount: 0,
      failedCount: 0,
      durationMs,
      sanitizedOutput: validationError,
      matchedExpectedFailure: false,
      executionMode: "prevalidated_fixture",
    };
  }

  const sourcePath = fixture.allowedFiles[0];
  const source = files.find((file) => file.path === sourcePath)?.content ?? "";
  const mutatedSource = fixture.mutatedFiles.find((file) => file.path === sourcePath)?.content ?? "";
  const changedLines = countChangedLines(mutatedSource, source);
  const repairedSource = fixture.originalFiles.find((file) => file.path === sourcePath)?.content ?? "";
  const matchesPrevalidatedRepair = source === repairedSource;
  const suspiciouslyBroad =
    changedLines > fixture.maxChangedLines ||
    source.length > mutatedSource.length * 1.5 ||
    source.trim().length < mutatedSource.trim().length * 0.6;

  if (matchesPrevalidatedRepair && !suspiciouslyBroad) {
    return {
      status: "passed",
      passedCount: fixture.passedCount,
      failedCount: 0,
      durationMs,
      sanitizedOutput: sanitizeTestOutput(fixture.successOutput),
      matchedExpectedFailure: false,
      executionMode: "prevalidated_fixture",
    };
  }

  const output = suspiciouslyBroad
    ? `${fixture.failureOutput}\nPatch rejected: the change exceeds this lab's minimal repair boundary.`
    : fixture.failureOutput;

  return {
    status: "failed",
    passedCount: fixture.passedCount - 1,
    failedCount: 1,
    durationMs,
    sanitizedOutput: sanitizeTestOutput(output),
    matchedExpectedFailure: !suspiciouslyBroad,
    executionMode: "prevalidated_fixture",
  };
}
