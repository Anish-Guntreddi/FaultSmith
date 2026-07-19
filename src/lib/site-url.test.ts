import { describe, expect, it } from "vitest";

import { resolveMetadataBase } from "./site-url";

describe("metadata origin resolution", () => {
  it("uses the explicit canonical origin before Netlify-provided values", () => {
    expect(
      resolveMetadataBase({
        NEXT_PUBLIC_SITE_URL: "https://faultsmith.example/path",
        DEPLOY_PRIME_URL: "https://preview.example",
        URL: "https://production.example",
        NODE_ENV: "production",
      }).href,
    ).toBe("https://faultsmith.example/");
  });

  it("derives an absolute HTTPS preview origin from Netlify", () => {
    expect(
      resolveMetadataBase({
        DEPLOY_PRIME_URL: "https://deploy-preview-13--faultsmith.netlify.app",
        NETLIFY: "true",
        NODE_ENV: "production",
      }).href,
    ).toBe("https://deploy-preview-13--faultsmith.netlify.app/");
  });

  it("fails a Netlify build with a missing or insecure public origin", () => {
    expect(() =>
      resolveMetadataBase({ NETLIFY: "true", NODE_ENV: "production" }),
    ).toThrow(/origin is required/);
    expect(() =>
      resolveMetadataBase({
        NETLIFY: "true",
        NODE_ENV: "production",
        URL: "http://faultsmith.example",
      }),
    ).toThrow(/requires HTTPS/);
  });

  it("keeps local development and local production smoke on loopback", () => {
    expect(resolveMetadataBase({ NODE_ENV: "development" }).href).toBe("http://localhost:3000/");
    expect(
      resolveMetadataBase({ NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3122" }).href,
    ).toBe("http://127.0.0.1:3122/");
  });
});
