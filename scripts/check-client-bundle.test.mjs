import { describe, expect, it } from "vitest";

import {
  deriveFixtureHiddenMarkers,
  expectedPublicFirebaseConfigNames,
  inspectBundleContent,
  staticForbiddenMarkers,
} from "./check-client-bundle.mjs";

describe("client bundle hidden-marker derivation", () => {
  const source = String.raw`
    function lines(value: string[]) { return value.join("\n") + "\n"; }
    function createFixture(input: unknown) { return input; }
    const original = lines(["safe line", "fixed branch"]);
    const mutated = original.replace("fixed branch", "broken branch");
    export const challengeFixtures = [
      createFixture({
        challengeId: "sample-v1",
        hiddenRootCause: "private root explanation",
        originalSource: original,
        mutatedSource: mutated,
        fixedSnippet: "fixed branch",
        brokenSnippet: "broken branch",
        hints: ["first private hint", "second private hint", "third private hint"],
      }),
    ];
  `;

  it("derives every hidden fixture value without importing or executing fixture code", () => {
    const markers = deriveFixtureHiddenMarkers(source);

    expect(markers).toEqual(
      expect.arrayContaining([
        { id: "fixture:sample-v1:root", value: "private root explanation" },
        { id: "fixture:sample-v1:reference", value: "safe line\nfixed branch\n" },
        { id: "fixture:sample-v1:fixed", value: "fixed branch" },
        { id: "fixture:sample-v1:mutation", value: "fixed branch -> broken branch" },
        { id: "fixture:sample-v1:hint-1", value: "first private hint" },
        { id: "fixture:sample-v1:hint-2", value: "second private hint" },
        { id: "fixture:sample-v1:hint-3", value: "third private hint" },
      ]),
    );
  });

  it("reports only marker identifiers and never matched values", () => {
    const markers = deriveFixtureHiddenMarkers(source);
    const hiddenValue = markers.find(({ id }) => id.endsWith(":root"));
    expect(hiddenValue).toBeDefined();

    const findings = inspectBundleContent(".next/static/chunk.js", hiddenValue.value, markers);
    expect(findings).toEqual([
      { file: ".next/static/chunk.js", rule: "fixture:sample-v1:root" },
    ]);
    expect(JSON.stringify(findings)).not.toContain(hiddenValue.value);
  });
});

describe("client bundle Firebase credential boundaries", () => {
  it("rejects Firebase Admin SDK and service credential markers", () => {
    const cases = [
      ["server-module:firebase-admin", "firebase-" + "admin"],
      ["environment:firebase-service-account", "FIREBASE_SERVICE_" + "ACCOUNT"],
      ["environment:google-application-credentials", "GOOGLE_APPLICATION_" + "CREDENTIALS"],
      ["credential:service-account-type", ["service", "account"].join("_")],
      ["credential:private-key-block", ["-----BEGIN PRIVATE", "KEY-----"].join(" ")],
    ];

    for (const [rule, content] of cases) {
      const findings = inspectBundleContent(
        ".next/static/chunks/app.js",
        `prefix ${content} suffix`,
        staticForbiddenMarkers,
      );
      expect(findings.map((finding) => finding.rule)).toContain(rule);
    }
  });

  it("treats expected public Firebase web config names as public metadata", () => {
    const inlinedPublicContent = expectedPublicFirebaseConfigNames.join(" ");

    expect(
      inspectBundleContent(
        ".next/static/chunks/app.js",
        inlinedPublicContent,
        staticForbiddenMarkers,
      ),
    ).toEqual([]);
  });

  it("never lists a public config name as a forbidden marker", () => {
    for (const name of expectedPublicFirebaseConfigNames) {
      for (const marker of staticForbiddenMarkers) {
        expect(name.includes(marker.value)).toBe(false);
      }
    }
  });
});
