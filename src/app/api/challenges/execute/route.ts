import { executeRequestSchema, executionResponseSchema } from "@/lib/contracts";
import {
  checkRateLimit,
  readJsonBody,
  RequestError,
  safeErrorResponse,
} from "@/server/request-guard";
import { executeChallengeWorkflow } from "@/server/workflows";

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    if (checkRateLimit(request, "execute")) {
      throw new RequestError("Too many test runs. Try again shortly.", "RATE_LIMITED", 429, true);
    }
    const parsed = executeRequestSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      throw new RequestError("The test request is invalid.", "INVALID_REQUEST", 400);
    }
    const result = executionResponseSchema.parse(
      await executeChallengeWorkflow(parsed.data),
    );
    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return safeErrorResponse(error);
  }
}

