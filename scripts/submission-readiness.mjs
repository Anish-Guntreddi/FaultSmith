import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const UAT_SCHEMA_VERSION = 1;
export const REQUIRED_TESTER_IDS = Object.freeze([
  "T01",
  "T02",
  "T03",
  "T04",
  "T05",
]);

const forbiddenUatFields = /(?:code|source|hypothesis|explanation|email|name|prose|note|comment|quote|transcript|answer|repair|solution|output|hint)/i;
const placeholderPattern = /(?:\[\s*(?:ADD|PLACEHOLDER)\b|\b(?:TODO|TBD|REPLACE[_ -]?ME)\b|<\s*(?:add|insert|replace)\b|https?:\/\/(?:www\.)?example\.com)/i;
const submissionFieldPattern = (label) =>
  new RegExp(`^\\s*[-*]\\s+\\*\\*${label}:\\*\\*\\s*(.+?)\\s*$`, "im");

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finding(kind, ruleId, path) {
  return { kind, ruleId, path };
}

function inspectAllowedFields(value, allowed, path, errors) {
  if (!isRecord(value)) return;
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      errors.push(
        finding(
          "error",
          forbiddenUatFields.test(key) ? "UAT_PRIVATE_FIELD" : "UAT_FIELD_UNEXPECTED",
          `${path}.${key}`,
        ),
      );
    }
  }
}

function validateFindingCounts(value, path, errors) {
  if (!isRecord(value)) {
    errors.push(finding("error", "UAT_FINDING_COUNTS_INVALID", path));
    return null;
  }

  inspectAllowedFields(value, new Set(["observed", "resolved", "retested"]), path, errors);
  const counts = {};
  for (const field of ["observed", "resolved", "retested"]) {
    const count = value[field];
    if (!Number.isInteger(count) || count < 0 || count > 20) {
      errors.push(finding("error", "UAT_FINDING_COUNT_BOUNDS", `${path}.${field}`));
      continue;
    }
    counts[field] = count;
  }

  if (
    Number.isInteger(counts.observed) &&
    Number.isInteger(counts.resolved) &&
    counts.resolved > counts.observed
  ) {
    errors.push(finding("error", "UAT_FINDING_COUNT_ORDER", `${path}.resolved`));
  }
  if (
    Number.isInteger(counts.resolved) &&
    Number.isInteger(counts.retested) &&
    counts.retested > counts.resolved
  ) {
    errors.push(finding("error", "UAT_FINDING_COUNT_ORDER", `${path}.retested`));
  }

  return counts;
}

function validateTester(value, index, errors, pending) {
  const path = `uat.testers[${index}]`;
  if (!isRecord(value)) {
    errors.push(finding("error", "UAT_TESTER_INVALID", path));
    return null;
  }

  inspectAllowedFields(
    value,
    new Set([
      "testerId",
      "completed",
      "purposeUnderstood",
      "durationSeconds",
      "findings",
    ]),
    path,
    errors,
  );

  if (!REQUIRED_TESTER_IDS.includes(value.testerId)) {
    errors.push(finding("error", "UAT_TESTER_ID_INVALID", `${path}.testerId`));
  }
  if (typeof value.completed !== "boolean") {
    errors.push(finding("error", "UAT_COMPLETION_INVALID", `${path}.completed`));
  } else if (!value.completed) {
    pending.push(finding("pending", "UAT_TESTER_INCOMPLETE", `${path}.completed`));
  }
  if (value.purposeUnderstood !== null && typeof value.purposeUnderstood !== "boolean") {
    errors.push(finding("error", "UAT_PURPOSE_INVALID", `${path}.purposeUnderstood`));
  } else if (value.purposeUnderstood === null) {
    pending.push(finding("pending", "UAT_PURPOSE_PENDING", `${path}.purposeUnderstood`));
  }
  if (
    value.durationSeconds !== null &&
    (!Number.isInteger(value.durationSeconds) ||
      value.durationSeconds < 1 ||
      value.durationSeconds > 3_600)
  ) {
    errors.push(finding("error", "UAT_DURATION_BOUNDS", `${path}.durationSeconds`));
  } else if (value.durationSeconds === null) {
    pending.push(finding("pending", "UAT_DURATION_PENDING", `${path}.durationSeconds`));
  }

  if (!isRecord(value.findings)) {
    errors.push(finding("error", "UAT_FINDINGS_INVALID", `${path}.findings`));
    return value;
  }
  inspectAllowedFields(value.findings, new Set(["blocker", "high"]), `${path}.findings`, errors);
  const blocker = validateFindingCounts(
    value.findings.blocker,
    `${path}.findings.blocker`,
    errors,
  );
  const high = validateFindingCounts(value.findings.high, `${path}.findings.high`, errors);

  for (const [severity, counts] of [
    ["blocker", blocker],
    ["high", high],
  ]) {
    if (
      counts &&
      Number.isInteger(counts.observed) &&
      Number.isInteger(counts.resolved) &&
      Number.isInteger(counts.retested) &&
      (counts.resolved !== counts.observed || counts.retested !== counts.observed)
    ) {
      pending.push(
        finding(
          "pending",
          "UAT_FINDING_RETEST_PENDING",
          `${path}.findings.${severity}`,
        ),
      );
    }
  }

  return value;
}

