import { hintRequestSchema, hintResponseSchema } from "@/lib/contracts";
import {
  checkRateLimit,
  readJsonBody,
  RequestError,
  safeErrorResponse,
} from "@/server/request-guard";
import { revealHintWorkflow } from "@/server/workflows";

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    if (checkRateLimit(request, "hint")) {
      throw new RequestError("Too many hint requests. Try again shortly.", "RATE_LIMITED", 429, true);
    }
    const parsed = hintRequestSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      throw new RequestError("The hint request is invalid.", "INVALID_REQUEST", 400);
    }
    const result = hintResponseSchema.parse(await revealHintWorkflow(parsed.data));
    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return safeErrorResponse(error);
  }
}
