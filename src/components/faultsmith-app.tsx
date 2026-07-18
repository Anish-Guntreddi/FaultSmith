"use client";

import { useEffect, useMemo, useState } from "react";

import { projects } from "@/lib/catalog";
import {
  appendAnonymousAttemptEvent,
  type AnonymousAttemptEvent,
  type AttemptEventName,
} from "@/lib/attempt-events";
import {
  assessmentResponseSchema,
  executionResponseSchema,
  fileSnapshotSchema,
  hintResponseSchema,
  publicChallengeSchema,
  type AssessmentResponse,
  type Difficulty,
  type FileSnapshot,
  type ProjectId,
  type PublicChallenge,
  type TestResult,
} from "@/lib/contracts";

type Stage = "configure" | "forging" | "workspace" | "report";
type RequestState = "idle" | "running";

const ATTEMPT_KEY = "faultsmith:attempt:v2";
const EVENT_KEY = "faultsmith:events:v1";
const difficultyOptions: Array<{ value: Difficulty; label: string }> = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

function BrandMark() {
  return (
    <span
      aria-hidden="true"
      className="relative grid h-9 w-9 place-items-center rounded-xl border border-amber-400/30 bg-amber-400/10"
    >
      <span className="h-3.5 w-3.5 rotate-45 rounded-[3px] border-2 border-amber-300" />
      <span className="absolute bottom-1.5 h-[2px] w-4 rounded-full bg-amber-300/70" />
    </span>
  );
}

function StatusDot({ tone = "amber" }: { tone?: "amber" | "green" | "red" }) {
  const color = tone === "green" ? "bg-emerald-400" : tone === "red" ? "bg-red-400" : "bg-amber-400";
  return <span aria-hidden="true" className={`inline-block h-1.5 w-1.5 rounded-full ${color}`} />;
}

function AppHeader({ stage, verified }: { stage: Stage; verified: boolean }) {
  const status =
    stage === "configure"
      ? "Lab catalog ready"
      : stage === "forging"
        ? "Validation in progress"
        : stage === "workspace"
          ? "Investigation active"
          : verified
            ? "Repair verified"
            : "Attempt reviewed";

  return (
    <header className="border-b border-white/8 bg-[#0b0e11]/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1480px] items-center justify-between px-5 lg:px-8">
        <div className="flex items-center gap-3">
          <BrandMark />
          <div>
            <div className="text-sm font-semibold tracking-[0.18em] text-white">FAULTSMITH</div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Deliberate debugging practice</div>
          </div>
        </div>
        <div className="hidden items-center gap-3 text-xs text-zinc-400 sm:flex">
          <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5">
            <StatusDot tone={stage === "report" ? (verified ? "green" : "red") : "amber"} />
            <span className="ml-2">{status}</span>
          </span>
          <span className="rounded-full border border-white/8 px-3 py-1.5 text-zinc-500">Build Week MVP</span>
        </div>
      </div>
    </header>
  );
}

async function postJson(path: string, body: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(35_000),
  });
  const data = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(data.error || "The request could not be completed.");
  return data;
}

function editableFiles(challenge: PublicChallenge): FileSnapshot[] {
  return challenge.files
    .filter((file) => file.editable)
    .map(({ path, content }) => ({ path, content }));
}

function sourceLabel(challenge: PublicChallenge) {
  return challenge.source === "generated" ? "GPT-5.6 generated · Code Interpreter" : "Prevalidated fixture · deterministic verifier";
}

function difficultyLabel(difficulty: Difficulty) {
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
}

