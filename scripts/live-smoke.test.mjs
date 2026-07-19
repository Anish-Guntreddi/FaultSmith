import { describe, expect, it, vi } from "vitest";

import { parseArguments, runCli } from "./live-smoke.mjs";
import { SmokeFailure } from "./release-smoke-core.mjs";

const sha = "a".repeat(40);

function safeEvidence(mode = "fallback") {
  return {
    mode,
    repositorySha: sha,
    origin: "http://127.0.0.1:3000",
    stages: {
      health: {},
      generate: {},
      hint: {},
      mutatedExecute: {},
      repairedExecute: {},
      repairedAssess: {},
      failingAssess: {},
    },
  };
}

function harness(overrides = {}) {
  const output = [];
  const errors = [];
  const runLifecycle = overrides.runLifecycle ?? vi.fn(async ({ expectedMode }) => safeEvidence(expectedMode));
  const writeEvidenceFn = overrides.writeEvidenceFn ?? vi.fn();
  return {
    output,
    errors,
    runLifecycle,
    writeEvidenceFn,
    dependencies: {
      cwd: "/workspace/faultsmith",
      repositorySha: sha,
      stdout: (line) => output.push(line),
      stderr: (line) => errors.push(line),
      runLifecycle,
      writeEvidenceFn,
    },
  };
}

describe("live smoke CLI", () => {
  it("defaults to the free fallback lifecycle", async () => {
    const test = harness();
    expect(await runCli([], test.dependencies)).toBe(0);
    expect(test.runLifecycle).toHaveBeenCalledWith({
      baseUrl: "http://127.0.0.1:3000",
      expectedMode: "fallback",
      repositorySha: sha,
    });
    expect(test.output.at(-1)).toContain("mode=fallback");
  });

  it("enters paid mode only with the explicit live flag", async () => {
    expect(parseArguments(["--live", "--base-url", "https://faultsmith.invalid"])).toMatchObject({
      expectedMode: "live",
      baseUrl: "https://faultsmith.invalid",
    });
    const test = harness();
    expect(await runCli(["--live"], test.dependencies)).toBe(0);
    expect(test.runLifecycle.mock.calls[0][0].expectedMode).toBe("live");
  });

  it("prints help without running a lifecycle", async () => {
    const test = harness();
    expect(await runCli(["--help"], test.dependencies)).toBe(0);
    expect(test.runLifecycle).not.toHaveBeenCalled();
    expect(test.output.join("\n")).toContain("only when --live is present");
  });

  it("rejects unknown, credential-shaped, and missing arguments", async () => {
    for (const argv of [["--unknown"], ["--api-key", "never-accepted"], ["--base-url"]]) {
      const test = harness();
      expect(await runCli(argv, test.dependencies)).toBe(1);
      expect(test.runLifecycle).not.toHaveBeenCalled();
      expect(test.errors[0]).toMatch(/^\[CLI_ARGUMENT_/);
      expect(test.errors.join(" ")).not.toContain("never-accepted");
    }
  });

  it("does not publish evidence unless explicitly requested", async () => {
    const test = harness();
    expect(await runCli([], test.dependencies)).toBe(0);
    expect(test.writeEvidenceFn).not.toHaveBeenCalled();
  });

  it("contains requested evidence under test-results", async () => {
    const test = harness();
    expect(
      await runCli(["--evidence", "test-results/live.json"], test.dependencies),
    ).toBe(0);
    expect(test.writeEvidenceFn).toHaveBeenCalledWith(expect.any(Object), {
      outputPath: "/workspace/faultsmith/test-results/live.json",
      allowedDirectory: "/workspace/faultsmith/test-results",
    });
  });

  it("returns a sanitized non-zero failure and stops after health-mode drift", async () => {
    const privateValue = "provider-private-body";
    const test = harness({
      runLifecycle: vi.fn(async () => {
        void privateValue;
        throw new SmokeFailure("HEALTH_LIVE_MODE", "health");
      }),
    });
    expect(await runCli(["--live"], test.dependencies)).toBe(1);
    expect(test.errors).toEqual(["[HEALTH_LIVE_MODE] health"]);
    expect(JSON.stringify(test.errors)).not.toContain(privateValue);
  });

  it("fails unsafe evidence paths without disclosing them", async () => {
    const test = harness({
      writeEvidenceFn: vi.fn(() => {
        throw new SmokeFailure("EVIDENCE_PATH", "evidence");
      }),
    });
    expect(await runCli(["--evidence", "../outside.json"], test.dependencies)).toBe(1);
    expect(test.errors).toEqual(["[EVIDENCE_PATH] evidence"]);
    expect(test.output).toEqual([]);
  });
});
