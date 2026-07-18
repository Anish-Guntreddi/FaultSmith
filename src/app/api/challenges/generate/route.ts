import { generateChallengeRequestSchema } from "@/lib/contracts";
import {
  checkRateLimit,
  readJsonBody,
  RequestError,
  safeErrorResponse,
} from "@/server/request-guard";
import { generateChallengeWorkflow } from "@/server/workflows";

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    if (checkRateLimit(request, "generate")) {
      throw new RequestError("Too many generation requests. Try again shortly.", "RATE_LIMITED", 429, true);
    }
    const parsed = generateChallengeRequestSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      throw new RequestError("The challenge configuration is invalid.", "INVALID_REQUEST", 400);
    }
    const challenge = await generateChallengeWorkflow(parsed.data);
    return Response.json(challenge, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return safeErrorResponse(error);
  }
}

