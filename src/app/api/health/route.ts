import { hasOpenAIKey } from "@/server/ai-gateway";
import { hasRecentContainmentRejection } from "@/server/hypothesis-health";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    {
      status: "ok",
      liveOpenAIConfigured: hasOpenAIKey(),
      fixtureFallback: "ready",
      // Design spec section 3.4: an aggregate boolean only — never a count,
      // a timestamp, or any matched content.
      hypothesisContainmentRecentRejection: hasRecentContainmentRejection(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

