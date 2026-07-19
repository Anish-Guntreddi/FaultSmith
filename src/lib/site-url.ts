type SiteEnvironment = {
  DEPLOY_PRIME_URL?: string;
  NETLIFY?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  NODE_ENV?: string;
  URL?: string;
};

const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function resolveMetadataBase(environment: SiteEnvironment = process.env) {
  const configured =
    environment.NEXT_PUBLIC_SITE_URL ||
    environment.DEPLOY_PRIME_URL ||
    environment.URL;

  if (!configured) {
    if (environment.NETLIFY === "true") {
      throw new Error("A Netlify deployment origin is required for FaultSmith metadata.");
    }
    return new URL("http://localhost:3000");
  }

  const url = new URL(configured);
  if (!["http:", "https:"].includes(url.protocol) || url.username || configured.includes("@")) {
    throw new Error("FaultSmith metadata requires a public HTTP(S) origin.");
  }
  if (
    environment.NODE_ENV === "production" &&
    !loopbackHosts.has(url.hostname) &&
    url.protocol !== "https:"
  ) {
    throw new Error("FaultSmith production metadata requires HTTPS.");
  }

  return new URL(url.origin);
}
