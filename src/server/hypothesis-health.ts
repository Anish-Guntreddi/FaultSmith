import "server-only";

/**
 * Process-scoped rejection signal for the hypothesis coach (design spec
 * section 3.4: "Rejections increment a counter exposed only as an
 * aggregate boolean in health output — never the content."). Deliberately
 * exposes only a rolling boolean, never a count, a timestamp precise
 * enough to correlate with a specific request, or any matched content —
 * so this signal can never itself become a side channel for the leak it's
 * reporting on.
 */

const ROLLING_WINDOW_MS = 10 * 60 * 1000;

let lastRejectionAt: number | null = null;

/** Called whenever `assertNoLeak` (or the semantic classifier) rejects a
 * live-model candidate before it can reach the learner. */
export function recordContainmentRejection() {
  lastRejectionAt = Date.now();
}

/** True while a rejection happened within the rolling window. */
export function hasRecentContainmentRejection(): boolean {
  if (lastRejectionAt === null) return false;
  return Date.now() - lastRejectionAt <= ROLLING_WINDOW_MS;
}

/** Test-only reset so specs don't leak rejection state into each other. */
export function resetContainmentRejectionSignal() {
  lastRejectionAt = null;
}
