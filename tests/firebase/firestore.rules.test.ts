import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";

/**
 * Direct browser Firestore access must be denied for every identity state
 * because the server (Admin SDK) owns all learning-data persistence. These
 * tests run only against the local emulator under an explicit demo project,
 * so they can never contact a real Firebase project.
 */
const DEMO_PROJECT_ID = "demo-faultsmith";

const rulesPath = fileURLToPath(new URL("../../firestore.rules", import.meta.url));

function firestoreEmulatorAddress(): { host: string; port: number } {
  const raw = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
  const [host, portText] = raw.split(":");
  return { host: host || "127.0.0.1", port: Number(portText) || 8080 };
}

interface IdentityState {
  name: string;
  uid: string;
  claims: Record<string, unknown>;
}

// Fabricated, clearly non-real identity states covering the account
// lifecycle: guest is the unauthenticated context below; the rest model
// unverified/verified email, Google, a UID-preserving provider link, and a
// collision-era learner who re-authenticated with the original provider.
const identityStates: IdentityState[] = [
  {
    name: "unverified email/password learner",
    uid: "uid-unverified-password",
    claims: {
      email: "unverified.learner@example.test",
      email_verified: false,
      firebase: { sign_in_provider: "password" },
    },
  },
  {
    name: "verified email/password learner",
    uid: "uid-verified-password",
    claims: {
      email: "verified.learner@example.test",
      email_verified: true,
      firebase: { sign_in_provider: "password" },
    },
  },
  {
    name: "Google learner",
    uid: "uid-google",
    claims: {
      email: "google.learner@example.test",
      email_verified: true,
      firebase: { sign_in_provider: "google.com" },
    },
  },
  {
    name: "learner with email and Google linked on one preserved UID",
    uid: "uid-linked-preserved",
    claims: {
      email: "linked.learner@example.test",
      email_verified: true,
      firebase: { sign_in_provider: "google.com" },
    },
  },
  {
    name: "collision-era learner using the original provider fallback",
    uid: "uid-collision-fallback",
    claims: {
      email: "collision.learner@example.test",
      email_verified: true,
      firebase: { sign_in_provider: "password" },
    },
  },
];

let testEnv: RulesTestEnvironment;

function clientDb(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore;
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: DEMO_PROJECT_ID,
    firestore: {
      ...firestoreEmulatorAddress(),
      rules: readFileSync(rulesPath, "utf8"),
    },
  });

  // Seed real documents with the Admin-style bypass so denials below prove
  // rule enforcement rather than merely missing data.
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = clientDb(context);
    for (const identity of identityStates) {
      await setDoc(doc(db, "learningProfiles", identity.uid), {
        schemaVersion: 1,
        seeded: true,
      });
      await setDoc(doc(db, "learningProfiles", identity.uid, "attempts", "attempt-1"), {
        seeded: true,
      });
    }
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

describe("emulator isolation", () => {
  it("runs against an explicit demo project so real Firebase is unreachable", () => {
    expect(DEMO_PROJECT_ID).toMatch(/^demo-/);
    expect(process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080").not.toContain(
      "googleapis.com",
    );
  });

  it("seeded learning data exists when rules are bypassed", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const snapshot = await getDoc(
        doc(clientDb(context), "learningProfiles", "uid-verified-password"),
      );
      expect(snapshot.exists()).toBe(true);
    });
  });
});

describe("guest (unauthenticated) browser access", () => {
  it("cannot read, list, write, or delete learning data", async () => {
    const db = clientDb(testEnv.unauthenticatedContext());

    await assertFails(getDoc(doc(db, "learningProfiles", "uid-verified-password")));
    await assertFails(getDocs(collection(db, "learningProfiles")));
    await assertFails(
      setDoc(doc(db, "learningProfiles", "uid-guest-probe"), { forged: true }),
    );
    await assertFails(deleteDoc(doc(db, "learningProfiles", "uid-verified-password")));
  });
});

describe("authenticated direct browser access is denied for every identity state", () => {
  for (const identity of identityStates) {
    it(`denies the ${identity.name} even on their own UID`, async () => {
      const db = clientDb(testEnv.authenticatedContext(identity.uid, identity.claims));

      await assertFails(getDoc(doc(db, "learningProfiles", identity.uid)));
      await assertFails(
        setDoc(doc(db, "learningProfiles", identity.uid), { forgedMastery: true }),
      );
      await assertFails(
        getDocs(collection(db, "learningProfiles", identity.uid, "attempts")),
      );
      await assertFails(
        setDoc(doc(db, "learningProfiles", identity.uid, "attempts", "attempt-2"), {
          forged: true,
        }),
      );
      await assertFails(deleteDoc(doc(db, "learningProfiles", identity.uid)));
    });
  }

  it("denies cross-user access as well", async () => {
    const db = clientDb(
      testEnv.authenticatedContext("uid-google", identityStates[2].claims),
    );

    await assertFails(getDoc(doc(db, "learningProfiles", "uid-verified-password")));
    await assertFails(
      setDoc(doc(db, "learningProfiles", "uid-verified-password"), { tampered: true }),
    );
  });

  it("denies access after sign-out (unauthenticated again)", async () => {
    const db = clientDb(testEnv.unauthenticatedContext());
    await assertFails(getDoc(doc(db, "learningProfiles", "uid-google")));
  });

  it("keeps rule-bypassed seeding usable for future server-owned tests", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await assertSucceeds(
        getDoc(doc(clientDb(context), "learningProfiles", "uid-google")),
      );
    });
  });
});