function elapsedLabel(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

function trackAnonymousEvent(
  name: AttemptEventName,
  context: Omit<AnonymousAttemptEvent, "name" | "occurredAt"> = {},
) {
  try {
    const raw = window.localStorage.getItem(EVENT_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    const next = appendAnonymousAttemptEvent(existing, { name, ...context });
    window.localStorage.setItem(EVENT_KEY, JSON.stringify(next));
  } catch {
    // Analytics is anonymous, local-only, and never allowed to block the learning loop.
  }
}

export function FaultSmithApp() {
  const [stage, setStage] = useState<Stage>("configure");
  const [projectId, setProjectId] = useState<ProjectId>("expense-approval");
  const [skill, setSkill] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty | "">("");
  const [preferLive, setPreferLive] = useState(true);
  const [challenge, setChallenge] = useState<PublicChallenge | null>(null);
  const [files, setFiles] = useState<FileSnapshot[]>([]);
  const [activeFile, setActiveFile] = useState("");
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [hypothesis, setHypothesis] = useState("");
  const [hypothesisHistory, setHypothesisHistory] = useState<string[]>([]);
  const [revealedHints, setRevealedHints] = useState<string[]>([]);
  const [explanation, setExplanation] = useState("");
  const [testRuns, setTestRuns] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [validationStep, setValidationStep] = useState(0);
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [assessment, setAssessment] = useState<AssessmentResponse | null>(null);

  const project = useMemo(
    () => projects.find((item) => item.id === projectId) ?? projects[0],
    [projectId],
  );

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(ATTEMPT_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw) as Record<string, unknown>;
        const savedChallenge = publicChallengeSchema.safeParse(saved.challenge);
        const savedFiles = Array.isArray(saved.files)
          ? saved.files.map((file) => fileSnapshotSchema.safeParse(file))
          : [];
        if (!savedChallenge.success || savedFiles.some((item) => !item.success)) return;
        const restoredFiles = savedFiles.map((item) => item.data as FileSnapshot);
        if (restoredFiles.some((file) => !savedChallenge.data.allowedFiles.includes(file.path))) return;

        const savedAssessment = assessmentResponseSchema.safeParse(saved.assessment);
        setChallenge(savedChallenge.data);
        setFiles(restoredFiles);
        setActiveFile(typeof saved.activeFile === "string" ? saved.activeFile : restoredFiles[0]?.path ?? "");
        setHypothesis(typeof saved.hypothesis === "string" ? saved.hypothesis.slice(0, 2_000) : "");
        setExplanation(typeof saved.explanation === "string" ? saved.explanation.slice(0, 4_000) : "");
        setRevealedHints(
          Array.isArray(saved.revealedHints)
            ? saved.revealedHints
                .filter((item): item is string => typeof item === "string" && item.length <= 360)
                .slice(0, 3)
            : [],
        );
        setTestRuns(typeof saved.testRuns === "number" ? Math.min(99, Math.max(0, Math.floor(saved.testRuns))) : 0);
        setStartedAt(typeof saved.startedAt === "number" && saved.startedAt > 0 && saved.startedAt <= Date.now() ? saved.startedAt : Date.now());
        setHypothesisHistory(
          Array.isArray(saved.hypothesisHistory)
            ? saved.hypothesisHistory
                .filter((item): item is string => typeof item === "string" && item.trim().length >= 12 && item.length <= 2_000)
                .slice(-30)
            : [],
        );
        setTestResult(savedChallenge.data.initialTestResult);
        if (savedAssessment.success) {
          setAssessment(savedAssessment.data);
          setTestResult(savedAssessment.data.testResult);
          setStage("report");
        } else {
          setStage("workspace");
        }
      } catch {
        window.localStorage.removeItem(ATTEMPT_KEY);
      }
    }, 0);
    return () => window.clearTimeout(restoreTimer);
  }, []);

  useEffect(() => {
    if (!challenge || (stage !== "workspace" && stage !== "report")) return;
    try {
      window.localStorage.setItem(
        ATTEMPT_KEY,
        JSON.stringify({
          challenge,
          files,
          activeFile,
          hypothesis,
          hypothesisHistory,
          revealedHints,
          explanation,
          testRuns,
          startedAt,
          assessment,
        }),
      );
    } catch {}
  }, [challenge, files, activeFile, hypothesis, hypothesisHistory, revealedHints, explanation, testRuns, startedAt, assessment, stage]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [stage]);

  function recordHypothesis() {
    const value = hypothesis.trim();
    if (value.length < 12) return hypothesisHistory;
    const nextHistory = hypothesisHistory.at(-1) === value
      ? hypothesisHistory
      : [...hypothesisHistory.slice(-29), value];
    setHypothesisHistory(nextHistory);
    return nextHistory;
  }

  async function forgeChallenge(useLive = preferLive) {
    if (!skill || !difficulty) return;
    trackAnonymousEvent("project_selected", { projectId, outcome: "generation_confirmed" });
    trackAnonymousEvent("generation_started", {
      projectId,
      outcome: useLive ? "live_requested" : "fixture_requested",
    });
    setStage("forging");
    setRequestState("running");
    setValidationStep(0);
    setError("");
    setMessage("");
    setAssessment(null);
    const timer = window.setInterval(() => setValidationStep((step) => Math.min(3, step + 1)), 550);

    try {
      const [data] = await Promise.all([
        postJson("/api/challenges/generate", {
          projectId,
          targetSkill: skill,
          difficulty,
          preferLive: useLive,
        }),
        new Promise((resolve) => window.setTimeout(resolve, 850)),
      ]);
      const parsed = publicChallengeSchema.safeParse(data);
      if (!parsed.success) throw new Error("The server returned an invalid challenge contract.");
      const nextChallenge = parsed.data;
      const nextFiles = editableFiles(nextChallenge);
      setChallenge(nextChallenge);
      setFiles(nextFiles);
      setActiveFile(nextFiles[0]?.path ?? nextChallenge.files[0]?.path ?? "");
      setTestResult(nextChallenge.initialTestResult);
      setHypothesis("");
      setHypothesisHistory([]);
      setRevealedHints([]);
      setExplanation("");
      setTestRuns(0);
      setStartedAt(Date.now());
      setMessage(nextChallenge.fallbackReason ?? "Challenge validation completed successfully.");
      trackAnonymousEvent("generation_succeeded", {
        projectId: nextChallenge.projectId,
        challengeId: nextChallenge.challengeId,
        source: nextChallenge.source,
      });
      if (useLive && nextChallenge.source === "prevalidated") {
        trackAnonymousEvent("generation_failed", {
          projectId: nextChallenge.projectId,
          challengeId: nextChallenge.challengeId,
          source: nextChallenge.source,
          outcome: "recovered_to_fixture",
        });
        if (nextChallenge.fallbackReason?.includes("validation did not pass")) {
          trackAnonymousEvent("validation_failed", {
            projectId: nextChallenge.projectId,
            challengeId: nextChallenge.challengeId,
            source: nextChallenge.source,
            outcome: "live_gate_failed",
          });
        }
      }
      trackAnonymousEvent("validation_succeeded", {
        projectId: nextChallenge.projectId,
        challengeId: nextChallenge.challengeId,
        source: nextChallenge.source,
        outcome: nextChallenge.initialTestResult.status,
      });
      setStage("workspace");
    } catch (requestError) {
      trackAnonymousEvent("generation_failed", { projectId, outcome: "safe_error" });
      trackAnonymousEvent("validation_failed", { projectId, outcome: "challenge_not_released" });
      setError(requestError instanceof Error ? requestError.message : "Challenge generation failed.");
      setStage("configure");
    } finally {
      window.clearInterval(timer);
      setRequestState("idle");
    }
  }

  async function runTests() {
    if (!challenge) return;
    recordHypothesis();
    setRequestState("running");
    setError("");
    setMessage("");
    try {
      const data = await postJson("/api/challenges/execute", {
        challengeId: challenge.challengeId,
        files,
        executionMode: challenge.source === "generated" ? "code_interpreter" : "prevalidated_fixture",
      });
      const parsed = executionResponseSchema.safeParse(data);
      if (!parsed.success) throw new Error("The server returned an invalid test result.");
      setTestResult(parsed.data.testResult);
      setTestRuns((runs) => Math.min(99, runs + 1));
      trackAnonymousEvent("test_run_completed", {
        projectId: challenge.projectId,
        challengeId: challenge.challengeId,
        source: challenge.source,
        outcome: parsed.data.testResult.status,
      });
      setMessage(parsed.data.recoveryNotice ?? "Executed evidence is up to date.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The test run failed safely.");
    } finally {
      setRequestState("idle");
    }
  }

  async function revealHint() {
    if (!challenge || hypothesis.trim().length < 12 || revealedHints.length >= 3) return;
    recordHypothesis();
    trackAnonymousEvent("hint_requested", {
      projectId: challenge.projectId,
      challengeId: challenge.challengeId,
      source: challenge.source,
      outcome: `step_${revealedHints.length + 1}`,
    });
    setRequestState("running");
    setError("");
    setMessage("");
    try {
      const requestedIndex = revealedHints.length;
      const data = await postJson("/api/challenges/hint", {
        challengeId: challenge.challengeId,
        hintIndex: requestedIndex,
        hypothesis,
        preferLive: challenge.source === "generated",
      });
      const parsed = hintResponseSchema.safeParse(data);
      if (!parsed.success || parsed.data.hintIndex !== requestedIndex) {
        throw new Error("The server returned an invalid progressive hint.");
      }
      setRevealedHints((hints) => [...hints, parsed.data.hint].slice(0, 3));
      setMessage(parsed.data.recoveryNotice ?? `Hint ${requestedIndex + 1} recorded in the investigation.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The hint request failed safely.");
    } finally {
      setRequestState("idle");
    }
  }

  async function submitAttempt() {
    if (!challenge) return;
    const submittedHypotheses = recordHypothesis();
    if (hypothesis.trim().length < 12) {
      setError("Record a specific debugging hypothesis before submitting.");
      return;
    }
    if (explanation.trim().length < 24) {
      setError("Explain the root cause and why your change fixes it.");
      return;
    }
    setRequestState("running");
    setError("");
    setMessage("");
    try {
      const submittedRuns = Math.min(100, testRuns + 1);
      trackAnonymousEvent("patch_submitted", {
        projectId: challenge.projectId,
        challengeId: challenge.challengeId,
        source: challenge.source,
      });
      const data = await postJson("/api/challenges/assess", {
        challengeId: challenge.challengeId,
        files,
        executionMode: challenge.source === "generated" ? "code_interpreter" : "prevalidated_fixture",
        hypothesis,
        hypothesisHistory: submittedHypotheses,
        explanation,
        hintsUsed: revealedHints.length,
        testRuns: submittedRuns,
        elapsedSeconds: Math.min(86_400, Math.max(0, Math.round((Date.now() - startedAt) / 1_000))),
      });
      const parsed = assessmentResponseSchema.safeParse(data);
      if (!parsed.success) throw new Error("The server returned an invalid assessment contract.");
      setAssessment(parsed.data);
      setTestResult(parsed.data.testResult);
      setTestRuns(submittedRuns);
      trackAnonymousEvent(
        parsed.data.assessment.completionStatus === "verified"
          ? "challenge_verified"
          : "challenge_not_verified",
        {
          projectId: challenge.projectId,
          challengeId: challenge.challengeId,
          source: challenge.source,
          outcome: parsed.data.testResult.status,
        },
      );
      setStage("report");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The submission failed safely.");
    } finally {
      setRequestState("idle");
    }
  }

  function resetLab() {
    if (!challenge) return;
    trackAnonymousEvent("challenge_reset", {
      projectId: challenge.projectId,
      challengeId: challenge.challengeId,
      source: challenge.source,
    });
    const nextFiles = editableFiles(challenge);
    setFiles(nextFiles);
    setActiveFile(nextFiles[0]?.path ?? challenge.files[0]?.path ?? "");
    setTestResult(challenge.initialTestResult);
    setHypothesis("");
    setHypothesisHistory([]);
    setRevealedHints([]);
    setExplanation("");
    setTestRuns(0);
    setStartedAt(Date.now());
    setAssessment(null);
    setError("");
    setMessage("Lab reset to the validated mutation snapshot.");
    setStage("workspace");
  }

  function chooseNewLab() {
    window.localStorage.removeItem(ATTEMPT_KEY);
    setChallenge(null);
    setFiles([]);
    setSkill("");
    setDifficulty("");
    setAssessment(null);
    setMessage("");
    setError("");
    setStage("configure");
  }

  const verified = assessment?.assessment.completionStatus === "verified";

  return (
    <main className="min-h-screen">
      <AppHeader stage={stage} verified={verified} />
      <div className="sr-only" aria-live="polite">{requestState === "running" ? "Request in progress" : message || error}</div>
      {stage === "configure" && (
        <ConfigureView
          projectId={projectId}
          setProjectId={(id) => {
            trackAnonymousEvent("project_selected", { projectId: id, outcome: "selected" });
            setProjectId(id);
            setSkill("");
          }}
          skill={skill}
          setSkill={setSkill}
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          preferLive={preferLive}
          setPreferLive={setPreferLive}
          onForge={() => forgeChallenge()}
          onFallback={() => forgeChallenge(false)}
          error={error}
        />
      )}
      {stage === "forging" && (
        <ForgingView projectTitle={project.title} validationStep={validationStep} preferLive={preferLive} />
      )}
      {stage === "workspace" && challenge && (
          <WorkspaceView
          challenge={challenge}
          files={files}
          setFiles={setFiles}
          activeFile={activeFile}
          setActiveFile={setActiveFile}
          testResult={testResult}
          onRunTests={runTests}
          hypothesis={hypothesis}
          setHypothesis={setHypothesis}
          hypothesisHistory={hypothesisHistory}
          explanation={explanation}
          setExplanation={setExplanation}
          revealedHints={revealedHints}
          revealHint={revealHint}
          onSubmit={submitAttempt}
          onReset={resetLab}
          requestState={requestState}
          message={message}
          error={error}
        />
      )}
      {stage === "report" && challenge && assessment && (
        <ReportView challenge={challenge} response={assessment} onPracticeAgain={resetLab} onNewLab={chooseNewLab} />
      )}
    </main>
  );
}

type ConfigureProps = {
  projectId: ProjectId;
  setProjectId: (id: ProjectId) => void;
  skill: string;
  setSkill: (skill: string) => void;
  difficulty: Difficulty | "";
  setDifficulty: (difficulty: Difficulty) => void;
  preferLive: boolean;
  setPreferLive: (preferLive: boolean) => void;
  onForge: () => void;
  onFallback: () => void;
  error: string;
};

function ConfigureView(props: ConfigureProps) {
  const selected = projects.find((project) => project.id === props.projectId) ?? projects[0];
  const ready = Boolean(props.skill && props.difficulty);

  return (
    <div className="grid-texture min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-[1480px] px-5 py-12 lg:px-8 lg:py-16">
        <div className="max-w-3xl">
          <div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-300"><span className="h-px w-8 bg-amber-300/70" />Controlled failure. Measurable learning.</div>
          <h1 className="max-w-2xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-6xl">Learn to debug code you<span className="text-zinc-500"> didn&apos;t write.</span></h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">FaultSmith injects one validated bug into a working Python project, then coaches your investigation without handing you the answer.</p>
        </div>
        <div className="mt-12 grid gap-7 xl:grid-cols-[1fr_390px]">
          <section aria-labelledby="project-heading">
            <div className="mb-4 flex items-end justify-between"><div><div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Step 01</div><h2 id="project-heading" className="mt-1 text-xl font-medium text-white">Choose a system to investigate</h2></div><div className="hidden text-xs text-zinc-600 md:block">3 curated Python systems</div></div>
            <div className="grid gap-4 md:grid-cols-3">
              {projects.map((project) => {
                const active = props.projectId === project.id;
                return (
                  <button key={project.id} type="button" aria-pressed={active} onClick={() => props.setProjectId(project.id)} className={`group relative min-h-72 overflow-hidden rounded-2xl border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${active ? "border-amber-400/55 bg-amber-300/[0.07]" : "border-white/10 bg-[#101318]/90 hover:-translate-y-0.5 hover:border-white/20"}`}>
                    <div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300/80">{project.eyebrow}</span><span className="rounded-full border border-emerald-400/15 bg-emerald-400/[0.05] px-2 py-1 text-[10px] uppercase tracking-wider text-emerald-300">Ready</span></div>
                    <h3 className="mt-7 text-lg font-medium leading-6 text-zinc-100">{project.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-zinc-500">{project.description}</p>
                    <p className="mt-3 text-[11px] leading-5 text-zinc-600">{project.skills.join(" · ")}</p>
                    <div className="absolute inset-x-5 bottom-5 flex items-center justify-between border-t border-white/7 pt-4 text-[11px] text-zinc-600"><span>{project.difficulty}</span><span>~{project.estimatedMinutes} min</span></div>
                  </button>
                );
              })}
            </div>
          </section>
          <aside className="rounded-2xl border border-white/10 bg-[#111419]/95 p-5 shadow-2xl shadow-black/20">
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Step 02</div><h2 className="mt-1 text-xl font-medium text-white">Forge the challenge</h2>
            <div className="mt-7 space-y-6">
              <label className="block"><span className="mb-2 block text-xs font-medium text-zinc-400">Target skill</span><select value={props.skill} onChange={(event) => props.setSkill(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0b0e11] px-3.5 py-3 text-sm text-zinc-200 outline-none focus:ring-2 focus:ring-amber-400/40"><option value="">Select a skill</option>{selected.skills.map((item) => <option key={item}>{item}</option>)}</select></label>
              <fieldset><legend className="mb-2 text-xs font-medium text-zinc-400">Difficulty</legend><div className="grid grid-cols-3 gap-2">{difficultyOptions.map((option) => <button key={option.value} type="button" aria-pressed={props.difficulty === option.value} onClick={() => props.setDifficulty(option.value)} className={`rounded-xl border px-2 py-2.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${props.difficulty === option.value ? "border-amber-400/40 bg-amber-400/10 text-amber-200" : "border-white/8 bg-black/10 text-zinc-500 hover:text-zinc-300"}`}>{option.label}</button>)}</div></fieldset>
              <fieldset><legend className="mb-2 text-xs font-medium text-zinc-400">Validation mode</legend><div className="grid grid-cols-2 gap-2"><button type="button" aria-pressed={props.preferLive} onClick={() => props.setPreferLive(true)} className={`rounded-xl border px-3 py-3 text-left text-xs ${props.preferLive ? "border-amber-400/35 bg-amber-400/[0.07] text-amber-200" : "border-white/8 text-zinc-500"}`}><span className="block font-medium">Live + fallback</span><span className="mt-1 block text-[10px] opacity-70">GPT-5.6 when configured</span></button><button type="button" aria-pressed={!props.preferLive} onClick={() => props.setPreferLive(false)} className={`rounded-xl border px-3 py-3 text-left text-xs ${!props.preferLive ? "border-emerald-400/30 bg-emerald-400/[0.06] text-emerald-200" : "border-white/8 text-zinc-500"}`}><span className="block font-medium">Prevalidated</span><span className="mt-1 block text-[10px] opacity-70">Reliable demo fixture</span></button></div></fieldset>
              <div className="rounded-xl border border-white/7 bg-black/20 p-4"><div className="flex items-center justify-between text-xs"><span className="text-zinc-500">Release gate</span><span className="text-emerald-300">Original pass → Mutant fail</span></div><div className="mt-3 h-1 overflow-hidden rounded-full bg-white/5"><div className="h-full w-full bg-gradient-to-r from-amber-500/60 to-emerald-400/70" /></div></div>
              {props.error && <div role="alert" className="rounded-xl border border-red-400/15 bg-red-400/[0.05] p-3 text-xs leading-5 text-red-300">{props.error}<button type="button" disabled={!ready} onClick={props.onFallback} className="mt-2 block font-semibold underline disabled:opacity-40">Load the prevalidated challenge</button></div>}
              <button type="button" disabled={!ready} onClick={props.onForge} className="forge-pulse flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3.5 text-sm font-semibold text-[#1a1105] transition hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:animate-none disabled:opacity-35">Forge debugging lab <span aria-hidden="true">→</span></button>
              <p className="text-center text-[11px] leading-5 text-zinc-600">GPT-5.6 plans the live mutation. Executed evidence decides whether it ships.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ForgingView({ projectTitle, validationStep, preferLive }: { projectTitle: string; validationStep: number; preferLive: boolean }) {
  const steps = preferLive ? ["Inspecting curated project", "Requesting a schema-valid mutation", "Running original and mutated tests", "Stripping hidden fields and sealing the lab"] : ["Loading approved fixture contract", "Verifying the source allowlist", "Checking original and mutation evidence", "Sealing the prevalidated lab"];
  return (
    <div className="grid-texture grid min-h-[calc(100vh-4rem)] place-items-center px-5"><section aria-busy="true" className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#101318]/95 p-7 shadow-2xl shadow-black/40 sm:p-10"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-amber-400/30 bg-amber-400/10 forge-pulse"><BrandMark /></div><div className="mt-7 text-center"><div className="text-xs uppercase tracking-[0.2em] text-amber-300">Forging challenge</div><h1 className="mt-2 text-2xl font-medium text-white">{projectTitle}</h1><p className="mt-2 text-sm text-zinc-500">One root cause. Reproducible evidence. No accidental failures.</p></div><div className="mt-8 space-y-2">{steps.map((step, index) => { const complete = index < validationStep; const active = index === validationStep; return <div key={step} className={`flex items-center justify-between rounded-xl border px-4 py-3 ${active ? "border-amber-400/25 bg-amber-400/[0.06]" : "border-white/6 bg-black/10"}`}><div className="flex items-center gap-3 text-sm"><span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${complete ? "bg-emerald-400/15 text-emerald-300" : active ? "bg-amber-400/15 text-amber-300" : "bg-white/5 text-zinc-600"}`}>{complete ? "✓" : index + 1}</span><span className={complete || active ? "text-zinc-200" : "text-zinc-600"}>{step}</span></div>{active && <span className="text-[10px] uppercase tracking-wider text-amber-300">Active</span>}</div>; })}</div></section></div>
  );
}