export function validateUatResults(value) {
  const errors = [];
  const pending = [];

  if (!isRecord(value)) {
    return {
      errors: [finding("error", "UAT_DOCUMENT_INVALID", "uat")],
      pending,
      summary: {
        completedCount: 0,
        understoodCount: 0,
        fivePersonThreshold: false,
        purposeThreshold: false,
        retestThreshold: false,
        ready: false,
      },
    };
  }

  inspectAllowedFields(value, new Set(["schemaVersion", "studyStatus", "testers"]), "uat", errors);
  if (value.schemaVersion !== UAT_SCHEMA_VERSION) {
    errors.push(finding("error", "UAT_SCHEMA_VERSION", "uat.schemaVersion"));
  }
  if (!new Set(["pending", "complete"]).has(value.studyStatus)) {
    errors.push(finding("error", "UAT_STUDY_STATUS_INVALID", "uat.studyStatus"));
  } else if (value.studyStatus === "pending") {
    pending.push(finding("pending", "UAT_STUDY_PENDING", "uat.studyStatus"));
  }
  if (!Array.isArray(value.testers)) {
    errors.push(finding("error", "UAT_TESTERS_INVALID", "uat.testers"));
  } else if (value.testers.length !== REQUIRED_TESTER_IDS.length) {
    errors.push(finding("error", "UAT_TESTER_COUNT", "uat.testers"));
  }

  const testers = Array.isArray(value.testers)
    ? value.testers.map((tester, index) => validateTester(tester, index, errors, pending))
    : [];
  const testerIds = testers
    .filter(isRecord)
    .map((tester) => tester.testerId)
    .filter((testerId) => typeof testerId === "string");
  if (new Set(testerIds).size !== testerIds.length) {
    errors.push(finding("error", "UAT_TESTER_ID_DUPLICATE", "uat.testers"));
  }
  if (
    testers.length === REQUIRED_TESTER_IDS.length &&
    !REQUIRED_TESTER_IDS.every((testerId) => testerIds.includes(testerId))
  ) {
    errors.push(finding("error", "UAT_TESTER_ID_SET", "uat.testers"));
  }

  const completedCount = testers.filter(
    (tester) => isRecord(tester) && tester.completed === true,
  ).length;
  const understoodCount = testers.filter(
    (tester) => isRecord(tester) && tester.completed === true && tester.purposeUnderstood === true,
  ).length;
  const durationCount = testers.filter(
    (tester) =>
      isRecord(tester) &&
      Number.isInteger(tester.durationSeconds) &&
      tester.durationSeconds >= 1 &&
      tester.durationSeconds <= 3_600,
  ).length;
  const fivePersonThreshold =
    testers.length === REQUIRED_TESTER_IDS.length &&
    completedCount === REQUIRED_TESTER_IDS.length &&
    durationCount === REQUIRED_TESTER_IDS.length;
  const purposeThreshold = fivePersonThreshold && understoodCount >= 4;
  const retestThreshold =
    testers.length === REQUIRED_TESTER_IDS.length &&
    testers.every((tester) => {
      if (!isRecord(tester) || !isRecord(tester.findings)) return false;
      return [tester.findings.blocker, tester.findings.high].every(
        (counts) =>
          isRecord(counts) &&
          Number.isInteger(counts.observed) &&
          counts.resolved === counts.observed &&
          counts.retested === counts.observed,
      );
    });
  const statusThreshold = value.studyStatus === "complete";
  if (fivePersonThreshold && !purposeThreshold) {
    pending.push(finding("pending", "UAT_PURPOSE_THRESHOLD", "uat.testers"));
  }
  if (fivePersonThreshold && !retestThreshold) {
    pending.push(finding("pending", "UAT_RETEST_THRESHOLD", "uat.testers"));
  }
  if (statusThreshold && (!fivePersonThreshold || !purposeThreshold || !retestThreshold)) {
    errors.push(finding("error", "UAT_COMPLETE_CLAIM_INVALID", "uat.studyStatus"));
  }

  const ready =
    errors.length === 0 &&
    pending.length === 0 &&
    statusThreshold &&
    fivePersonThreshold &&
    purposeThreshold &&
    retestThreshold;

  return {
    errors,
    pending,
    summary: {
      completedCount,
      understoodCount,
      fivePersonThreshold,
      purposeThreshold,
      retestThreshold,
      ready,
    },
  };
}

