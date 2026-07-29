import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (path) => readFileSync(resolve(root, path), "utf8");

describe("submission claim boundaries", () => {
  it("keeps the zero-token guided workflow separate from live model claims", () => {
    const client = read("src/components/faultsmith-app.tsx");
    const demo = read("docs/DEMO_SCRIPT.md");

    expect(client).toContain("void forgeChallenge(false");
    expect(demo).toContain("guided lesson intentionally makes no model call");
    expect(demo).not.toMatch(/GPT-5\.6 (?:produces|generates|designs) a .*mutation contract/i);
  });

  it("describes the constrained catalog and practice-level behavior truthfully", () => {
    const publicClaims = [
      read("README.md"),
      read("docs/DEMO_SCRIPT.md"),
      read("docs/SUBMISSION.md"),
    ].join("\n");

    expect(publicClaims).not.toMatch(/adaptive GPT-5\.6 practice/i);
    expect(publicClaims).not.toMatch(/GPT-5\.6 selects a .*mutation/i);
    expect(publicClaims).not.toMatch(/bug aligned to a chosen skill and difficulty/i);
    expect(publicClaims).toContain("practice-level control labels the attempt");
    expect(publicClaims).toContain("server-owned templates provide learner-facing feedback");
  });
});