type WorkspaceProps = {
  challenge: PublicChallenge; files: FileSnapshot[]; setFiles: (files: FileSnapshot[]) => void;
  activeFile: string; setActiveFile: (path: string) => void; testResult: TestResult | null;
  onRunTests: () => void; hypothesis: string; setHypothesis: (value: string) => void;
  hypothesisHistory: string[]; explanation: string; setExplanation: (value: string) => void;
  revealedHints: string[];
  revealHint: () => void; onSubmit: () => void; onReset: () => void;
  requestState: RequestState; message: string; error: string;
};

function WorkspaceView(props: WorkspaceProps) {
  const selected = props.challenge.files.find((file) => file.path === props.activeFile) ?? props.challenge.files[0];
  const edited = props.files.find((file) => file.path === selected?.path);
  const content = edited?.content ?? selected?.content ?? "";
  const editable = Boolean(selected?.editable);
  const statusTone = props.testResult?.status === "passed" ? "text-emerald-300" : props.testResult?.status === "failed" ? "text-red-300" : "text-amber-300";
  const evidenceLabel = props.testResult?.executionMode === "prevalidated_fixture" ? "Prevalidated verification evidence" : "Executed test evidence";

  function updateCode(value: string) {
    if (!editable) return;
    props.setFiles(props.files.map((file) => file.path === selected.path ? { ...file, content: value } : file));
  }

  return (
    <div className="mx-auto max-w-[1680px] p-3 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8 bg-[#111419] px-4 py-3"><div className="flex flex-wrap items-center gap-3"><span className="rounded-lg border border-red-400/20 bg-red-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-red-300">1 validated fault</span><div><h1 className="text-sm font-medium text-zinc-100">{props.challenge.title}</h1><div className="text-xs text-zinc-600">{props.challenge.targetSkill} · {difficultyLabel(props.challenge.difficulty)}</div></div><span className="rounded-full border border-white/8 px-2.5 py-1 text-[10px] text-zinc-500">{sourceLabel(props.challenge)}</span></div><div className="flex items-center gap-2"><button type="button" onClick={props.onReset} className="rounded-lg border border-white/8 px-3 py-2 text-xs text-zinc-500 hover:text-zinc-300">Reset lab</button><button type="button" disabled={props.requestState === "running"} onClick={props.onRunTests} className="rounded-lg bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-white disabled:opacity-50">{props.requestState === "running" ? "Running in isolation…" : "Run tests"}</button></div></div>
      {(props.message || props.error) && <div role={props.error ? "alert" : "status"} className={`mb-3 rounded-xl border px-4 py-2.5 text-xs leading-5 ${props.error ? "border-red-400/15 bg-red-400/[0.05] text-red-300" : "border-amber-400/15 bg-amber-400/[0.04] text-amber-200"}`}>{props.error || props.message}</div>}
      <div className="grid gap-3 xl:grid-cols-[260px_minmax(0,1fr)_370px]">
        <aside aria-label="Challenge overview" className="overflow-hidden rounded-xl border border-white/8 bg-[#101318]"><div className="border-b border-white/7 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">Challenge brief</div><div className="p-4"><h2 className="text-sm font-medium leading-5 text-zinc-100">{props.challenge.title}</h2><p className="mt-3 text-xs leading-5 text-zinc-500">{props.challenge.learnerBrief}</p><div className="mt-5 rounded-lg border border-white/7 bg-black/20 p-3"><div className="text-[10px] uppercase tracking-wider text-zinc-600">Learning objective</div><div className="mt-1 text-xs leading-5 text-zinc-300">{props.challenge.learningObjective}</div></div></div><div className="border-y border-white/7 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">Project files</div><div className="p-2 text-xs">{props.challenge.files.map((file) => <button key={file.path} type="button" onClick={() => props.setActiveFile(file.path)} className={`mt-1 block w-full rounded-lg px-3 py-2 text-left ${file.path === selected?.path ? "bg-amber-400/8 text-amber-200" : "text-zinc-600 hover:bg-white/[0.03] hover:text-zinc-400"}`}><span className="mr-2">{file.editable ? "◆" : "◇"}</span>{file.path}<span className="ml-2 text-[9px] uppercase text-zinc-400">{file.editable ? "editable" : "read only"}</span></button>)}</div></aside>
        <section className="min-w-0 overflow-hidden rounded-xl border border-white/8 bg-[#0d1013]"><div className="flex items-center justify-between border-b border-white/7 bg-[#111419] px-4 py-2.5"><div className="flex items-center gap-2 text-xs text-zinc-400"><span className={editable ? "text-amber-300" : "text-zinc-600"}>●</span>{selected?.path}<span className="text-zinc-700">{editable ? "editable" : "read only"}</span></div><div className="text-[10px] text-zinc-600">Python 3.12</div></div><textarea aria-label={editable ? "Python code editor" : `Read-only ${selected?.path}`} value={content} readOnly={!editable} onChange={(event) => updateCode(event.target.value)} spellCheck={false} className={`h-[390px] w-full resize-none border-0 bg-[#0c0f12] p-5 font-mono text-[13px] leading-6 outline-none ${editable ? "text-zinc-300 focus:ring-2 focus:ring-inset focus:ring-amber-400/30" : "text-zinc-500"}`} /><div className="border-t border-white/7 bg-[#090c0f]"><div className="flex items-center justify-between border-b border-white/7 px-4 py-2.5"><div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{evidenceLabel}</div>{props.testResult && <div className={`text-[10px] ${statusTone}`}><span className="font-semibold uppercase">{props.testResult.status}</span> · {props.testResult.passedCount} passed · {props.testResult.failedCount} failed · {props.testResult.durationMs}ms</div>}</div><pre aria-label="Sanitized test output" className="h-[220px] overflow-auto whitespace-pre-wrap p-4 font-mono text-[11px] leading-5 text-zinc-500">{props.testResult?.sanitizedOutput ?? "Run the suite to collect evidence."}</pre></div></section>
        <aside aria-label="Investigation journal" className="overflow-hidden rounded-xl border border-white/8 bg-[#101318]">
          <div className="border-b border-white/7 px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">Investigation log</div>
            <p className="mt-1 text-xs text-zinc-500">Reason first. Ask for detail only when blocked.</p>
          </div>
          <div className="space-y-5 p-4">
            <label className="block">
              <span className="mb-2 block text-xs font-medium text-zinc-300">Current hypothesis</span>
              <textarea value={props.hypothesis} onChange={(event) => props.setHypothesis(event.target.value)} placeholder="What do you think is causing the failure?" className="h-24 w-full resize-none rounded-xl border border-white/8 bg-black/20 p-3 text-xs leading-5 text-zinc-300 outline-none placeholder:text-zinc-700 focus:ring-2 focus:ring-amber-400/30" />
            </label>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-300">Hypothesis revisions</span>
                <span className="text-[10px] text-zinc-600">{props.hypothesisHistory.length} recorded</span>
              </div>
              {props.hypothesisHistory.length > 0 ? (
                <ol aria-label="Recorded hypothesis revisions" className="max-h-28 space-y-1.5 overflow-auto">
                  {props.hypothesisHistory.slice(-3).map((revision, index) => (
                    <li key={`${revision}-${index}`} className="rounded-lg border border-white/7 bg-black/15 px-3 py-2 text-[11px] leading-4 text-zinc-500">
                      <span className="mr-2 text-amber-300">{props.hypothesisHistory.length - Math.min(3, props.hypothesisHistory.length) + index + 1}.</span>{revision}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-[10px] leading-4 text-zinc-600">A revision is recorded when you run tests, request a hint, or submit.</p>
              )}
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between"><span className="text-xs font-medium text-zinc-300">Progressive hints</span><span className="text-[10px] text-zinc-600">{props.revealedHints.length}/3 used</span></div>
              <div className="space-y-2">{props.revealedHints.map((hint, index) => <div key={hint} className="rounded-xl border border-amber-400/12 bg-amber-400/[0.04] p-3 text-xs leading-5 text-zinc-400"><span className="mr-2 text-[10px] font-semibold text-amber-300">0{index + 1}</span>{hint}</div>)}</div>
              {props.revealedHints.length < props.challenge.availableHintCount && <button type="button" disabled={props.hypothesis.trim().length < 12 || props.requestState === "running"} onClick={props.revealHint} className="mt-2 w-full rounded-xl border border-white/8 px-3 py-2.5 text-xs text-zinc-400 transition hover:border-amber-400/25 hover:text-amber-200 disabled:opacity-35">{props.requestState === "running" ? "Requesting hint…" : `Reveal hint ${props.revealedHints.length + 1}`}</button>}
            </div>
            <label className="block"><span className="mb-2 block text-xs font-medium text-zinc-300">Root-cause explanation</span><textarea value={props.explanation} onChange={(event) => props.setExplanation(event.target.value)} placeholder="Explain the failure and why your patch is correct." className="h-24 w-full resize-none rounded-xl border border-white/8 bg-black/20 p-3 text-xs leading-5 text-zinc-300 outline-none placeholder:text-zinc-700 focus:ring-2 focus:ring-amber-400/30" /></label>
            <button type="button" disabled={props.requestState === "running"} onClick={props.onSubmit} className="w-full rounded-xl bg-amber-400 px-4 py-3 text-sm font-semibold text-[#1b1206] hover:bg-amber-300 disabled:opacity-50">{props.requestState === "running" ? "Verifying exact snapshot…" : "Submit patch + reasoning"}</button>
            <p className="text-[10px] leading-4 text-zinc-600">Submission reruns tests against this exact source snapshot. Model feedback cannot override failing evidence.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ReportView({
  challenge,
  response,
  onPracticeAgain,
  onNewLab,
}: {
  challenge: PublicChallenge;
  response: AssessmentResponse;
  onPracticeAgain: () => void;
  onNewLab: () => void;
}) {
  const result = response.assessment;
  const verified = result.completionStatus === "verified";
  const overall = Math.round((result.rootCauseScore + result.reasoningScore + result.patchDisciplineScore + result.conceptUnderstandingScore) / 4);
  const reasoningSource = response.assessmentSource === "gpt-5.6" ? "GPT-5.6 structured rubric" : "Deterministic reasoning rubric";
  const prevalidatedEvidence = response.testResult.executionMode === "prevalidated_fixture";
  const cards = [["Root-cause accuracy", result.rootCauseScore, reasoningSource], ["Causal reasoning", result.reasoningScore, reasoningSource], ["Patch discipline", result.patchDisciplineScore, `${response.changedLines} changed line${response.changedLines === 1 ? "" : "s"}`], ["Concept understanding", result.conceptUnderstandingScore, challenge.targetSkill]] as const;

  return (
    <div className="grid-texture min-h-[calc(100vh-4rem)] px-5 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <div className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl border text-xl ${verified ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" : "border-red-400/25 bg-red-400/10 text-red-300"}`}>{verified ? "✓" : "!"}</div>
          <div className={`mt-5 text-xs font-semibold uppercase tracking-[0.2em] ${verified ? "text-emerald-300" : "text-red-300"}`}>{verified ? "Repair verified" : "Repair not verified"}</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">{verified ? "You proved the fix, not just the outcome." : "The evidence found more work to do."}</h1>
          <p className="mt-2 text-sm font-medium text-zinc-300">{challenge.title}</p>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-500">{result.evidenceSummary}</p>
        </div>
        <div className="mt-9 grid gap-4 lg:grid-cols-[280px_1fr]">
          <section className="rounded-2xl border border-white/9 bg-[#111419]/95 p-6 text-center">
            <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">Skill evidence — not a certification</div>
            <div className={`mx-auto mt-5 grid h-36 w-36 place-items-center rounded-full border-[10px] ${verified ? "border-emerald-400/15 bg-emerald-400/[0.04]" : "border-red-400/15 bg-red-400/[0.04]"}`}>
              <div><div className="text-4xl font-semibold text-white">{overall}</div><div className={`text-[10px] uppercase tracking-wider ${verified ? "text-emerald-300" : "text-red-300"}`}>{verified ? "Verified" : "Not verified"}</div></div>
            </div>
            <div className="mt-5 text-sm font-medium text-zinc-200">{challenge.targetSkill}</div>
            <div className="mt-1 text-xs text-zinc-600">{difficultyLabel(challenge.difficulty)} · {sourceLabel(challenge)}</div>
          </section>
          <section className="rounded-2xl border border-white/9 bg-[#111419]/95 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><div className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">Evidence breakdown</div><h2 className="mt-1 text-lg font-medium text-white">Deterministic proof and reasoning assessment</h2></div>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/8 px-3 py-1.5 text-[10px] uppercase tracking-wider text-emerald-300">Tests authoritative</span>
            </div>
            <div className="mt-5 rounded-xl border border-white/7 bg-black/15 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-medium text-zinc-300">{prevalidatedEvidence ? "Prevalidated fixture gate" : "Executed Code Interpreter tests"}</span><span className={response.testResult.status === "passed" ? "text-xs font-semibold text-emerald-300" : "text-xs font-semibold text-red-300"}>{response.testResult.status.toUpperCase()} · {response.testResult.passedCount} passed · {response.testResult.failedCount} failed</span></div>
              <p className="mt-2 text-[11px] text-zinc-600">{prevalidatedEvidence ? "Server-side comparison with the approved repair snapshot; no learner Python ran on the application host." : "Isolated Code Interpreter execution evidence. It cannot be overridden by narrative assessment."}</p>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {cards.map(([label, score, note]) => <div key={label} className="rounded-xl border border-white/7 bg-black/15 p-4"><div className="flex items-center justify-between"><span className="text-xs text-zinc-400">{label}</span><span className="text-sm font-semibold text-zinc-100">{score}</span></div><div className="mt-3 h-1 overflow-hidden rounded-full bg-white/5"><div className={`h-full rounded-full ${verified ? "bg-emerald-400/70" : "bg-amber-400/70"}`} style={{ width: `${score}%` }} /></div><div className="mt-2 text-[10px] text-zinc-600">{note}</div></div>)}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-400/12 bg-emerald-400/[0.04] p-4"><div className="text-[10px] uppercase tracking-wider text-emerald-300">Key strength</div><p className="mt-2 text-xs leading-5 text-zinc-400">{result.strengths[0]}</p></div>
              <div className="rounded-xl border border-amber-400/12 bg-amber-400/[0.04] p-4"><div className="text-[10px] uppercase tracking-wider text-amber-300">Primary improvement</div><p className="mt-2 text-xs leading-5 text-zinc-400">{result.improvementAreas[0]}</p></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-[10px] text-zinc-600">
              <span className="rounded-full border border-white/7 px-2.5 py-1">Assessment: {response.assessmentSource === "gpt-5.6" ? "GPT-5.6 structured rubric" : "Deterministic fallback rubric"}</span>
              <span className="rounded-full border border-white/7 px-2.5 py-1">Hints: {response.hintsUsed}/3</span>
              <span className="rounded-full border border-white/7 px-2.5 py-1">Test runs: {response.testRuns}</span>
              <span className="rounded-full border border-white/7 px-2.5 py-1">Files changed: {response.changedFiles.length > 0 ? response.changedFiles.join(", ") : "none"}</span>
              <span className="rounded-full border border-white/7 px-2.5 py-1">Time: {elapsedLabel(response.elapsedSeconds)}</span>
              <span className="rounded-full border border-white/7 px-2.5 py-1">Hypothesis revisions: {response.hypothesisRevisions}</span>
            </div>
          </section>
        </div>
        <div className="mt-5 rounded-xl border border-white/8 bg-[#111419]/90 p-4 text-center text-xs text-zinc-500"><span className="font-medium text-zinc-300">Practice next:</span> {result.nextPracticeRecommendation}</div>
        <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row"><button type="button" onClick={onPracticeAgain} className="rounded-xl border border-white/10 px-5 py-3 text-sm text-zinc-300 hover:border-white/20">Practice this lab again</button><button type="button" onClick={onNewLab} className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-[#1b1206] hover:bg-amber-300">Choose another system</button></div>
      </div>
    </div>
  );
}
