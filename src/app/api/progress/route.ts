import {
  progressDeleteResponseSchema,
  progressImportRequestSchema,
  progressSnapshotSchema,
} from "@/lib/progress-contracts";
import { getDefaultProgressService } from "@/server/progress-service";
import {
  assertSameOrigin,
  checkRateLimit,
  readJsonBody,
  RequestError,
} from "@/server/request-guard";

export const maxDuration = 15;

/**
 * Authenticated cloud progress API. Every method is same-origin,
 * rate-limited, no-store, exact-key, and re-authorized at the data boundary
 * through the server-only identity DAL: identity comes exclusively from a
 * verified Firebase ID token, never from any client-supplied field.
 */

function noStoreJson(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function noStoreError(error: unknown): Response {
  if (error instanceof RequestError) {
    return noStoreJson(
      { error: error.message, code: error.code, retryable: error.retryable },
      error.status,
    );
  }
  return noStoreJson(
    {
      error: "FaultSmith could not complete this request safely.",
      code: "INTERNAL_ERROR",
      retryable: true,
    },
    500,
  );
}

function accessDenied(kind: "unauthorized" | "unavailable"): Response {
  if (kind === "unauthorized") {
    return noStoreJson(
      { error: "This progress request is not authorized.", code: "UNAUTHORIZED", retryable: false },
      401,
    );
  }
  return noStoreJson(
    { error: "Cloud progress is temporarily unavailable.", code: "CLOUD_UNAVAILABLE", retryable: true },
    503,
  );
}

function guardRequest(request: Request) {
  assertSameOrigin(request);
  if (checkRateLimit(request, "progress")) {
    throw new RequestError("Too many progress requests. Try again shortly.", "RATE_LIMITED", 429, true);
  }
}

export async function GET(request: Request) {
  try {
    guardRequest(request);
    const result = await getDefaultProgressService().readProfile(request);
    if (result.kind !== "ok") return accessDenied(result.kind);
    return noStoreJson(progressSnapshotSchema.parse(result.value));
  } catch (error) {
    return noStoreError(error);
  }
}

export async function POST(request: Request) {
  try {
    guardRequest(request);
    const parsed = progressImportRequestSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      throw new RequestError("The progress import request is invalid.", "INVALID_REQUEST", 400);
    }
    const result = await getDefaultProgressService().importProfile(request, parsed.data.profile);
    if (result.kind === "already_imported") {
      return noStoreJson(
        {
          error: "Local progress was already imported for this account.",
          code: "IMPORT_ALREADY_COMPLETED",
          retryable: false,
        },
        409,
      );
    }
    if (result.kind !== "ok") return accessDenied(result.kind);
    return noStoreJson(progressSnapshotSchema.parse(result.value));
  } catch (error) {
    return noStoreError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    guardRequest(request);
    const result = await getDefaultProgressService().deleteProfile(request);
    if (result.kind !== "ok") return accessDenied(result.kind);
    return noStoreJson(progressDeleteResponseSchema.parse(result.value));
  } catch (error) {
    return noStoreError(error);
  }
}
