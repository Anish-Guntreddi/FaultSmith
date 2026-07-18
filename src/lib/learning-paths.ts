import { z } from "zod";

import type { Difficulty, ProjectId } from "./contracts";

export const learningStepIds = [
  "evidence-boundaries",
  "evidence-booleans",
  "evidence-validation",
  "behavior-rules",
  "behavior-fallbacks",
  "behavior-idempotency",
  "systems-authorization",
  "systems-transitions",
  "systems-data-validation",
] as const;

export const learningStepIdSchema = z.enum(learningStepIds);
export type LearningStepId = z.infer<typeof learningStepIdSchema>;

export type LearningStep = {
  id: LearningStepId;
  order: number;
  phaseId: "read-evidence" | "reason-behavior" | "defend-systems";
  title: string;
  category: string;
  projectId: ProjectId;
  targetSkill: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  conceptGuide: string;
  investigationChecklist: [string, string, string];
  successSignal: string;
};

export type LearningPhase = {
  id: LearningStep["phaseId"];
  order: number;
  title: string;
  description: string;
  steps: LearningStep[];
};

export const learningPhases: LearningPhase[] = [
  {
    id: "read-evidence",
    order: 1,
    title: "Read the evidence",
    description: "Learn to reproduce a failure, inspect its edges, and form a testable hypothesis before editing.",
    steps: [
      {
        id: "evidence-boundaries",
        order: 1,
        phaseId: "read-evidence",
        title: "Find the failing boundary",
        category: "Business logic",
        projectId: "expense-approval",
        targetSkill: "Boundary conditions",
        difficulty: "beginner",
        estimatedMinutes: 8,
        conceptGuide: "Boundary bugs hide where a rule changes state. Compare the failing input with the closest passing values before deciding what the code should do.",
        investigationChecklist: [
          "Read the named failing test and expected behavior.",
          "Compare the nearest inputs on both sides of the boundary.",
          "Write a causal hypothesis before changing the condition.",
        ],
        successSignal: "You can explain why one edge value behaves differently and repair only that policy boundary.",
      },
      {
        id: "evidence-booleans",
        order: 2,
        phaseId: "read-evidence",
        title: "Trace a Boolean decision",
        category: "Decision logic",
        projectId: "notifications",
        targetSkill: "Boolean logic",
        difficulty: "beginner",
        estimatedMinutes: 10,
        conceptGuide: "Boolean expressions compress several cases into one line. Expand the condition into concrete true and false examples before editing it.",
        investigationChecklist: [
          "List the cases represented by each side of the expression.",
          "Trace the failing case without simplifying it mentally.",
          "Check that the repair preserves the neighboring cases.",
        ],
        successSignal: "You can connect a failing case to the exact decision branch without guessing from the output alone.",
      },
      {
        id: "evidence-validation",
        order: 3,
        phaseId: "read-evidence",
        title: "Test an input boundary",
        category: "State management",
        projectId: "inventory",
        targetSkill: "Defensive validation",
        difficulty: "beginner",
        estimatedMinutes: 10,
        conceptGuide: "Validation protects the assumptions used by later code. Identify the smallest invalid value and confirm whether it is rejected before following downstream symptoms.",
        investigationChecklist: [
          "Separate valid, edge, and invalid input classes.",
          "Locate the first point where the contract should reject input.",
          "Verify that valid inputs remain unchanged after the repair.",
        ],
        successSignal: "You can repair the validation boundary without changing normal inventory behavior.",
      },
    ],
  },
  {
    id: "reason-behavior",
    order: 2,
    title: "Reason about behavior",
    description: "Translate written rules, defaults, and repeat requests into explicit program behavior.",
    steps: [
      {
        id: "behavior-rules",
        order: 4,
        phaseId: "reason-behavior",
        title: "Translate a business rule",
        category: "Business logic",
        projectId: "expense-approval",
        targetSkill: "Business-rule interpretation",
        difficulty: "intermediate",
        estimatedMinutes: 10,
        conceptGuide: "A test can pass while the implementation still violates the written policy. Treat documentation, examples, and tests as evidence that must agree.",
        investigationChecklist: [
          "Rewrite the policy as concrete input-output examples.",
          "Compare those examples with both tests and implementation.",
          "Choose the smallest change that restores agreement.",
        ],
        successSignal: "You can justify the repair from the stated policy rather than from a memorized code pattern.",
      },
      {
        id: "behavior-fallbacks",
        order: 5,
        phaseId: "reason-behavior",
        title: "Preserve explicit intent",
        category: "Decision logic",
        projectId: "notifications",
        targetSkill: "Fallback behavior",
        difficulty: "intermediate",
        estimatedMinutes: 10,
        conceptGuide: "Fallbacks should handle missing information, not overwrite an explicit choice. Track the difference between absent, false, empty, and invalid values.",
        investigationChecklist: [
          "Identify which value means no choice was supplied.",
          "Trace how explicit false-like values move through the fallback.",
          "Confirm that the default applies only to the missing case.",
        ],
        successSignal: "You can preserve a user's explicit preference while retaining the documented default behavior.",
      },
      {
        id: "behavior-idempotency",
        order: 6,
        phaseId: "reason-behavior",
        title: "Handle a repeated request",
        category: "State management",
        projectId: "inventory",
        targetSkill: "Idempotency",
        difficulty: "intermediate",
        estimatedMinutes: 12,
        conceptGuide: "Retries are normal in distributed systems. An idempotent operation recognizes work it has already applied and avoids changing state twice.",
        investigationChecklist: [
          "Compare state before and after the first request.",
          "Trace the same request identifier through the retry path.",
          "Verify that new requests still perform the intended transition.",
        ],
        successSignal: "You can stop a duplicate state change without preventing a legitimate new reservation.",
      },
    ],
  },
  {
    id: "defend-systems",
    order: 3,
    title: "Defend real systems",
    description: "Debug authorization, lifecycle, and invalid-data failures where a plausible patch can create a second defect.",
    steps: [
      {
        id: "systems-authorization",
        order: 7,
        phaseId: "defend-systems",
        title: "Audit an authorization branch",
        category: "Business logic",
        projectId: "expense-approval",
        targetSkill: "Authorization logic",
        difficulty: "advanced",
        estimatedMinutes: 12,
        conceptGuide: "Authorization logic combines identity and resource conditions. Test each condition independently and then together so a permissive branch cannot hide inside a passing happy path.",
        investigationChecklist: [
          "Enumerate allowed and denied role-amount combinations.",
          "Trace which condition grants access in the failing case.",
          "Check that the repair does not deny the intended privileged case.",
        ],
        successSignal: "You can explain both the unauthorized path and the legitimate path preserved by the repair.",
      },
      {
        id: "systems-transitions",
        order: 8,
        phaseId: "defend-systems",
        title: "Protect a state transition",
        category: "State management",
        projectId: "inventory",
        targetSkill: "State transitions",
        difficulty: "advanced",
        estimatedMinutes: 12,
        conceptGuide: "Lifecycle bugs appear when an operation is accepted from the wrong prior state. Model the allowed transition before inspecting the conditional that enforces it.",
        investigationChecklist: [
          "Name the valid source and destination states.",
          "Test already-completed and never-started states separately.",
          "Keep rejection behavior explicit for every invalid transition.",
        ],
        successSignal: "You can restore the intended lifecycle edge without broadening the accepted state set.",
      },
      {
        id: "systems-data-validation",
        order: 9,
        phaseId: "defend-systems",
        title: "Reject unknown data",
        category: "Decision logic",
        projectId: "notifications",
        targetSkill: "Data validation",
        difficulty: "advanced",
        estimatedMinutes: 12,
        conceptGuide: "Silently normalizing unsupported data can conceal integration failures. Decide whether the contract permits coercion, a default, or an explicit error before changing the branch.",
        investigationChecklist: [
          "Compare supported values with the failing unknown value.",
          "Find where invalid input becomes an apparently valid result.",
          "Verify that every documented value still passes unchanged.",
        ],
        successSignal: "You can make invalid data fail visibly without disrupting supported notification channels.",
      },
    ],
  },
];

