import { assessRequestSchema } from "@/lib/contracts";
import {
  checkRateLimit,
  readJsonBody,
  RequestError,
  safeErrorResponse,
} from "@/server/request-guard";
import { assessChallengeWorkflow } from "@/server/workflows";

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    if (checkRateLimit(request, "assess")) {
      throw new RequestError("Too many submissions. Try again shortly.", "RATE_LIMITED", 429, true);
    }
    const parsed = assessRequestSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      throw new RequestError("The assessment request is invalid.", "INVALID_REQUEST", 400);
    }
    const result = await assessChallengeWorkflow(parsed.data);
    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return safeErrorResponse(error);
  }
}

