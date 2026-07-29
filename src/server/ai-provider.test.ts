import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { OpenAIGateway } from "@/server/ai-gateway";
import { createLiveGateway, isLiveConfigured, resolveLiveProvider } from "@/server/ai-provider";
import { GeminiGateway } from "@/server/gemini-gateway";

function stubKeys(gemini: string | undefined, openai: string | undefined) {
  vi.stubEnv("GEMINI_API_KEY", gemini ?? "");
  vi.stubEnv("OPENAI_API_KEY", openai ?? "");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("resolveLiveProvider", () => {
  it("returns null when no provider key is configured", () => {
    stubKeys(undefined, undefined);
    expect(resolveLiveProvider()).toBeNull();
    expect(isLiveConfigured()).toBe(false);
  });

  it("treats whitespace-only keys as absent", () => {
    stubKeys("   ", "   ");
    expect(resolveLiveProvider()).toBeNull();
  });

  it("selects OpenAI when only OPENAI_API_KEY is set", () => {
    stubKeys(undefined, "sk-test");
    expect(resolveLiveProvider()).toBe("openai");
    expect(isLiveConfigured()).toBe(true);
  });

  it("selects Gemini when only GEMINI_API_KEY is set", () => {
    stubKeys("g-test", undefined);
    expect(resolveLiveProvider()).toBe("gemini");
    expect(isLiveConfigured()).toBe(true);
  });

  it("prefers Gemini when both keys are set", () => {
    stubKeys("g-test", "sk-test");
    expect(resolveLiveProvider()).toBe("gemini");
  });
});

describe("createLiveGateway", () => {
  it("returns undefined without a configured provider", () => {
    stubKeys(undefined, undefined);
    expect(createLiveGateway()).toBeUndefined();
  });

  it("constructs the gateway matching the resolved provider", () => {
    stubKeys("g-test", undefined);
    expect(createLiveGateway()).toBeInstanceOf(GeminiGateway);

    stubKeys(undefined, "sk-test");
    expect(createLiveGateway()).toBeInstanceOf(OpenAIGateway);
  });
});