export const learningSteps = learningPhases.flatMap((phase) => phase.steps);

const completionSchema = z
  .object({
    stepId: learningStepIdSchema,
    completedAt: z.number().int().nonnegative(),
    overallScore: z.number().int().min(0).max(100),
    hintsUsed: z.number().int().min(0).max(3),
    testRuns: z.number().int().min(0).max(100),
  })
  .strict();

const progressContainerSchema = z
  .object({
    version: z.literal(1),
    completions: z.array(z.unknown()).max(50),
  })
  .strict();

export type LearningCompletion = z.infer<typeof completionSchema>;
export type LearningProgress = {
  version: 1;
  completions: LearningCompletion[];
};

export const emptyLearningProgress: LearningProgress = { version: 1, completions: [] };

export function getLearningStep(stepId: string | null | undefined) {
  return learningSteps.find((step) => step.id === stepId);
}

export function parseLearningProgress(value: unknown): LearningProgress {
  const container = progressContainerSchema.safeParse(value);
  if (!container.success) return emptyLearningProgress;

  const byStep = new Map<LearningStepId, LearningCompletion>();
  for (const candidate of container.data.completions) {
    const completion = completionSchema.safeParse(candidate);
    if (!completion.success) continue;
    const current = byStep.get(completion.data.stepId);
    if (!current || completion.data.completedAt >= current.completedAt) {
      byStep.set(completion.data.stepId, completion.data);
    }
  }

  return {
    version: 1,
    completions: [...byStep.values()].sort((left, right) => left.completedAt - right.completedAt),
  };
}

