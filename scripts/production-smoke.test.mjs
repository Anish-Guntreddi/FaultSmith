import { createServer } from "node:http";
import { describe, expect, it, vi } from "vitest";

import { assertProductionSurface, runCli } from "./production-smoke.mjs";

const sha = "b".repeat(40);
const requiredHeaders = {
  "content-security-policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-resource-policy": "same-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "strict-transport-security": "max-age=63072000",
};

function metadataTags(origin, pathname) {
  return [
    `<link rel="canonical" href="${origin}${pathname === "/" ? "" : pathname}">`,
    `<meta property="og:url" content="${origin}${pathname === "/" ? "" : pathname}">`,
    `<meta property="og:image" content="${origin}/opengraph-image?asset=1">`,
    `<meta name="twitter:image" content="${origin}/twitter-image?asset=1">`,
  ].join("");
}

async function withServer(
  {
    headers = {},
    healthHeaders = {},
    learnHeaders = {},
    metadataOrigin,
    status = 200,
    learnBody,
  } = {},
  callback,
) {
  const server = createServer((request, response) => {
    const isHtml = request.url === "/" || request.url === "/learn";
    const isImage = request.url === "/opengraph-image" || request.url === "/twitter-image";
    const origin = metadataOrigin ?? `http://${request.headers.host}`;
    response.writeHead(status, {
      ...requiredHeaders,
      ...headers,
      ...(request.url === "/learn" ? learnHeaders : {}),
      ...(request.url === "/api/health" ? { "cache-control": "no-store", ...healthHeaders } : {}),
      "content-type": isHtml ? "text/html" : isImage ? "image/png" : "application/json",
    });
    if (request.url === "/") {
      response.end(
        `<!doctype html><title>FaultSmith — Learn to prove the fix</title>${metadataTags(origin, "/")}<h1>AI can write the patch</h1>`,
      );
    } else if (request.url === "/learn") {
      response.end(
        learnBody ??
          `<!doctype html><title>Learning Lab — FaultSmith</title>${metadataTags(origin, "/learn")}<h1>Learn to debug code you didn't write</h1>`,
      );
    } else if (isImage) {
      response.end(Buffer.alloc(2_048, 1));
    } else {
      response.end("{}");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  try {
    return await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

function lifecycleEvidence(mode, origin) {
  return { repositorySha: sha, mode, origin, stages: {} };
}

describe("production surface smoke", () => {
  it("verifies landing, product, social images, headers, health cache, and fallback lifecycle", async () => {
    await withServer({}, async (baseUrl) => {
      const lifecycle = vi.fn(async ({ expectedMode }) => lifecycleEvidence(expectedMode, baseUrl));
      const result = await assertProductionSurface({
        baseUrl,
        expectedMode: "fallback",
        repositorySha: sha,
        lifecycle,
      });
      expect(result).toMatchObject({
        rootStatus: 200,
        learnStatus: 200,
        socialImages: "verified",
        healthStatus: 200,
        headerPolicy: "verified",
        apiCache: "no-store",
      });
      expect(lifecycle).toHaveBeenCalledWith(
        expect.objectContaining({
          expectedMode: "fallback",
          repositorySha: sha,
          timeoutMs: 35_000,
        }),
      );
    });
  });

  it("accepts the reviewed cloud-on opener policy required by Google popup auth", async () => {
    await withServer(
      { headers: { "cross-origin-opener-policy": "same-origin-allow-popups" } },
      async (baseUrl) => {
        await expect(
          assertProductionSurface({
            baseUrl,
            repositorySha: sha,
            lifecycle: vi.fn(async () => lifecycleEvidence("fallback", baseUrl)),
          }),
        ).resolves.toMatchObject({ headerPolicy: "verified" });
      },
    );
  });

  it("fails closed when the dedicated product shell is absent", async () => {
    await withServer({ learnBody: "<!doctype html><title>FaultSmith</title>" }, async (baseUrl) => {
      await expect(
        assertProductionSurface({ baseUrl, repositorySha: sha, lifecycle: vi.fn() }),
      ).rejects.toMatchObject({ ruleId: "PRODUCTION_SHELL", stage: "learn" });
    });
  });

  it("applies the security policy to the dedicated product route", async () => {
    await withServer({ learnHeaders: { "x-frame-options": "SAMEORIGIN" } }, async (baseUrl) => {
      await expect(
        assertProductionSurface({ baseUrl, repositorySha: sha, lifecycle: vi.fn() }),
      ).rejects.toMatchObject({ ruleId: "PRODUCTION_HEADER", stage: "learn:x-frame-options" });
    });
  });

  it("binds canonical and social metadata to the tested deployment origin", async () => {
    await withServer({ metadataOrigin: "https://stale.example" }, async (baseUrl) => {
      await expect(
        assertProductionSurface({ baseUrl, repositorySha: sha, lifecycle: vi.fn() }),
      ).rejects.toMatchObject({ ruleId: "PRODUCTION_METADATA", stage: "root:canonical" });
    });
  });

  it.each([
    ["content-security-policy", "default-src 'self'"],
    ["cross-origin-opener-policy", "unsafe-none"],
    ["cross-origin-resource-policy", "cross-origin"],
    ["permissions-policy", "camera=()"],
    ["referrer-policy", "origin"],
    ["x-content-type-options", "text/plain"],
    ["x-frame-options", "SAMEORIGIN"],
  ])("fails closed when %s drifts", async (name, value) => {
    await withServer({ headers: { [name]: value } }, async (baseUrl) => {
      await expect(
        assertProductionSurface({
          baseUrl,
          expectedMode: "fallback",
          repositorySha: sha,
          lifecycle: vi.fn(),
        }),
      ).rejects.toMatchObject({ ruleId: expect.stringMatching(/^PRODUCTION_(?:HEADER|CSP)$/) });
    });
  });

  it("rejects cache drift and powered-by disclosure", async () => {
    await withServer(
      { headers: { "x-powered-by": "framework" }, healthHeaders: { "cache-control": "public" } },
      async (baseUrl) => {
        await expect(
          assertProductionSurface({
            baseUrl,
            repositorySha: sha,
            lifecycle: vi.fn(),
          }),
        ).rejects.toMatchObject({ ruleId: "PRODUCTION_DISCLOSURE" });
      },
    );
    await withServer({ healthHeaders: { "cache-control": "public" } }, async (baseUrl) => {
      await expect(
        assertProductionSurface({ baseUrl, repositorySha: sha, lifecycle: vi.fn() }),
      ).rejects.toMatchObject({ ruleId: "PRODUCTION_HEADER" });
    });
  });

  it("rejects contradictory cache policy and permissive CSP", async () => {
    await withServer(
      { healthHeaders: { "cache-control": "no-store, public, max-age=3600" } },
      async (baseUrl) => {
        await expect(
          assertProductionSurface({ baseUrl, repositorySha: sha, lifecycle: vi.fn() }),
        ).rejects.toMatchObject({ ruleId: "PRODUCTION_CACHE" });
      },
    );
    await withServer(
      {
        headers: {
          "content-security-policy":
            "default-src 'self'; script-src *; connect-src *; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
        },
      },
      async (baseUrl) => {
        await expect(
          assertProductionSurface({ baseUrl, repositorySha: sha, lifecycle: vi.fn() }),
        ).rejects.toMatchObject({ ruleId: "PRODUCTION_CSP" });
      },
    );
  });

  it("rejects a non-HTML or counterfeit application shell", async () => {
    const fetchImpl = vi.fn(async (url) => {
      const health = String(url).endsWith("/api/health");
      return new Response(health ? "{}" : "{not:an app}", {
        status: 200,
        headers: {
          ...requiredHeaders,
          "content-type": health ? "application/json" : "application/json",
          ...(health ? { "cache-control": "no-store" } : {}),
        },
      });
    });
    await expect(
      assertProductionSurface({
        baseUrl: "https://faultsmith.invalid",
        repositorySha: sha,
        fetchImpl,
        lifecycle: vi.fn(),
      }),
    ).rejects.toMatchObject({ ruleId: "PRODUCTION_HEADER" });
  });

  it("rejects authentication redirects and non-200 responses", async () => {
    await withServer({ status: 302, headers: { location: "/login" } }, async (baseUrl) => {
      await expect(
        assertProductionSurface({ baseUrl, repositorySha: sha, lifecycle: vi.fn() }),
      ).rejects.toMatchObject({ ruleId: "PRODUCTION_STATUS", status: 302 });
    });
  });

  it("requires HSTS for HTTPS production origins", async () => {
    const fetchImpl = vi.fn(async (url) => {
      const path = new URL(String(url)).pathname;
      const health = path === "/api/health";
      const image = path === "/opengraph-image" || path === "/twitter-image";
      const body =
        path === "/"
          ? `<!doctype html><title>FaultSmith — Learn to prove the fix</title>${metadataTags("https://faultsmith.invalid", "/")}<h1>AI can write the patch</h1>`
          : path === "/learn"
            ? `<!doctype html><title>Learning Lab — FaultSmith</title>${metadataTags("https://faultsmith.invalid", "/learn")}<h1>Learn to debug code you didn't write</h1>`
            : image
              ? new Uint8Array(2_048)
              : "{}";
      return new Response(body, {
        status: 200,
        headers: {
          ...requiredHeaders,
          "strict-transport-security": "max-age=0",
          "content-type": health ? "application/json" : image ? "image/png" : "text/html",
          "cache-control": health ? "no-store" : "",
        },
      });
    });
    await expect(
      assertProductionSurface({
        baseUrl: "https://faultsmith.invalid",
        repositorySha: sha,
        fetchImpl,
        lifecycle: vi.fn(),
      }),
    ).rejects.toMatchObject({ ruleId: "PRODUCTION_HEADER" });
  });

  it("keeps live mode explicit and CLI failures sanitized", async () => {
    const output = [];
    const errors = [];
    await withServer({}, async (baseUrl) => {
      expect(
        await runCli(["--live", "--base-url", baseUrl], {
          repositorySha: sha,
          lifecycle: vi.fn(async () => lifecycleEvidence("live", baseUrl)),
          stdout: (line) => output.push(line),
          stderr: (line) => errors.push(line),
        }),
      ).toBe(0);
    });
    expect(output.at(-1)).toContain("mode=live");
    expect(errors).toEqual([]);

    const failedOutput = [];
    expect(
      await runCli(["--api-key", "private-value"], {
        stdout: (line) => failedOutput.push(line),
        stderr: (line) => failedOutput.push(line),
      }),
    ).toBe(1);
    expect(failedOutput.join(" ")).not.toContain("private-value");
  });

  it("publishes only contained lifecycle evidence on explicit request", async () => {
    const writeEvidenceFn = vi.fn();
    await withServer({}, async (baseUrl) => {
      expect(
        await runCli(
          ["--base-url", baseUrl, "--evidence", "test-results/production.json"],
          {
            cwd: "/workspace/faultsmith",
            repositorySha: sha,
            lifecycle: vi.fn(async () => lifecycleEvidence("fallback", baseUrl)),
            writeEvidenceFn,
            stdout: vi.fn(),
            stderr: vi.fn(),
          },
        ),
      ).toBe(0);
    });
    expect(writeEvidenceFn).toHaveBeenCalledWith(expect.any(Object), {
      outputPath: "/workspace/faultsmith/test-results/production.json",
      allowedDirectory: "/workspace/faultsmith/test-results",
    });
  });
});
