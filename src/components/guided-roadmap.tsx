import type { CSSProperties } from "react";

import { Badge, Button, Dossier, ProcessRail } from "@/components/ui";
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
        <div className="roadmap-meter min-w-56" aria-label={`${completeCount} of 9 lessons verified`}>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between text-xs"><span className="text-zinc-400">Roadmap progress</span><span className="font-instrument tabular-nums font-semibold text-emerald-300">{completeCount}/9 verified</span></div>
            <div className="roadmap-meter-track mt-2.5"><div className="progress-fill h-full bg-gradient-to-r from-cyan-300/70 to-emerald-400/80" style={{ "--progress": completeCount / learningSteps.length } as CSSProperties} /></div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-4">
          {learningPhases.map((phase) => (
            <Dossier
              key={phase.id}
              as="section"
              index={`0${phase.order}`}
              tone={phase.order === 1 ? "amber" : phase.order === 2 ? "cyan" : "green"}
              aria-labelledby={`${phase.id}-heading`}
              className="phase-dossier"
            >
              <div className="phase-dossier-header">
                <div><span className="instrument-label">Curriculum phase {phase.order}</span><h3 id={`${phase.id}-heading`} className="mt-1 text-base font-semibold tracking-[-0.015em] text-zinc-100">{phase.title}</h3></div>
                <span aria-hidden="true" className="phase-dossier-count">03 labs</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-zinc-500">{phase.description}</p>
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
                      className={`lesson-record focus-brackets min-h-32 p-3 text-left focus-visible:outline-none ${
                        isActiveSelection
                          ? "lesson-record-active"
                          : isLockedSelection
                            ? "lesson-record-locked-selected"
                            : "lesson-record-idle"
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
            </Dossier>
          ))}
        </div>

        <Dossier
          as="aside"
          index={`L${String(selected.order).padStart(2, "0")}`}
          tone={selectedState === "Complete" ? "green" : selectedState === "Ready" ? "amber" : "neutral"}
          active={selectedUnlocked}
          aria-label="Selected guided lesson"
          className="selected-lesson-dossier self-start xl:sticky xl:top-24"
        >
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

          <div className="concept-record mt-5">
            <div className="instrument-label text-amber-300">Concept guide</div>
            <p className="mt-2 text-xs leading-5 text-zinc-300">{selected.conceptGuide}</p>
          </div>

          <div className="mt-5">
            <div className="instrument-label">Investigation loop</div>
            <ProcessRail
              compact
              className="mt-3"
              steps={selected.investigationChecklist.map((item, index) => ({ number: `0${index + 1}`, title: item }))}
            />
          </div>

          <div className="selected-success-signal mt-5">
            <div className="instrument-label">Success signal</div>
            <p className="mt-2 text-xs leading-5 text-zinc-300">{selected.successSignal}</p>
          </div>

          <div className="selected-validation-stamp mt-4"><span aria-hidden="true">✓</span><span>Prevalidated lab · no API credits required</span></div>
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
        </Dossier>
      </div>
    </section>
  );
}
