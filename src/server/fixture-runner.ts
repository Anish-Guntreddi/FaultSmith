import "server-only";

import type { FileSnapshot, TestResult } from "@/lib/contracts";
import type { ChallengeFixture } from "./fixtures";

const MAX_OUTPUT_LENGTH = 8_000;

export function sanitizeTestOutput(output: string) {
  return output
    .replaceAll(/sk-[A-Za-z0-9_-]{12,}/g, "[REDACTED_API_KEY]")
    .replaceAll(/\/Users\/[^/\s]+/g, "/workspace")
    .replaceAll(/\x1B\[[0-?]*[ -/]*[@-~]/g, "")
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
