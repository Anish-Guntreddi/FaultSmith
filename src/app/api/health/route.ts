import { isLiveConfigured, resolveLiveProvider } from "@/server/ai-provider";
import { hasRecentContainmentRejection } from "@/server/hypothesis-health";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    {
      status: "ok",
      // Key name predates multi-provider support; it now means "any live
      // AI provider configured" and is kept for smoke/E2E contract
      // stability. `liveProvider` carries the specific provider.
      liveOpenAIConfigured: isLiveConfigured(),
      liveProvider: resolveLiveProvider(),
      fixtureFallback: "ready",
      // Design spec section 3.4: an aggregate boolean only — never a count,
      // a timestamp, or any matched content.
      hypothesisContainmentRecentRejection: hasRecentContainmentRejection(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

