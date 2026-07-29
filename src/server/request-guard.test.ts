import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { checkRateLimit, readJsonBody, RequestError } from "./request-guard";

describe("route request guard", () => {
  it("rejects non-JSON and malformed JSON payloads", async () => {
    await expect(
      readJsonBody(new Request("http://localhost/api", { method: "POST", body: "hello" })),
    ).rejects.toMatchObject({ code: "INVALID_CONTENT_TYPE", status: 415 });

    await expect(
      readJsonBody(
        new Request("http://localhost/api", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{",
        }),
      ),
    ).rejects.toBeInstanceOf(RequestError);
  });

  it("caps request bodies before schema parsing", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": "80001",
      },
      body: "{}",
    });

    await expect(readJsonBody(request)).rejects.toMatchObject({
      code: "REQUEST_TOO_LARGE",
      status: 413,
    });
  });

  it.each(["-1", "not-a-number", "1.5"])(
    "rejects an invalid Content-Length value of %s",
    async (contentLength) => {
      const request = new Request("http://localhost/api", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": contentLength,
        },
        body: "{}",
      });

      await expect(readJsonBody(request)).rejects.toMatchObject({
        code: "INVALID_CONTENT_LENGTH",
        status: 400,
      });
    },
  );

  it("cancels a chunked body as soon as its byte limit is exceeded", async () => {
    let cancelled = false;
    const chunks = [new Uint8Array(40_000), new Uint8Array(40_001), new Uint8Array(1)];
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        const chunk = chunks.shift();
        if (chunk) controller.enqueue(chunk);
        else controller.close();
      },
      cancel() {
        cancelled = true;
      },
    });
    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    await expect(readJsonBody(request)).rejects.toMatchObject({
      code: "REQUEST_TOO_LARGE",
      status: 413,
    });
    expect(cancelled).toBe(true);
    expect(chunks).toHaveLength(1);
  });

  it("accepts exactly 80,000 streamed bytes", async () => {
    const prefix = '{"message":"';
    const suffix = '"}';
    const text = `${prefix}${"a".repeat(80_000 - prefix.length - suffix.length)}${suffix}`;
    expect(new TextEncoder().encode(text)).toHaveLength(80_000);
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(text));
        controller.close();
      },
    });
    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    await expect(readJsonBody(request)).resolves.toEqual({
      message: "a".repeat(80_000 - prefix.length - suffix.length),
    });
  });

  it("decodes JSON when a multibyte character spans stream chunks", async () => {
    const encoded = new TextEncoder().encode('{"message":"fault 🔧"}');
    const emojiStart = encoded.indexOf(0xf0);
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoded.slice(0, emojiStart + 2));
        controller.enqueue(encoded.slice(emojiStart + 2));
        controller.close();
      },
    });
    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    await expect(readJsonBody(request)).resolves.toEqual({ message: "fault 🔧" });
  });

  it("normalizes malformed forwarded addresses so header rotation cannot bypass the limit", () => {
    let limited = false;
    for (let index = 0; index < 31; index += 1) {
      const request = new Request("http://localhost/api", {
        headers: { "x-forwarded-for": `not-an-ip-${index}` },
      });
      limited = checkRateLimit(request, "malformed-address-test");
    }

    expect(limited).toBe(true);
  });

  it("bounds valid forwarded-address churn with a scope-wide budget", () => {
    let limited = false;
    for (let index = 0; index < 301; index += 1) {
      const request = new Request("http://localhost/api", {
        headers: { "x-forwarded-for": `2001:db8::${index.toString(16)}` },
      });
      limited = checkRateLimit(request, "valid-address-churn-test");
    }

    expect(limited).toBe(true);
  });
});