function submissionField(text, label) {
  return text.match(submissionFieldPattern(label))?.[1] ?? "";
}

function hasPlaceholder(value) {
  return value.length === 0 || placeholderPattern.test(value);
}

function findHttpsUrls(value) {
  return value.match(/https:\/\/[^\s)\]}>]+/g) ?? [];
}

function inspectPlaceholders(text, path) {
  const results = [];
  text.split(/\r?\n/).forEach((line, index) => {
    if (placeholderPattern.test(line)) {
      results.push(finding("pending", "SUBMISSION_PLACEHOLDER", `${path}:${index + 1}`));
    }
  });
  return results;
}

export function evaluateSubmissionReadiness({
  submissionText,
  readmeText,
  demoText,
  uatResults,
  paths = {},
}) {
  const submissionPath = paths.submission ?? "docs/SUBMISSION.md";
  const readmePath = paths.readme ?? "README.md";
  const demoPath = paths.demo ?? "docs/DEMO_SCRIPT.md";
  const uatPath = paths.uat ?? "docs/uat-results.json";
  const errors = [];
  const pending = [
    ...inspectPlaceholders(submissionText, submissionPath),
    ...inspectPlaceholders(readmeText, readmePath),
    ...inspectPlaceholders(demoText, demoPath),
  ];

  const repository = submissionField(submissionText, "Public source repository");
  if (
    hasPlaceholder(repository) ||
    !findHttpsUrls(repository).some((url) => /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+/i.test(url))
  ) {
    pending.push(finding("pending", "SUBMISSION_REPOSITORY_REQUIRED", submissionPath));
  }

  const video = submissionField(submissionText, "Demo video");
  if (
    hasPlaceholder(video) ||
    !findHttpsUrls(video).some((url) =>
      /^https:\/\/(?:www\.)?(?:youtube\.com\/watch\?|youtu\.be\/)/i.test(url),
    )
  ) {
    pending.push(finding("pending", "SUBMISSION_VIDEO_REQUIRED", submissionPath));
  }

  const demo = submissionField(submissionText, "Public demo URL");
  if (
    hasPlaceholder(demo) ||
    !findHttpsUrls(demo).some(
      (url) =>
        !/^https:\/\/(?:localhost|127\.0\.0\.1|github\.com|(?:www\.)?youtu(?:be\.com|\.be))/i.test(
          url,
        ),
    )
  ) {
    pending.push(finding("pending", "SUBMISSION_DEMO_REQUIRED", submissionPath));
  }

  const feedback = submissionField(submissionText, "Primary Codex \/feedback Session ID");
  const feedbackValue = feedback.replace(/[`*_\[\]()]/g, "").trim();
  if (hasPlaceholder(feedback) || !/^[A-Za-z0-9][A-Za-z0-9_-]{7,127}$/.test(feedbackValue)) {
    pending.push(finding("pending", "SUBMISSION_FEEDBACK_REQUIRED", submissionPath));
  }

  const testerResult = submissionField(submissionText, "Five-tester result");
  if (hasPlaceholder(testerResult) || !/\b[45]\s*(?:\/|of)\s*5\b/i.test(testerResult)) {
    pending.push(finding("pending", "SUBMISSION_TESTER_RESULT_REQUIRED", submissionPath));
  }

  const combined = `${readmeText}\n${submissionText}`;
  const license = submissionField(submissionText, "License");
  if (hasPlaceholder(license) || !/\bMIT\b/i.test(license) || !/MIT License/i.test(readmeText)) {
    pending.push(finding("pending", "SUBMISSION_LICENSE_REQUIRED", submissionPath));
  }
  if (!/\bCodex\b/i.test(combined)) {
    pending.push(finding("pending", "SUBMISSION_CODEX_DISCLOSURE_REQUIRED", submissionPath));
  }
  if (!/\bGPT-?5\.6\b/i.test(combined)) {
    pending.push(finding("pending", "SUBMISSION_GPT_DISCLOSURE_REQUIRED", submissionPath));
  }
  if (!/under three minutes|(?:2|two) minutes/i.test(demoText)) {
    pending.push(finding("pending", "SUBMISSION_DEMO_DURATION_REQUIRED", demoPath));
  }

  const uat = validateUatResults(uatResults);
  errors.push(...uat.errors.map((item) => ({ ...item, path: `${uatPath}:${item.path}` })));
  pending.push(...uat.pending.map((item) => ({ ...item, path: `${uatPath}:${item.path}` })));
  if (!uat.summary.ready) {
    pending.push(finding("pending", "SUBMISSION_UAT_REQUIRED", uatPath));
  }

  return {
    errors,
    pending,
    summary: {
      ready: errors.length === 0 && pending.length === 0,
      uat: uat.summary,
    },
  };
}

function parseArguments(argv) {
  const options = {
    mode: "prepare",
    uat: "docs/uat-results.template.json",
    submission: "docs/SUBMISSION.md",
    readme: "README.md",
    demo: "docs/DEMO_SCRIPT.md",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--prepare") options.mode = "prepare";
    else if (argument === "--strict") options.mode = "strict";
    else if (["--uat", "--submission", "--readme", "--demo"].includes(argument)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`CLI_ARGUMENT_VALUE:${argument}`);
      options[argument.slice(2)] = value;
      index += 1;
    } else {
      throw new Error(`CLI_ARGUMENT_UNKNOWN:${argument}`);
    }
  }
  return options;
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    const error = new Error("UAT_JSON_INVALID");
    error.ruleId = "UAT_JSON_INVALID";
    throw error;
  }
}

export function runCli(argv, io = {}) {
  const cwd = io.cwd ?? process.cwd();
  const stdout = io.stdout ?? ((line) => console.log(line));
  const stderr = io.stderr ?? ((line) => console.error(line));
  let options;
  try {
    options = parseArguments(argv);
  } catch (error) {
    stderr(`[error:${String(error.message).split(":")[0]}] cli`);
    return 1;
  }

  const paths = Object.fromEntries(
    ["uat", "submission", "readme", "demo"].map((key) => [key, resolve(cwd, options[key])]),
  );
  let result;
  try {
    result = evaluateSubmissionReadiness({
      submissionText: readFileSync(paths.submission, "utf8"),
      readmeText: readFileSync(paths.readme, "utf8"),
      demoText: readFileSync(paths.demo, "utf8"),
      uatResults: readJson(paths.uat),
      paths: {
        uat: options.uat,
        submission: options.submission,
        readme: options.readme,
        demo: options.demo,
      },
    });
  } catch (error) {
    const ruleId = error?.ruleId === "UAT_JSON_INVALID" ? error.ruleId : "SUBMISSION_FILE_UNREADABLE";
    stderr(`[error:${ruleId}] readiness-input`);
    return 1;
  }

  for (const item of result.errors) stderr(`[error:${item.ruleId}] ${item.path}`);
  for (const item of result.pending) stdout(`[pending:${item.ruleId}] ${item.path}`);
  stdout(
    `Submission readiness (${options.mode}): ${result.summary.ready ? "ready" : "pending"}; ` +
      `${result.summary.uat.completedCount}/5 testers completed, ` +
      `${result.summary.uat.understoodCount}/5 understood purpose.`,
  );

  if (result.errors.length > 0) return 1;
  if (options.mode === "strict" && !result.summary.ready) return 1;
  return 0;
}

const modulePath = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === modulePath) {
  process.exitCode = runCli(process.argv.slice(2));
}
