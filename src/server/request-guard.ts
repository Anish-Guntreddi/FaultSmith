import "server-only";

const MAX_REQUEST_BYTES = 80_000;
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;
const MAX_REQUESTS_PER_SCOPE_WINDOW = 300;
const MAX_RATE_LIMIT_BUCKETS = 5_000;

type Bucket = { count: number; resetsAt: number };
const buckets = new Map<string, Bucket>();
const scopeBuckets = new Map<string, Bucket>();

function clientAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  return /^[0-9a-fA-F:.]{3,45}$/.test(forwarded) ? forwarded : "unknown";
}

function makeBucketKey(request: Request, scope: string, now: number) {
  const proposed = `${scope}:${clientAddress(request)}`;
  if (buckets.has(proposed) || buckets.size < MAX_RATE_LIMIT_BUCKETS) return proposed;

  for (const [key, bucket] of buckets) {
    if (bucket.resetsAt <= now) buckets.delete(key);
  }
  return buckets.size < MAX_RATE_LIMIT_BUCKETS ? proposed : `${scope}:overflow`;
}

export function checkRateLimit(request: Request, scope: string) {
  const now = Date.now();
  const scopeBucket = scopeBuckets.get(scope);

  if (!scopeBucket || scopeBucket.resetsAt <= now) {
    scopeBuckets.set(scope, { count: 1, resetsAt: now + WINDOW_MS });
  } else {
    scopeBucket.count += 1;
    if (scopeBucket.count > MAX_REQUESTS_PER_SCOPE_WINDOW) return true;
  }

  const key = makeBucketKey(request, scope, now);
  const current = buckets.get(key);

  if (!current || current.resetsAt <= now) {
    buckets.set(key, { count: 1, resetsAt: now + WINDOW_MS });
    return false;
  }

  current.count += 1;
  return current.count > MAX_REQUESTS_PER_WINDOW;
}

export async function readJsonBody(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new RequestError("Requests must use application/json.", "INVALID_CONTENT_TYPE", 415);
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength !== null && !/^\d+$/.test(contentLength.trim())) {
    throw new RequestError("The Content-Length header is invalid.", "INVALID_CONTENT_LENGTH", 400);
  }

  const declaredLength = contentLength === null ? 0 : Number(contentLength);
  if (declaredLength > MAX_REQUEST_BYTES) {
    throw new RequestError("The request is too large.", "REQUEST_TOO_LARGE", 413);
  }

  const reader = request.body?.getReader();
  if (!reader) {
    throw new RequestError("The request body is not valid JSON.", "INVALID_JSON", 400);
  }

  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let receivedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    receivedBytes += value.byteLength;
    if (receivedBytes > MAX_REQUEST_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw new RequestError("The request is too large.", "REQUEST_TOO_LARGE", 413);
    }

    chunks.push(decoder.decode(value, { stream: true }));
  }

  chunks.push(decoder.decode());
  const text = chunks.join("");

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new RequestError("The request body is not valid JSON.", "INVALID_JSON", 400);
  }
}

export class RequestError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly retryable = false,
  ) {
    super(message);
  }
}

export function safeErrorResponse(error: unknown) {
  if (error instanceof RequestError) {
    return Response.json(
      { error: error.message, code: error.code, retryable: error.retryable },
      { status: error.status },
    );
  }

  return Response.json(
    {
      error: "FaultSmith could not complete this request safely.",
      code: "INTERNAL_ERROR",
      retryable: true,
    },
    { status: 500 },
  );
}
