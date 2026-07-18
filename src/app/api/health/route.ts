import { hasOpenAIKey } from "@/server/ai-gateway";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    {
      status: "ok",
      liveOpenAIConfigured: hasOpenAIKey(),
      fixtureFallback: "ready",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

