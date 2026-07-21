import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type CoachBehavior = "success" | "fail" | "leak-once" | "leak-twice";

const harness = vi.hoisted(() => ({ behavior: "success" as CoachBehavior }));

const LEAKED_FIX = "The repair is: if expense.amount >= 500:";

vi.mock("@/server/ai-gateway", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/ai-gateway")>();
  type CoachContext = Parameters<InstanceType<typeof actual.OpenAIGateway>["coachHypothesis"]>[0];
  type ModelCoachResponse = Awaited<
    ReturnType<InstanceType<typeof actual.OpenAIGateway>["coachHypothesis"]>
  >;

  class FakeGateway extends actual.OpenAIGateway {
    async coachHypothesis(
      _context: CoachContext,
      stricter: boolean,
    ): Promise<ModelCoachResponse> {
      if (harness.behavior === "fail") {
        throw new Error("coach provider unavailable");
      }
      if (harness.behavior === "leak-twice" || (harness.behavior === "leak-once" && !stricter)) {
        return {
          axes: { locus: "aligned", mechanism: "unstated", trigger: "unstated" },
          weakestAxis: "mechanism",
          observation: LEAKED_FIX,
          question: "Does that match your hypothesis?",
          movement: "first",
        };
      }
      return {
        axes: { locus: "aligned", mechanism: "partial", trigger: "unstated" },
        weakestAxis: "trigger",
        observation: "The failing test rejects the exact boundary value of 500.",
        question: "Which input value sits right at that boundary?",
        movement: "first",
      };
    }

    // Override rather than inherit `OpenAIGateway`'s real implementation,
    // which would otherwise make a live network call in this route test.
    // This route-level test suite exercises the substring denylist and the
    // provider-error/retry contract; the semantic classifier layer itself
    // is covered directly in workflows.test.ts.
    async classifyHypothesisLeak() {
      return false;
    }
  }

  return { ...actual, OpenAIGateway: FakeGateway };
});

import { POST as hypothesis } from "./route";

function jsonRequest(body: unknown, ip = "198.51.100.40") {
  return new Request("http://localhost/api/challenges/hypothesis", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

const validBody = {
  challengeId: "expense-boundary-v1",
  hypothesis: "The comparison excludes the exact boundary value.",
  hypothesisHistory: ["An earlier, vaguer guess about the threshold."],
};

describe("POST /api/challenges/hypothesis", () => {
  beforeEach(() => {
    harness.behavior = "success";
    process.env.OPENAI_API_KEY = "";
  });

  it("rejects a request missing required fields with 400", async () => {
    const response = await hypothesis(
      jsonRequest({ challengeId: "expense-boundary-v1" }, "198.51.100.41"),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe("INVALID_REQUEST");
  });

  it("rejects an unknown challenge identifier with a safe 404", async () => {
    const response = await hypothesis(
      jsonRequest({ ...validBody, challengeId: "no-such-challenge" }, "198.51.100.42"),
    );
    expect(response.status).toBe(404);
    expect((await response.json()).code).toBe("INVALID_CHALLENGE");
  });

  it("rate limits repeated requests with a safe 429", async () => {
    const ip = "203.0.113.91";
    let response = new Response();
    for (let index = 0; index < 31; index += 1) {
      response = await hypothesis(jsonRequest(validBody, ip));
    }
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      error: "Too many hypothesis coaching requests. Try again shortly.",
      code: "RATE_LIMITED",
      retryable: true,
    });
  });

  it("returns the deterministic fallback with 200 when no API key is configured", async () => {
    const response = await hypothesis(jsonRequest(validBody, "198.51.100.43"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body.source).toBe("deterministic_fallback");
    expect(body.axes).toBeDefined();
    expect(body.weakestAxis).toBeDefined();
  });

  it("returns the deterministic fallback with 200, never a 5xx, on a provider failure", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    harness.behavior = "fail";
    const response = await hypothesis(jsonRequest(validBody, "198.51.100.44"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.source).toBe("deterministic_fallback");
  });

  it("regenerates once under a stricter instruction and succeeds live after one leak", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    harness.behavior = "leak-once";
    const response = await hypothesis(jsonRequest(validBody, "198.51.100.45"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.source).toBe("gpt-5.6");
    expect(JSON.stringify(body)).not.toContain("if expense.amount >= 500");
  });

  it("degrades to the deterministic fallback and never leaks protected content when both attempts leak", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    harness.behavior = "leak-twice";
    const response = await hypothesis(jsonRequest(validBody, "198.51.100.46"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.source).toBe("deterministic_fallback");
    expect(JSON.stringify(body)).not.toContain("if expense.amount >= 500");
    expect(JSON.stringify(body)).not.toContain(LEAKED_FIX);
  });

  it("rejects a cross-origin request with a safe 403 (security remediation)", async () => {
    const response = await hypothesis(
      new Request("http://localhost/api/challenges/hypothesis", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "198.51.100.47",
          origin: "https://evil.example",
          host: "localhost",
        },
        body: JSON.stringify(validBody),
      }),
    );
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("CROSS_ORIGIN");
  });

  it("keeps working for a same-origin browser request and an origin-less client", async () => {
    const sameOrigin = await hypothesis(
      new Request("http://localhost/api/challenges/hypothesis", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "198.51.100.48",
          origin: "http://localhost",
          host: "localhost",
        },
        body: JSON.stringify(validBody),
      }),
    );
    expect(sameOrigin.status).toBe(200);

    const originLess = await hypothesis(jsonRequest(validBody, "198.51.100.49"));
    expect(originLess.status).toBe(200);
  });
});
