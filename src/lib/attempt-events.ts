import { z } from "zod";

export const attemptEventNameSchema = z.enum([
  "project_selected",
  "generation_started",
  "generation_succeeded",
  "generation_failed",
  "validation_succeeded",
  "validation_failed",
  "test_run_completed",
  "hint_requested",
  "patch_submitted",
  "challenge_verified",
  "challenge_not_verified",
  "challenge_reset",
]);
export type AttemptEventName = z.infer<typeof attemptEventNameSchema>;

export const anonymousAttemptEventSchema = z
  .object({
    name: attemptEventNameSchema,
    occurredAt: z.number().int().nonnegative(),
    projectId: z.enum(["expense-approval", "inventory", "notifications"]).optional(),
    challengeId: z.string().min(1).max(100).optional(),
    source: z.enum(["generated", "prevalidated"]).optional(),
    outcome: z.string().min(1).max(40).optional(),
  })
  .strict();
export type AnonymousAttemptEvent = z.infer<typeof anonymousAttemptEventSchema>;

export function appendAnonymousAttemptEvent(
  existing: unknown,
  event: Omit<AnonymousAttemptEvent, "occurredAt">,
  occurredAt = Date.now(),
) {
  const history = Array.isArray(existing)
    ? existing.flatMap((candidate) => {
        const parsed = anonymousAttemptEventSchema.safeParse(candidate);
        return parsed.success ? [parsed.data] : [];
      })
    : [];
  const next = anonymousAttemptEventSchema.parse({ ...event, occurredAt });
  return [...history.slice(-99), next];
}
