"use client";

import type { CSSProperties } from "react";

import { ProgressSyncPanel, type CloudProgressSync } from "@/components/progress-sync";
import { Badge, Button, Card, StatusDot } from "@/components/ui";
import { getLearningStep, type LearningStep } from "@/lib/learning-paths";
import {
  durationBucketLabels,
  type AttemptSummary,
  type LearnerProfile,
} from "@/lib/progress-contracts";
import {
  getIndependentSolveRate,
  getPhaseProgress,
  getProfileRecommendation,
  getRecentAttempts,
  getReinforcementPriority,
  getStrongestPracticedSkill,
  getTestRunEvidence,
  getVerifiedScoreAverages,
  TOTAL_LESSON_COUNT,
} from "@/lib/progress-metrics";

type ProgressDashboardProps = {
  profile: LearnerProfile;
  onStartStep: (step: LearningStep) => void;
  sync: CloudProgressSync;
};

function EvidenceBar({ value, tone = "amber" }: { value: number; tone?: "amber" | "emerald" }) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <div aria-hidden="true" className="block-meter mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
      <div
        className={`progress-fill h-full rounded-full ${tone === "emerald" ? "bg-gradient-to-r from-cyan-300/70 to-emerald-400/80" : "bg-gradient-to-r from-amber-300/80 to-amber-500/70"}`}
        style={{ "--progress": width / 100 } as CSSProperties}
      />
    </div>
  );
}

function attemptTitle(attempt: AttemptSummary) {
  if (attempt.lessonId) {
    const step = getLearningStep(attempt.lessonId);
    if (step) return `Lesson ${step.order}: ${step.title}`;
  }
  return `Skill practice: ${attempt.skill}`;
}

