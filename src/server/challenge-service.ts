import "server-only";

import { publicChallengeSchema, type Difficulty, type PublicChallenge } from "@/lib/contracts";
import type { TestResult } from "@/lib/contracts";
import { runFixtureTests } from "./fixture-runner";
import { selectFixture, withRequestedDifficulty, type ChallengeFixture } from "./fixtures";

export function toPublicChallenge(
  fixture: ChallengeFixture,
  options: {
    difficulty?: Difficulty;
    source: "generated" | "prevalidated";
    fallbackReason?: string;
    initialTestResult?: TestResult;
  },
): PublicChallenge {
  const selected = options.difficulty
    ? withRequestedDifficulty(fixture, options.difficulty)
    : fixture;
  const initialTestResult =
    options.initialTestResult ?? runFixtureTests(selected, selected.mutatedFiles);

  return publicChallengeSchema.parse({
    challengeId: selected.challengeId,
    projectId: selected.projectId,
    title: selected.title,
    targetSkill: selected.targetSkill,
    difficulty: selected.difficulty,
    learningObjective: selected.learningObjective,
    learnerBrief: selected.learnerBrief,
    files: selected.visibleFiles,
    allowedFiles: selected.allowedFiles,
    expectedFailureTests: selected.expectedFailureTests,
    initialTestResult,
    availableHintCount: 3,
    source: options.source,
    fallbackReason: options.fallbackReason,
  });
}

export function getPrevalidatedChallenge(
  projectId: ChallengeFixture["projectId"],
  targetSkill: string,
  difficulty: Difficulty,
  fallbackReason?: string,
) {
  const fixture = selectFixture(projectId, targetSkill);
  if (!fixture) return null;

  return toPublicChallenge(fixture, {
    difficulty,
    source: "prevalidated",
    fallbackReason,
  });
}
