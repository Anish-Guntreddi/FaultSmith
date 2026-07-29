import "server-only";

import { type AIGateway, hasOpenAIKey, OpenAIGateway } from "@/server/ai-gateway";
import { GeminiGateway, hasGeminiKey } from "@/server/gemini-gateway";

export type LiveProvider = "gemini" | "openai";

/**
 * Auto-detect the live AI provider from which credential is present.
 * Gemini wins when both keys are set; with neither key the app stays in
 * the deterministic fixture-fallback mode, which serves the full product.
 */
export function resolveLiveProvider(): LiveProvider | null {
  if (hasGeminiKey()) return "gemini";
  if (hasOpenAIKey()) return "openai";
  return null;
}

export function isLiveConfigured(): boolean {
  return resolveLiveProvider() !== null;
}

export function createLiveGateway(): AIGateway | undefined {
  switch (resolveLiveProvider()) {
    case "gemini":
      return new GeminiGateway();
    case "openai":
      return new OpenAIGateway();
    default:
      return undefined;
  }
}
