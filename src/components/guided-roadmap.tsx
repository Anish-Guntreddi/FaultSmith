import type { CSSProperties } from "react";

import { Badge, Button, Card } from "@/components/ui";
import { getProject } from "@/lib/catalog";
import {
  getLearningRecommendation,
  getLearningStep,
  isLearningStepCompleted,
  isLearningStepUnlocked,
  learningPhases,
  learningSteps,
  type LearningProgress,
  type LearningStep,
  type LearningStepId,
} from "@/lib/learning-paths";

type GuidedRoadmapProps = {
  progress: LearningProgress;
  selectedStepId: LearningStepId;
  onSelectStep: (stepId: LearningStepId) => void;
  onStartStep: (step: LearningStep) => void;
};

type LessonState = "Complete" | "Ready" | "Locked";

function lessonStatus(progress: LearningProgress, step: LearningStep): LessonState {
  if (isLearningStepCompleted(progress, step.id)) return "Complete";
  if (isLearningStepUnlocked(progress, step.id)) return "Ready";
  return "Locked";
}

// Non-color state signal: a distinct glyph shape per state (square/inert,
// triangle/actionable, check/done) so the state reads the same in
// grayscale or under a color-vision deficiency, matching the "color never
// the sole status signal" constraint. Paired with the visible status word.
const stateGlyph: Record<LessonState, string> = { Locked: "▪", Ready: "▸", Complete: "✓" };

// `ls -la`-flavored permission bits: a decorative (aria-hidden) echo of the
// same state, in the terminal grammar. Locked reads as an inaccessible
// directory (no rwx); Ready as execute-only; Complete as the full rwx a
// finished, shareable artifact would carry.
function permissionBits(state: LessonState): string {
  if (state === "Locked") return "d---------";
  if (state === "Ready") return "-r-x------";
  return "-rwxr-xr-x";
}

