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

function lessonStatus(progress: LearningProgress, step: LearningStep) {
  if (isLearningStepCompleted(progress, step.id)) return "Complete";
  if (isLearningStepUnlocked(progress, step.id)) return "Ready";
  return "Locked";
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

  return (
    <section aria-labelledby="guided-roadmap-heading" className="motion-rise">
      <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="instrument-label">Evidence-first curriculum</div>
          <h2 id="guided-roadmap-heading" className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] text-white">Your debugging roadmap</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">Nine validated labs build the habit of reading evidence, forming a hypothesis, and proving the smallest repair before asking AI for an answer.</p>
        </div>
        <div className="evidence-well min-w-56 rounded-xl px-4 py-3">
          <div className="flex items-center justify-between text-xs"><span className="text-zinc-400">Roadmap progress</span><span className="font-semibold text-emerald-300">{completeCount}/9 verified</span></div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/6"><div className="h-full rounded-full bg-gradient-to-r from-cyan-300/70 to-emerald-400/80 transition-[width]" style={{ width: `${(completeCount / learningSteps.length) * 100}%` }} /></div>
        </div>
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
                  return (
                    <button
                      key={step.id}
                      type="button"
                      aria-pressed={selectedLesson}
                      onClick={() => onSelectStep(step.id)}
                      className={`min-h-32 rounded-xl border p-3 text-left transition duration-200 focus-visible:outline-none ${selectedLesson ? "border-amber-400/45 bg-[linear-gradient(145deg,rgba(242,184,75,0.09),rgba(255,255,255,0.018))] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]" : "border-white/7 bg-black/15 hover:-translate-y-0.5 hover:border-cyan-200/20 hover:bg-white/[0.025]"}`}
                    >
                      <div className="font-instrument flex items-center justify-between gap-2 text-[9px] uppercase tracking-[0.12em]">
                        <span className="text-zinc-500">Lesson {step.order}</span>
                        <span className={status === "Complete" ? "text-emerald-300" : status === "Ready" ? "text-amber-300" : "text-zinc-600"}>{status}</span>
                      </div>
                      <div className="mt-3 text-sm font-medium leading-5 text-zinc-200">{step.title}</div>
                      <div className="mt-2 text-[10px] leading-4 text-zinc-500">{step.targetSkill} · ~{step.estimatedMinutes} min</div>
                      {recommended && <div className="font-instrument mt-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-amber-300">Recommended</div>}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <aside aria-label="Selected guided lesson" className="lab-panel-raised self-start rounded-2xl p-5 xl:sticky xl:top-24">
          <div className="flex items-center justify-between gap-3"><span className="instrument-label">Lesson {selected.order} of 9</span><span className="status-pill px-2.5 py-1">{selected.category}</span></div>
          <h3 className="mt-4 text-xl font-semibold tracking-[-0.025em] text-white">{selected.title}</h3>
          <p className="mt-2 text-xs leading-5 text-zinc-500">{project?.title} · {selected.targetSkill} · {selected.difficulty.charAt(0).toUpperCase() + selected.difficulty.slice(1)}</p>

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

          <div className="mt-5 rounded-xl border border-white/7 bg-black/20 p-4">
            <div className="instrument-label">Success signal</div>
            <p className="mt-2 text-xs leading-5 text-zinc-300">{selected.successSignal}</p>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/14 bg-emerald-400/[0.04] px-3 py-2.5 text-[11px] leading-4 text-emerald-200"><span aria-hidden="true">✓</span><span>Prevalidated lab · no API credits required</span></div>
          {!selectedUnlocked && <p className="mt-3 text-xs leading-5 text-zinc-500">Complete the previous lesson to unlock this lab. You can still preview its guide now.</p>}
          <button type="button" disabled={!selectedUnlocked} onClick={() => onStartStep(selected)} className="primary-action mt-4 w-full rounded-xl px-4 py-3.5 text-sm font-semibold focus-visible:outline-none disabled:opacity-35">{selectedComplete ? "Practice lesson again" : "Start guided lab"} <span aria-hidden="true">→</span></button>
          <p className="mt-3 text-center text-[10px] leading-4 text-zinc-500">{recommendation.reason}</p>
        </aside>
      </div>
    </section>
  );
}
