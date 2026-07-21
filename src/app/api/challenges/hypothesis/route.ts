import { hypothesisRequestSchema, hypothesisResponseSchema } from "@/lib/contracts";
import {
  checkRateLimit,
  readJsonBody,
  RequestError,
  safeErrorResponse,
} from "@/server/request-guard";
import { evaluateHypothesisWorkflow } from "@/server/workflows";

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    if (checkRateLimit(request, "hypothesis")) {
      throw new RequestError(
        "Too many hypothesis coaching requests. Try again shortly.",
        "RATE_LIMITED",
        429,
        true,
      );
    }
    const parsed = hypothesisRequestSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      throw new RequestError(
        "The hypothesis coaching request is invalid.",
        "INVALID_REQUEST",
        400,
      );
    }
    const result = hypothesisResponseSchema.parse(
      await evaluateHypothesisWorkflow(parsed.data),
    );
    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return safeErrorResponse(error);
  }
}