export function recordLearningCompletion(
  progress: LearningProgress,
  completion: LearningCompletion,
): LearningProgress {
  const parsedProgress = parseLearningProgress(progress);
  const parsedCompletion = completionSchema.safeParse(completion);
  if (!parsedCompletion.success) return parsedProgress;

  return {
    version: 1,
    completions: [
      ...parsedProgress.completions.filter((item) => item.stepId !== parsedCompletion.data.stepId),
      parsedCompletion.data,
    ].slice(-learningSteps.length),
  };
}

export function isLearningStepCompleted(progress: LearningProgress, stepId: LearningStepId) {
  return progress.completions.some((completion) => completion.stepId === stepId);
}

export function isLearningStepUnlocked(progress: LearningProgress, stepId: LearningStepId) {
  const index = learningSteps.findIndex((step) => step.id === stepId);
  if (index <= 0) return index === 0;
  return isLearningStepCompleted(progress, learningSteps[index - 1].id);
}

export function getLearningRecommendation(progress: LearningProgress) {
  const parsed = parseLearningProgress(progress);
  const lastCompletion = parsed.completions.at(-1);
  if (lastCompletion && (lastCompletion.overallScore < 80 || lastCompletion.hintsUsed > 1)) {
    return {
      kind: "reinforce" as const,
      step: getLearningStep(lastCompletion.stepId) ?? learningSteps[0],
      reason: "Reinforce this skill with fewer hints before relying on it in a larger system.",
    };
  }

  const nextStep = learningSteps.find((step) => !isLearningStepCompleted(parsed, step.id));
  if (nextStep) {
    return {
      kind: "next" as const,
      step: nextStep,
      reason: nextStep.order === 1
        ? "Start with a small, visible boundary failure and practice reasoning before editing."
        : "Continue to the next unlocked debugging concept in the evidence-first roadmap.",
    };
  }

  return {
    kind: "catalog" as const,
    step: null,
    reason: "Roadmap complete. Use Practice by skill for advanced variants and live generated challenges.",
  };
}
