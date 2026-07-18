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
});
