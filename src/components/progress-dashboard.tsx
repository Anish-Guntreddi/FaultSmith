"use client";

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
};

function EvidenceBar({ value, tone = "amber" }: { value: number; tone?: "amber" | "emerald" }) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <div aria-hidden="true" className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
      <div
        className={`h-full rounded-full ${tone === "emerald" ? "bg-emerald-400/70" : "bg-amber-400/70"}`}
        style={{ width: `${width}%` }}
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

export function ProgressDashboard({ profile, onStartStep }: ProgressDashboardProps) {
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

  const scoreCards = averages
    ? ([
        ["Root-cause accuracy", averages.rootCause],
        ["Causal reasoning", averages.reasoning],
        ["Patch discipline", averages.patchDiscipline],
        ["Concept understanding", averages.conceptUnderstanding],
      ] as const)
    : null;

  return (
    <section aria-labelledby="my-progress-heading">
      <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Personal practice evidence</div>
          <h2 id="my-progress-heading" className="mt-1 text-2xl font-medium text-white">My Progress</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Practice evidence — not a certification. Every number below comes from verified lab evidence stored only in this browser.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-400">
          <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
          On this device
        </span>
      </div>

      {isEmpty && (
        <div className="mb-5 rounded-2xl border border-amber-400/15 bg-amber-400/[0.04] p-5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">No local progress yet</div>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Complete your first guided lab to build personal evidence you can see here. Progress records only when a repair is verified by executed tests.
          </p>
        </div>
      )}

      {roadmapComplete && (
        <div className="mb-5 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.04] p-5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Roadmap complete</div>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            All nine lessons are verified on this device. Use Practice by skill for advanced variants and live generated challenges.
          </p>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <section aria-labelledby="progress-roadmap-heading" className="rounded-2xl border border-white/9 bg-[#101318]/90 p-5">
          <h3 id="progress-roadmap-heading" className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">Roadmap evidence</h3>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-semibold text-white">{completedCount}</span>
            <span className="text-sm text-zinc-500">/ {TOTAL_LESSON_COUNT} lessons verified</span>
          </div>
          <EvidenceBar value={(completedCount / TOTAL_LESSON_COUNT) * 100} tone="emerald" />
          <ul className="mt-5 space-y-3">
            {phaseProgress.map((phase) => (
              <li key={phase.phaseId} className="rounded-xl border border-white/7 bg-black/15 p-3">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate text-zinc-300">{phase.order}. {phase.title}</span>
                  <span className={phase.complete ? "shrink-0 font-semibold text-emerald-300" : "shrink-0 text-zinc-500"}>
                    {phase.completedLessons}/{phase.totalLessons}{phase.complete ? " · Complete" : ""}
                  </span>
                </div>
                <EvidenceBar value={(phase.completedLessons / phase.totalLessons) * 100} tone={phase.complete ? "emerald" : "amber"} />
              </li>
            ))}
          </ul>
        </section>

        <div className="min-w-0 space-y-4">
          <section aria-labelledby="progress-scores-heading" className="rounded-2xl border border-white/9 bg-[#101318]/90 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id="progress-scores-heading" className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">Verified score dimensions</h3>
              {averages && (
                <span className="text-[10px] text-zinc-600">
                  Average across {averages.sampleSize} verified lab{averages.sampleSize === 1 ? "" : "s"}
                </span>
              )}
            </div>
            {scoreCards ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {scoreCards.map(([label, score]) => (
                  <div key={label} className="rounded-xl border border-white/7 bg-black/15 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-zinc-400">{label}</span>
                      <span className="text-sm font-semibold text-zinc-100">{score}</span>
                    </div>
                    <EvidenceBar value={score} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-xs leading-5 text-zinc-500">
                Verified score averages appear after your first verified repair. Failing attempts stay visible below as process evidence only.
              </p>
            )}
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <section aria-labelledby="progress-independent-heading" className="rounded-2xl border border-white/9 bg-[#101318]/90 p-5">
              <h3 id="progress-independent-heading" className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">Independent solves</h3>
              {independent ? (
                <>
                  <div className="mt-3 text-2xl font-semibold text-white">{independent.rate}%</div>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    {independent.independentSolves} of {independent.verifiedAttempts} verified repair{independent.verifiedAttempts === 1 ? "" : "s"} used no hints.
                  </p>
                  <EvidenceBar value={independent.rate} tone="emerald" />
                </>
              ) : (
                <p className="mt-3 text-xs leading-5 text-zinc-500">Appears after your first verified repair.</p>
              )}
            </section>

            <section aria-labelledby="progress-testruns-heading" className="rounded-2xl border border-white/9 bg-[#101318]/90 p-5">
              <h3 id="progress-testruns-heading" className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">Test-run process evidence</h3>
              {testRunEvidence ? (
                <>
                  <div className="mt-3 text-2xl font-semibold text-white">{testRunEvidence.totalTestRuns} runs</div>
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
            </section>

            <section aria-labelledby="progress-strongest-heading" className="rounded-2xl border border-white/9 bg-[#101318]/90 p-5">
              <h3 id="progress-strongest-heading" className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">Strongest practiced skill</h3>
              {strongestSkill ? (
                <>
                  <div className="mt-3 text-sm font-semibold text-emerald-300">{strongestSkill.skill}</div>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    Average {strongestSkill.averageScore} across {strongestSkill.attemptCount} verified lab{strongestSkill.attemptCount === 1 ? "" : "s"}.
                  </p>
                </>
              ) : (
                <p className="mt-3 text-xs leading-5 text-zinc-500">Appears after your first verified repair.</p>
              )}
            </section>

            <section aria-labelledby="progress-reinforce-heading" className="rounded-2xl border border-white/9 bg-[#101318]/90 p-5">
              <h3 id="progress-reinforce-heading" className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">Reinforcement priority</h3>
              {reinforcement ? (
                <>
                  <div className="mt-3 text-sm font-semibold text-amber-300">{reinforcement.title}</div>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">{reinforcement.skill} · {reinforcement.reason}</p>
                </>
              ) : (
                <p className="mt-3 text-xs leading-5 text-zinc-500">Nothing flagged — your verified evidence is strong so far.</p>
              )}
            </section>
          </div>

          <section aria-labelledby="progress-recent-heading" className="rounded-2xl border border-white/9 bg-[#101318]/90 p-5">
            <h3 id="progress-recent-heading" className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">Recent attempts</h3>
            {recentAttempts.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {recentAttempts.map((attempt) => (
                  <li key={attempt.attemptId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/7 bg-black/15 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium text-zinc-200">{attemptTitle(attempt)}</div>
                      <div className="mt-1 text-[10px] text-zinc-600">
                        {durationBucketLabels[attempt.durationBucket]} · {attempt.hintsUsed}/3 hints · {attempt.testRuns} test run{attempt.testRuns === 1 ? "" : "s"}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                        attempt.status === "verified"
                          ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300"
                          : "border-red-400/20 bg-red-400/[0.06] text-red-300"
                      }`}
                    >
                      {attempt.status === "verified" ? "Verified" : "Not verified"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-xs leading-5 text-zinc-500">No attempts recorded on this device yet.</p>
            )}
          </section>

          <section aria-labelledby="progress-next-heading" className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.04] p-5">
            <h3 id="progress-next-heading" className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300">Recommended next step</h3>
            <p className="mt-2 text-xs leading-5 text-zinc-400">{recommendation.reason}</p>
            {recommendedStep ? (
              <button
                type="button"
                onClick={() => onStartStep(recommendedStep)}
                className="mt-4 rounded-xl bg-amber-400 px-4 py-3 text-sm font-semibold text-[#1a1105] transition hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Start Lesson {recommendedStep.order}: {recommendedStep.title} <span aria-hidden="true">→</span>
              </button>
            ) : (
              <p className="mt-3 text-xs leading-5 text-zinc-500">Switch to Practice by skill to keep building evidence with advanced variants.</p>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}
