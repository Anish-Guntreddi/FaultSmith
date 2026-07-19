import "server-only";

import { createHash } from "node:crypto";

import type { AssessmentResponse, CloudSyncStatus } from "@/lib/contracts";
import { learningSteps } from "@/lib/learning-paths";
import {
  deriveAttemptSummary,
  MAX_COMPLETION_TIMESTAMP,
  toDurationBucket,
  type AttemptSummary,
  type LearnerProfile,
  type ProgressSnapshot,
} from "@/lib/progress-contracts";
import { verifyRequestIdentity, type TokenVerifier } from "./firebase-identity";
import { getFixture } from "./fixtures";
import {
  createFirestoreProgressStore,
  createProgressRepository,
  type ProgressStore,
} from "./progress-repository";

/**
 * Server-only progress service: the single seam between authenticated HTTP
 * routes and the bounded Firestore repository. Identity always comes from the
 * verified token wrapper; challenge, lesson, skill, and difficulty always come
 * from the server-side registries — never from a progress-write client.
 */

export interface ProgressServiceDeps {
  verifyToken?: TokenVerifier;
  store?: ProgressStore;
  now?: () => number;
}

export type ProgressAccess<T> =
  | { kind: "ok"; value: T }
  | { kind: "unauthorized" }
  | { kind: "unavailable" };

export type ProgressImportAccess = ProgressAccess<ProgressSnapshot> | { kind: "already_imported" };

function denied(reason: string): { kind: "unauthorized" } | { kind: "unavailable" } {
  return reason === "unavailable" ? { kind: "unavailable" } : { kind: "unauthorized" };
}

function boundedTimestamp(now: () => number): number {
  const value = now();
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(Math.floor(value), MAX_COMPLETION_TIMESTAMP);
}

/**
 * Map a challenge identifier to its approved lesson using only server-side
 * registries. Every curated fixture's project/skill pair identifies at most
 * one lesson; the lesson's registry difficulty is authoritative for the
 * stored summary. The client can never substitute a lesson, skill, or step.
 */
export function deriveLessonBinding(challengeId: string) {
  const fixture = getFixture(challengeId);
  if (!fixture) return null;
  const step =
    learningSteps.find(
      (candidate) =>
        candidate.projectId === fixture.projectId &&
        candidate.targetSkill === fixture.targetSkill,
    ) ?? null;
  return {
    projectId: fixture.projectId,
    skill: fixture.targetSkill,
    difficulty: step ? step.difficulty : fixture.difficulty,
    lessonId: step ? step.id : null,
  };
}

/**
 * Derive the bounded server-verified attempt summary for a completed
 * deterministic assessment. The SHA-256 idempotency identifier is computed
 * from the internal UID and the bounded numeric outcome only — it stores no
 * learner content (no source, hypothesis, explanation, or prose), and an
 * identical replayed assessment always produces the same identifier.
 */
export function deriveServerAttemptSummary(
  uid: string,
  challengeId: string,
  response: AssessmentResponse,
  completedAt: number,
): AttemptSummary | null {
  const binding = deriveLessonBinding(challengeId);
  if (!binding) return null;

  const idempotencyMaterial = JSON.stringify([
    1,
    uid,
    binding.lessonId,
    binding.projectId,
    binding.skill,
    binding.difficulty,
    response.assessment.completionStatus,
    response.assessment.rootCauseScore,
    response.assessment.reasoningScore,
    response.assessment.patchDisciplineScore,
    response.assessment.conceptUnderstandingScore,
    response.hintsUsed,
    response.testRuns,
    response.changedLines,
    toDurationBucket(response.elapsedSeconds),
  ]);
  const attemptId = createHash("sha256").update(idempotencyMaterial).digest("hex");

  return deriveAttemptSummary({
    attemptId,
    lessonId: binding.lessonId,
    projectId: binding.projectId,
    skill: binding.skill,
    difficulty: binding.difficulty,
    // The deterministic assessment authority is the prevalidated fixture
    // boundary; the server never accepts a challenge source from the client.
    challengeSource: "prevalidated",
    completedAt,
    response,
  });
}

export function createProgressService(deps: ProgressServiceDeps = {}) {
  const now = deps.now ?? Date.now;
  const repository = createProgressRepository(deps.store ?? createFirestoreProgressStore(), now);
  const authorize = (request: Request) =>
    verifyRequestIdentity(request, { verifyToken: deps.verifyToken });

  return {
    async readProfile(request: Request): Promise<ProgressAccess<ProgressSnapshot>> {
      const identity = await authorize(request);
      if (!identity.ok) return denied(identity.reason);
      try {
        return { kind: "ok", value: await repository.readProfile(identity.identity) };
      } catch {
        return { kind: "unavailable" };
      }
    },

    async importProfile(request: Request, profile: LearnerProfile): Promise<ProgressImportAccess> {
      const identity = await authorize(request);
      if (!identity.ok) return denied(identity.reason);
      try {
        const outcome = await repository.importProfile(identity.identity, profile);
        if (!outcome.imported) return { kind: "already_imported" };
        return { kind: "ok", value: outcome.snapshot };
      } catch {
        return { kind: "unavailable" };
      }
    },

    async deleteProfile(request: Request): Promise<ProgressAccess<{ deleted: true }>> {
      const identity = await authorize(request);
      if (!identity.ok) return denied(identity.reason);
      try {
        await repository.deleteProfile(identity.identity);
        return { kind: "ok", value: { deleted: true } };
      } catch {
        return { kind: "unavailable" };
      }
    },

    /**
     * Persist the authoritative assessment outcome for an optional identity.
     *
     * The deterministic assessment has already decided the exact response
     * before this hook runs; nothing here can alter completion or test
     * authority, and this method never throws:
     * - no Authorization header → `local_only`, nothing written
     * - invalid or unverified identity → `unauthorized`, nothing written
     * - identity/persistence infrastructure down → `cloud_unavailable`
     * - verified identity and successful write → `cloud_saved`
     */
    async syncAssessment(
      request: Request,
      challengeId: string,
      response: AssessmentResponse,
    ): Promise<CloudSyncStatus> {
      try {
        if (!request.headers.has("authorization")) return "local_only";
        const identity = await authorize(request);
        if (!identity.ok) {
          return identity.reason === "unavailable" ? "cloud_unavailable" : "unauthorized";
        }
        const summary = deriveServerAttemptSummary(
          identity.identity.uid,
          challengeId,
          response,
          boundedTimestamp(now),
        );
        if (!summary) return "cloud_unavailable";
        await repository.recordAttempt(identity.identity, summary);
        return "cloud_saved";
      } catch {
        return "cloud_unavailable";
      }
    },
  };
}

export type ProgressService = ReturnType<typeof createProgressService>;

/** Default production wiring: verified Firebase identity + Firestore store. */
export function getDefaultProgressService(): ProgressService {
  return createProgressService();
}