export function GuidedRoadmap({
  progress,
  selectedStepId,
  onSelectStep,
  onStartStep,
}: GuidedRoadmapProps) {
  const recommendation = getLearningRecommendation(progress);
  const selected = getLearningStep(selectedStepId) ?? recommendation.step ?? learningSteps[0];
  const project = getProject(selected.projectId);
  const completeCount = progress.completions.length;
  const selectedComplete = isLearningStepCompleted(progress, selected.id);
  const selectedUnlocked = isLearningStepUnlocked(progress, selected.id);
  const selectedState = lessonStatus(progress, selected);

  return (
    <section aria-labelledby="guided-roadmap-heading" className="motion-rise">
      <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="instrument-label">Evidence-first curriculum</div>
          <h2 id="guided-roadmap-heading" className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] text-white">Your debugging roadmap</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">Nine validated labs build the habit of reading evidence, forming a hypothesis, and proving the smallest repair before asking AI for an answer.</p>
        </div>
        <Card variant="evidence-well" padding="none" className="min-w-56">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between text-xs"><span className="text-zinc-400">Roadmap progress</span><span className="font-instrument tabular-nums font-semibold text-emerald-300">{completeCount}/9 verified</span></div>
            <div className="block-meter mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/6"><div className="progress-fill h-full rounded-full bg-gradient-to-r from-cyan-300/70 to-emerald-400/80" style={{ "--progress": completeCount / learningSteps.length } as CSSProperties} /></div>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-4">
          {learningPhases.map((phase) => (
            <section key={phase.id} aria-labelledby={`${phase.id}-heading`} className="lab-panel relative overflow-hidden rounded-2xl p-4 sm:p-5">
              <div aria-hidden="true" className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-amber-300/55 via-cyan-300/15 to-transparent" />
              <div className="flex gap-3">
                <span className="font-instrument grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-amber-400/20 bg-amber-400/[0.055] text-xs font-semibold text-amber-200">0{phase.order}</span>
                <div><h3 id={`${phase.id}-heading`} className="text-base font-semibold tracking-[-0.015em] text-zinc-100">{phase.title}</h3><p className="mt-1 text-xs leading-5 text-zinc-500">{phase.description}</p></div>
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-3">
                {phase.steps.map((step) => {
                  const status = lessonStatus(progress, step);
                  const selectedLesson = selected.id === step.id;
                  const recommended = recommendation.step?.id === step.id;
                  // The amber gradient/keyline elsewhere in this system means
                  // "this is the one to act on." Reusing it for a selected-but-
                  // Locked preview (inert, unstartable) would dilute that
                  // signal, so locked selections get a neutral/desaturated
                  // ring instead and the amber treatment is reserved for
                  // selections that are actually startable (Ready or Complete).
                  const isLockedSelection = selectedLesson && status === "Locked";
                  const isActiveSelection = selectedLesson && !isLockedSelection;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      aria-pressed={selectedLesson}
                      onClick={() => onSelectStep(step.id)}
                      className={`lesson-card focus-brackets min-h-32 rounded-xl border p-3 text-left focus-visible:outline-none ${
                        isActiveSelection
                          ? "border-amber-400/45 bg-[linear-gradient(145deg,rgba(242,184,75,0.09),rgba(255,255,255,0.018))] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]"
                          : isLockedSelection
                            ? "border-white/30 bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                            : "border-white/7 bg-black/15 hover:border-cyan-200/20 hover:bg-white/[0.025]"
                      }`}
                    >
                      <div className="font-instrument flex items-center justify-between gap-2 text-[9px] uppercase tracking-[0.12em]">
                        <span className="text-zinc-500">Lesson {step.order}</span>
                        <span className={`inline-flex items-center gap-1 ${status === "Complete" ? "text-emerald-300" : status === "Ready" ? "text-amber-300" : "text-zinc-600"}`}>
                          <span aria-hidden="true">{stateGlyph[status]}</span>{status}
                        </span>
                      </div>
                      <div className="mt-3 text-sm font-medium leading-5 text-zinc-200">{step.title}</div>
                      <div className="lesson-meta font-instrument mt-2.5 text-zinc-500">
                        <span aria-hidden="true">{permissionBits(status)}</span>
                        <span className="shrink-0 text-zinc-400">L{String(step.order).padStart(2, "0")}</span>
                        <span className="lesson-meta-skill text-zinc-400">{step.targetSkill}</span>
                        <span className="shrink-0">~{step.estimatedMinutes}m</span>
                      </div>
                      {recommended && <div className="font-instrument mt-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-amber-300"><span aria-hidden="true">→</span> Recommended</div>}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <Card as="aside" aria-label="Selected guided lesson" variant="raised" padding="lg" className="self-start xl:sticky xl:top-24">
          <div className="flex items-center justify-between gap-3">
            <span className="instrument-label">Lesson {selected.order} of 9</span>
            <Badge variant="neutral" glyph="·">{selected.category}</Badge>
          </div>
          <h3 className="mt-4 text-xl font-semibold tracking-[-0.025em] text-white">{selected.title}</h3>
          <div className="lesson-meta font-instrument mt-2 text-zinc-500">
            <span aria-hidden="true">{permissionBits(selectedState)}</span>
            <span className="shrink-0 text-zinc-400">L{String(selected.order).padStart(2, "0")}</span>
            <span className="lesson-meta-skill text-zinc-400">{selected.targetSkill}</span>
            <span className="shrink-0">~{selected.estimatedMinutes}m</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-zinc-500">{project?.title} · {selected.difficulty.charAt(0).toUpperCase() + selected.difficulty.slice(1)}</p>

          <div className="mt-5 rounded-xl border border-amber-400/12 bg-amber-400/[0.04] p-4">
            <div className="instrument-label text-amber-300">Concept guide</div>
            <p className="mt-2 text-xs leading-5 text-zinc-300">{selected.conceptGuide}</p>
          </div>

          <div className="mt-5">
            <div className="instrument-label">Investigation loop</div>
            <ol className="mt-3 space-y-2">
              {selected.investigationChecklist.map((item, index) => <li key={item} className="flex gap-3 text-xs leading-5 text-zinc-400"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/5 text-[10px] text-zinc-300">{index + 1}</span><span>{item}</span></li>)}
            </ol>
          </div>

          <Card variant="inset" padding="md" className="mt-5">
            <div className="instrument-label">Success signal</div>
            <p className="mt-2 text-xs leading-5 text-zinc-300">{selected.successSignal}</p>
          </Card>

          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/14 bg-emerald-400/[0.04] px-3 py-2.5 text-[11px] leading-4 text-emerald-200"><span aria-hidden="true">✓</span><span>Prevalidated lab · no API credits required</span></div>
          {!selectedUnlocked && <p className="mt-3 text-xs leading-5 text-zinc-500">Complete the previous lesson to unlock this lab. You can still preview its guide now.</p>}
          <Button
            variant="primary"
            size="lg"
            disabled={!selectedUnlocked}
            onClick={() => onStartStep(selected)}
            className="mt-4 w-full disabled:opacity-35"
          >
            {selectedComplete ? "Practice lesson again" : "Start guided lab"} <span aria-hidden="true">→</span>
          </Button>
          <p className="mt-3 text-center text-[10px] leading-4 text-zinc-500">{recommendation.reason}</p>
        </Card>
      </div>
    </section>
  );
}
