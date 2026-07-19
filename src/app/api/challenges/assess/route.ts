import { assessRequestSchema } from "@/lib/contracts";
import { getDefaultProgressService } from "@/server/progress-service";
import {
  assertSameOrigin,
  checkRateLimit,
  readJsonBody,
  RequestError,
  safeErrorResponse,
} from "@/server/request-guard";
import { assessChallengeWorkflow } from "@/server/workflows";

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    // The assess response can trigger an authenticated cloud write, so the
    // same exact-origin containment as /api/progress applies here.
    assertSameOrigin(request);
    if (checkRateLimit(request, "assess")) {
      throw new RequestError("Too many submissions. Try again shortly.", "RATE_LIMITED", 429, true);
    }
    const parsed = assessRequestSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      throw new RequestError("The assessment request is invalid.", "INVALID_REQUEST", 400);
    }
    // The deterministic assessment decides the exact response first; the
    // cloud sync hook runs afterwards, is optional-identity, never throws,
    // and can never alter completion or test authority. Cloud failure never
    // invalidates the report.
    const result = await assessChallengeWorkflow(parsed.data);
    const cloudSync = await getDefaultProgressService().syncAssessment(
      request,
      parsed.data.challengeId,
      result,
    );
    return Response.json(
      { ...result, cloudSync },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    return safeErrorResponse(error);
  }
}
