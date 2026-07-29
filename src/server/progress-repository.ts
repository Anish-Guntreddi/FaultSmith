import "server-only";

import { z } from "zod";

import {
  attemptSummarySchema,
  emptyLearnerProfile,
  MAX_COMPLETION_TIMESTAMP,
  PROGRESS_PROFILE_VERSION,
  toLocalImportAttempts,
  type AttemptSummary,
  type LearnerProfile,
  type ProgressSnapshot,
} from "@/lib/progress-contracts";
import {
  mergeLearnerProfiles,
  parseLearnerProfile,
  recordProfileAttempt,
} from "@/lib/progress-merge";
import { CloudUnavailableError, getAdminFirestore } from "./firebase-admin";
import type { VerifiedIdentity } from "./firebase-identity";

/**
 * Server-only bounded progress repository.
 *
 * Every method accepts the verified identity wrapper — never a raw client
 * string — and constructs the fixed Firestore path internally, so no client
 * value can ever select another user's document. All storage failures
 * collapse into {@link CloudUnavailableError} without logging any UID,
 * document path, DTO, or provider response.
 */

export const PROGRESS_COLLECTION = "learningProfiles";

export type StoreMutation<T> = {
  result: T;
  write?: Record<string, unknown>;
  remove?: boolean;
};

/**
 * Minimal transactional document store seam. The production implementation
 * runs a Firestore transaction; tests provide an in-memory fake.
 */
export interface ProgressStore {
  run<T>(uid: string, mutate: (current: unknown) => StoreMutation<T>): Promise<T>;
}

/** Production store backed by the lazy Admin Firestore handle. */
export function createFirestoreProgressStore(): ProgressStore {
  return {
    async run(uid, mutate) {
      try {
        const db = await getAdminFirestore();
        return await db.runTransaction(async (transaction) => {
          const reference = db.collection(PROGRESS_COLLECTION).doc(uid);
          const snapshot = await transaction.get(reference);
          const mutation = mutate(snapshot.exists ? snapshot.data() : null);
          if (mutation.remove) transaction.delete(reference);
          else if (mutation.write) transaction.set(reference, mutation.write);
          return mutation.result;
        });
      } catch {
        throw new CloudUnavailableError();
      }
    },
  };
}

const importMarkerSchema = z.number().int().min(0).max(MAX_COMPLETION_TIMESTAMP);

type ParsedCloudDocument = {
  profile: LearnerProfile;
  localImportedAt: number | null;
};

/**
 * Strict-but-tolerant DTO read: the container fields are validated, the
 * profile entries are validated individually (tampered records drop
 * deterministically), and anything unrecognizable degrades to the empty
 * profile instead of failing the request.
 */
function parseCloudDocument(raw: unknown): ParsedCloudDocument {
  if (typeof raw !== "object" || raw === null) {
    return { profile: emptyLearnerProfile, localImportedAt: null };
  }
  const record = raw as Record<string, unknown>;
  const marker = importMarkerSchema.safeParse(record.localImportedAt);
  return {
    profile: parseLearnerProfile(record.profile),
    localImportedAt: marker.success ? marker.data : null,
  };
}

function toCloudDocument(
  profile: LearnerProfile,
  localImportedAt: number | null,
  updatedAt: number,
): Record<string, unknown> {
  return { schemaVersion: 1, profile, localImportedAt, updatedAt };
}

function boundedTimestamp(now: () => number): number {
  const value = now();
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(Math.floor(value), MAX_COMPLETION_TIMESTAMP);
}

export type ImportOutcome =
  | { imported: true; snapshot: ProgressSnapshot }
  | { imported: false; reason: "already_imported" };

export interface ProgressRepository {
  readProfile(identity: VerifiedIdentity): Promise<ProgressSnapshot>;
  importProfile(identity: VerifiedIdentity, profile: LearnerProfile): Promise<ImportOutcome>;
  recordAttempt(identity: VerifiedIdentity, attempt: AttemptSummary): Promise<ProgressSnapshot>;
  deleteProfile(identity: VerifiedIdentity): Promise<void>;
}

export function createProgressRepository(
  store: ProgressStore,
  now: () => number = Date.now,
): ProgressRepository {
  return {
    async readProfile(identity) {
      return store.run(identity.uid, (current) => {
        const state = parseCloudDocument(current);
        return {
          result: {
            profile: state.profile,
            localImportCompleted: state.localImportedAt !== null,
          },
        };
      });
    },

    /**
     * Bounded one-time monotonic import. Imported attempts are re-tagged
     * `local_import` regardless of claimed provenance, merge is monotonic
     * (a completed lesson can never be un-completed), and a second import
     * is refused so local history cannot be replayed into the cloud.
     */
    async importProfile(identity, profile) {
      const timestamp = boundedTimestamp(now);
      return store.run<ImportOutcome>(identity.uid, (current): StoreMutation<ImportOutcome> => {
        const state = parseCloudDocument(current);
        if (state.localImportedAt !== null) {
          return { result: { imported: false, reason: "already_imported" } };
        }
        const imported: LearnerProfile = {
          version: PROGRESS_PROFILE_VERSION,
          completions: parseLearnerProfile(profile).completions,
          attempts: toLocalImportAttempts(profile.attempts),
        };
        const merged = mergeLearnerProfiles(state.profile, imported);
        return {
          result: {
            imported: true,
            snapshot: { profile: merged, localImportCompleted: true },
          },
          write: toCloudDocument(merged, timestamp, timestamp),
        };
      });
    },

    /**
     * Deterministic assessment persistence. Idempotency-identifier collisions
     * replace the existing record (replaying an identical assessment creates
     * one attempt), retention is capped at 50 with explicit oldest deletion,
     * and the monotonic completion record advances only for verified guided
     * attempts — a failing assessment can never complete a lesson.
     */
    async recordAttempt(identity, attempt) {
      const parsed = attemptSummarySchema.safeParse(attempt);
      if (!parsed.success) throw new CloudUnavailableError();
      const timestamp = boundedTimestamp(now);
      return store.run(identity.uid, (current) => {
        const state = parseCloudDocument(current);
        const next = recordProfileAttempt(state.profile, parsed.data);
        return {
          result: {
            profile: next,
            localImportCompleted: state.localImportedAt !== null,
          },
          write: toCloudDocument(next, state.localImportedAt, timestamp),
        };
      });
    },

    /** Same-user data deletion: removes the learner's single fixed document. */
    async deleteProfile(identity) {
      await store.run(identity.uid, () => ({ result: undefined, remove: true }));
    },
  };
}