export function ProgressDashboard({ profile, onStartStep, sync }: ProgressDashboardProps) {
  const completedCount = profile.completions.length;
  const phaseProgress = getPhaseProgress(profile);
  const averages = getVerifiedScoreAverages(profile);
  const independent = getIndependentSolveRate(profile);
  const testRunEvidence = getTestRunEvidence(profile);
  const strongestSkill = getStrongestPracticedSkill(profile);
  const reinforcement = getReinforcementPriority(profile);
  const recentAttempts = getRecentAttempts(profile, 5);
  const recommendation = getProfileRecommendation(profile);
  const recommendedStep = recommendation.step;
  const isEmpty = completedCount === 0 && profile.attempts.length === 0;
  const roadmapComplete = completedCount === TOTAL_LESSON_COUNT;
  // Completions (LEARNING_PROGRESS_KEY) and attempt history
  // (ATTEMPT_HISTORY_KEY) are two independently-written, independently-gated
  // local records — the attempt-history write is explicit best-effort
  // evidence and can be skipped or lost while a completion still lands. When
  // that happens, "Roadmap evidence" already shows verified lessons while
  // the attempt-derived cards below would otherwise fall back to the
  // generic "appears after your first verified repair" copy — a direct,
  // visible contradiction next to a completed-lesson count. Use a specific
  // explanatory state instead whenever completions exist without matching
  // attempt evidence.
  const hasUnexplainedCompletions = completedCount > 0;
  const missingAttemptEvidenceCopy =
    "Some evidence details aren't available for earlier attempts — this device has verified lesson completions, but no matching attempt-history record for them.";

  const scoreCards = averages
    ? ([
        ["Root-cause accuracy", averages.rootCause],
        ["Causal reasoning", averages.reasoning],
        ["Patch discipline", averages.patchDiscipline],
        ["Concept understanding", averages.conceptUnderstanding],
      ] as const)
    : null;

  return (
    <section aria-labelledby="my-progress-heading" className="motion-rise">
      <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="instrument-label">Personal practice evidence</div>
          <h2 id="my-progress-heading" className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] text-white">My Progress</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            {sync.phase === "synced"
              ? "Practice evidence — not a certification. Every number below comes from verified lab evidence on this device and in your account."
              : "Practice evidence — not a certification. Every number below comes from verified lab evidence stored only in this browser."}
          </p>
        </div>
        <span role="status" className="status-pill w-fit px-3 py-1.5">
          <StatusDot
            tone={sync.phase === "synced" ? "verified" : sync.phase === "degraded" ? "failure" : "investigation"}
            size="sm"
          />
          {sync.storageLabel}
        </span>
      </div>

      <ProgressSyncPanel sync={sync} />

      {isEmpty && (
        <Card variant="raised" padding="lg" className="mb-5">
          <div className="instrument-label text-amber-300">No local progress yet</div>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Complete your first guided lab to build personal evidence you can see here. Progress records only when a repair is verified by executed tests.
          </p>
        </Card>
      )}

      {roadmapComplete && (
        <Card variant="panel" padding="lg" className="mb-5 border-emerald-400/15">
          <div className="instrument-label text-emerald-300">Roadmap complete</div>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            All nine lessons are verified on this device. Use Practice by skill for advanced variants and live generated challenges.
          </p>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card as="section" aria-labelledby="progress-roadmap-heading" variant="panel" padding="lg">
          <h3 id="progress-roadmap-heading" className="instrument-label">Roadmap evidence</h3>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-instrument tabular-nums text-4xl font-semibold text-white">{completedCount}</span>
            <span className="text-sm text-zinc-500">/ {TOTAL_LESSON_COUNT} lessons verified</span>
          </div>
          <EvidenceBar value={(completedCount / TOTAL_LESSON_COUNT) * 100} tone="emerald" />
          <ul className="mt-5 space-y-3">
            {phaseProgress.map((phase) => (
              <Card as="li" key={phase.phaseId} variant="evidence-well" padding="sm">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate text-zinc-300">{phase.order}. {phase.title}</span>
                  <span className={`font-instrument tabular-nums shrink-0 ${phase.complete ? "font-semibold text-emerald-300" : "text-zinc-500"}`}>
                    {phase.completedLessons}/{phase.totalLessons}{phase.complete ? " · Complete" : ""}
                  </span>
                </div>
                <EvidenceBar value={(phase.completedLessons / phase.totalLessons) * 100} tone={phase.complete ? "emerald" : "amber"} />
              </Card>
            ))}
          </ul>
        </Card>

        <div className="min-w-0 space-y-4">
          <Card as="section" aria-labelledby="progress-scores-heading" variant="panel" padding="lg">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id="progress-scores-heading" className="instrument-label">Verified score dimensions</h3>
              {averages && (
                <span className="text-[10px] text-zinc-600">
                  Average across {averages.sampleSize} verified lab{averages.sampleSize === 1 ? "" : "s"}
                </span>
              )}
            </div>
            {scoreCards ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {scoreCards.map(([label, score]) => (
                  <Card key={label} variant="evidence-well" padding="md">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-zinc-400">{label}</span>
                      <span className="font-instrument tabular-nums text-sm font-semibold text-zinc-100">{score}</span>
                    </div>
                    <EvidenceBar value={score} />
                  </Card>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-xs leading-5 text-zinc-500">
                {hasUnexplainedCompletions
                  ? missingAttemptEvidenceCopy
                  : "Verified score averages appear after your first verified repair. Failing attempts stay visible below as process evidence only."}
              </p>
            )}
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card as="section" aria-labelledby="progress-independent-heading" variant="panel" padding="lg">
              <h3 id="progress-independent-heading" className="instrument-label">Independent solves</h3>
              {independent ? (
                <>
                  <div className="font-instrument tabular-nums mt-3 text-2xl font-semibold text-white">{independent.rate}%</div>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    {independent.independentSolves} of {independent.verifiedAttempts} verified repair{independent.verifiedAttempts === 1 ? "" : "s"} used no hints.
                  </p>
                  <EvidenceBar value={independent.rate} tone="emerald" />
                </>
              ) : (
                <p className="mt-3 text-xs leading-5 text-zinc-500">
                  {hasUnexplainedCompletions ? missingAttemptEvidenceCopy : "Appears after your first verified repair."}
                </p>
              )}
            </Card>

            <Card as="section" aria-labelledby="progress-testruns-heading" variant="panel" padding="lg">
              <h3 id="progress-testruns-heading" className="instrument-label">Test-run process evidence</h3>
              {testRunEvidence ? (
                <>
                  <div className="font-instrument tabular-nums mt-3 text-2xl font-semibold text-white">{testRunEvidence.totalTestRuns} runs</div>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    Average {testRunEvidence.averageTestRuns} per attempt across {testRunEvidence.attemptsWithEvidence} attempt{testRunEvidence.attemptsWithEvidence === 1 ? "" : "s"}.
                  </p>
                </>
              ) : (
                <p className="mt-3 text-xs leading-5 text-zinc-500">Appears after your first attempt.</p>
              )}
              <p className="mt-2 text-[10px] leading-4 text-zinc-600">
                Running tests is healthy debugging process. Test counts never lower a score.
              </p>
            </Card>

            <Card as="section" aria-labelledby="progress-strongest-heading" variant="panel" padding="lg">
              <h3 id="progress-strongest-heading" className="instrument-label">Strongest practiced skill</h3>
              {strongestSkill ? (
                <>
                  <div className="mt-3 text-sm font-semibold text-emerald-300">{strongestSkill.skill}</div>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    Average {strongestSkill.averageScore} across {strongestSkill.attemptCount} verified lab{strongestSkill.attemptCount === 1 ? "" : "s"}.
                  </p>
                </>
              ) : (
                <p className="mt-3 text-xs leading-5 text-zinc-500">
                  {hasUnexplainedCompletions ? missingAttemptEvidenceCopy : "Appears after your first verified repair."}
                </p>
              )}
            </Card>

            <Card as="section" aria-labelledby="progress-reinforce-heading" variant="panel" padding="lg">
              <h3 id="progress-reinforce-heading" className="instrument-label">Reinforcement priority</h3>
              {reinforcement ? (
                <>
                  <div className="mt-3 text-sm font-semibold text-amber-300">{reinforcement.title}</div>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">{reinforcement.skill} · {reinforcement.reason}</p>
                </>
              ) : (
                <p className="mt-3 text-xs leading-5 text-zinc-500">Nothing flagged — your verified evidence is strong so far.</p>
              )}
            </Card>
          </div>

          <Card as="section" aria-labelledby="progress-recent-heading" variant="panel" padding="lg">
            <h3 id="progress-recent-heading" className="instrument-label">Recent attempts</h3>
            {recentAttempts.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {recentAttempts.map((attempt) => (
                  <Card as="li" key={attempt.attemptId} variant="evidence-well" padding="none">
                    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium text-zinc-200">{attemptTitle(attempt)}</div>
                        <div className="font-instrument mt-1 text-[10px] text-zinc-600">
                          {durationBucketLabels[attempt.durationBucket]} · {attempt.hintsUsed}/3 hints · {attempt.testRuns} test run{attempt.testRuns === 1 ? "" : "s"}
                        </div>
                      </div>
                      <Badge variant={attempt.status === "verified" ? "verified" : "failure"} glyph={attempt.status === "verified" ? "✓" : "✕"} className="shrink-0 uppercase tracking-wider">
                        {attempt.status === "verified" ? "Verified" : "Not verified"}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-xs leading-5 text-zinc-500">No attempts recorded on this device yet.</p>
            )}
          </Card>

          <Card as="section" aria-labelledby="progress-next-heading" variant="raised" padding="lg">
            <h3 id="progress-next-heading" className="instrument-label text-amber-300">Recommended next step</h3>
            <p className="mt-2 text-xs leading-5 text-zinc-400">{recommendation.reason}</p>
            {recommendedStep ? (
              <Button variant="primary" size="md" onClick={() => onStartStep(recommendedStep)} className="mt-4">
                Start Lesson {recommendedStep.order}: {recommendedStep.title} <span aria-hidden="true">→</span>
              </Button>
            ) : (
              <p className="mt-3 text-xs leading-5 text-zinc-500">Switch to Practice by skill to keep building evidence with advanced variants.</p>
            )}
          </Card>
        </div>
      </div>
    </section>
  );
}
