"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { GuidedRoadmap } from "@/components/guided-roadmap";
import { ProgressDashboard } from "@/components/progress-dashboard";
import { useCloudProgressSync, type CloudProgressSync } from "@/components/progress-sync";
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
import {
  emptyLearningProgress,
  getLearningRecommendation,
  getLearningStep,
  learningSteps,
  parseLearningProgress,
  recordLearningCompletion,
  type LearningProgress,
  type LearningStep,
  type LearningStepId,
} from "@/lib/learning-paths";
import {
  deriveAttemptSummary,
  parseAttemptHistory,
  type AttemptSummary,
} from "@/lib/progress-contracts";
import { buildLearnerProfile, recordAttemptSummary } from "@/lib/progress-merge";

type Stage = "configure" | "forging" | "workspace" | "report";
type RequestState = "idle" | "running";
type LearningMode = "guided" | "catalog" | "progress";
type NetworkAction = "generate" | "execute" | "hint" | "assess";

const ATTEMPT_KEY = "faultsmith:attempt:v2";
const EVENT_KEY = "faultsmith:events:v1";
const LEARNING_PROGRESS_KEY = "faultsmith:learning-progress:v1";
// Attempt summaries live in a dedicated key, separate from the prose-rich
// active attempt (ATTEMPT_KEY) and the anonymous telemetry stream (EVENT_KEY).
const ATTEMPT_HISTORY_KEY = "faultsmith:attempt-history:v1";
const difficultyOptions: Array<{ value: Difficulty; label: string }> = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

function BrandMark() {
  return (
    <span
      aria-hidden="true"
      className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl border border-amber-300/25 bg-[linear-gradient(145deg,rgba(242,184,75,0.14),rgba(105,208,203,0.035))] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
    >
      <span className="h-3.5 w-3.5 rotate-45 rounded-[3px] border-2 border-amber-200" />
      <span className="absolute bottom-1.5 h-[2px] w-4 rounded-full bg-cyan-200/60" />
      <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-amber-300/15 blur-sm" />
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
      ? "Learning roadmap ready"
      : stage === "forging"
        ? "Validation in progress"
        : stage === "workspace"
          ? "Investigation active"
          : verified
            ? "Repair verified"
            : "Attempt reviewed";

  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-[#090c10]/88 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.5rem] max-w-[1480px] items-center justify-between px-5 lg:px-8">
        <div className="flex items-center gap-3">
          <BrandMark />
          <div>
            <div className="font-instrument text-[13px] font-semibold tracking-[0.2em] text-[#f6f1e6]">FAULTSMITH</div>
            <div className="font-instrument text-[9px] uppercase tracking-[0.17em] text-zinc-500">Deliberate debugging practice</div>
          </div>
        </div>
        <div className="hidden items-center gap-2.5 text-xs text-zinc-400 sm:flex">
          <span className="status-pill px-3 py-1.5">
            <StatusDot tone={stage === "report" ? (verified ? "green" : "red") : "amber"} />
            <span className="ml-2">{status}</span>
          </span>
          <span className="status-pill px-3 py-1.5 text-zinc-500">Build Week MVP</span>
        </div>
      </div>
    </header>
  );
}

async function postJson(path: string, body: unknown, extraHeaders?: Record<string, string>) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json", ...extraHeaders },
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
  return challenge.source === "generated" ? "GPT-5.6 live contract · Code Interpreter" : "Prevalidated fixture · deterministic verifier";
}

function difficultyLabel(difficulty: Difficulty) {
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
}

function elapsedLabel(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

function overallAssessmentScore(response: AssessmentResponse) {
  const result = response.assessment;
  return Math.round((result.rootCauseScore + result.reasoningScore + result.patchDisciplineScore + result.conceptUnderstandingScore) / 4);
}

function createAttemptId() {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {}
  return `attempt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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
  const [learningMode, setLearningMode] = useState<LearningMode>("guided");
  const [learningProgress, setLearningProgress] = useState<LearningProgress>(emptyLearningProgress);
  const [attemptHistory, setAttemptHistory] = useState<AttemptSummary[]>([]);
  const [selectedLearningStepId, setSelectedLearningStepId] = useState<LearningStepId>(learningSteps[0].id);
  const [activeLearningStepId, setActiveLearningStepId] = useState<LearningStepId | null>(null);
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
  const requestLocks = useRef<Set<NetworkAction>>(new Set());

  const project = useMemo(
    () => projects.find((item) => item.id === projectId) ?? projects[0],
    [projectId],
  );

  const learnerProfile = useMemo(
    () => buildLearnerProfile(learningProgress, attemptHistory),
    [learningProgress, attemptHistory],
  );

  // Optional account synchronization. Guest/local progress remains the
  // default reliability path; this hook only adds cloud state on top and can
  // never block or alter the deterministic learning loop.
  const cloudSync = useCloudProgressSync(learnerProfile);

  useEffect(() => {
    const progressTimer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(LEARNING_PROGRESS_KEY);
        if (!raw) return;
        const restoredProgress = parseLearningProgress(JSON.parse(raw));
        const recommendation = getLearningRecommendation(restoredProgress);
        setLearningProgress(restoredProgress);
        if (recommendation.step) setSelectedLearningStepId(recommendation.step.id);
      } catch {
        window.localStorage.removeItem(LEARNING_PROGRESS_KEY);
      }
      try {
        const rawHistory = window.localStorage.getItem(ATTEMPT_HISTORY_KEY);
        if (!rawHistory) return;
        setAttemptHistory(parseAttemptHistory(JSON.parse(rawHistory)));
      } catch {
        window.localStorage.removeItem(ATTEMPT_HISTORY_KEY);
      }
    }, 0);
    return () => window.clearTimeout(progressTimer);
  }, []);

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
        const restoredLearningStep = getLearningStep(
          typeof saved.learningStepId === "string" ? saved.learningStepId : null,
        );
        if (
          restoredLearningStep
          && restoredLearningStep.projectId === savedChallenge.data.projectId
          && restoredLearningStep.targetSkill === savedChallenge.data.targetSkill
        ) {
          setActiveLearningStepId(restoredLearningStep.id);
          setSelectedLearningStepId(restoredLearningStep.id);
          setLearningMode("guided");
        }
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
          learningStepId: activeLearningStepId,
        }),
      );
    } catch {}
  }, [challenge, files, activeFile, hypothesis, hypothesisHistory, revealedHints, explanation, testRuns, startedAt, assessment, activeLearningStepId, stage]);

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

  function acquireRequestLock(action: NetworkAction) {
    if (requestLocks.current.has(action)) return false;
    requestLocks.current.add(action);
    return true;
  }

  function releaseRequestLock(action: NetworkAction) {
    requestLocks.current.delete(action);
  }

  async function forgeChallenge(
    useLive = preferLive,
    selection?: { projectId: ProjectId; targetSkill: string; difficulty: Difficulty },
  ) {
    const selectedProjectId = selection?.projectId ?? projectId;
    const selectedSkill = selection?.targetSkill ?? skill;
    const selectedDifficulty = selection?.difficulty ?? difficulty;
    if (!selectedSkill || !selectedDifficulty) return;
    if (!acquireRequestLock("generate")) return;
    trackAnonymousEvent("project_selected", { projectId: selectedProjectId, outcome: "generation_confirmed" });
    trackAnonymousEvent("generation_started", {
      projectId: selectedProjectId,
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
          projectId: selectedProjectId,
          targetSkill: selectedSkill,
          difficulty: selectedDifficulty,
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
      trackAnonymousEvent("generation_failed", { projectId: selectedProjectId, outcome: "safe_error" });
      trackAnonymousEvent("validation_failed", { projectId: selectedProjectId, outcome: "challenge_not_released" });
      setError(requestError instanceof Error ? requestError.message : "Challenge generation failed.");
      setStage("configure");
    } finally {
      window.clearInterval(timer);
      releaseRequestLock("generate");
      setRequestState("idle");
    }
  }

  function startGuidedStep(step: LearningStep) {
    setLearningMode("guided");
    setSelectedLearningStepId(step.id);
    setActiveLearningStepId(step.id);
    setProjectId(step.projectId);
    setSkill(step.targetSkill);
    setDifficulty(step.difficulty);
    setPreferLive(false);
    void forgeChallenge(false, {
      projectId: step.projectId,
      targetSkill: step.targetSkill,
      difficulty: step.difficulty,
    });
  }

  async function runTests() {
    if (!challenge) return;
    if (!acquireRequestLock("execute")) return;
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
      releaseRequestLock("execute");
      setRequestState("idle");
    }
  }

  async function revealHint() {
    if (!challenge || hypothesis.trim().length < 12 || revealedHints.length >= 3) return;
    if (!acquireRequestLock("hint")) return;
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
      releaseRequestLock("hint");
      setRequestState("idle");
    }
  }

  async function submitAttempt() {
    if (!challenge) return;
    if (hypothesis.trim().length < 12) {
      setError("Record a specific debugging hypothesis before submitting.");
      return;
    }
    if (explanation.trim().length < 24) {
      setError("Explain the root cause and why your change fixes it.");
      return;
    }
    if (!acquireRequestLock("assess")) return;
    const submittedHypotheses = recordHypothesis();
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
      // A fresh ID token is requested only at protected request time and only
      // attached to this same-origin call; it is never stored. Token failure
      // degrades to an anonymous submission and never blocks the assessment.
      const authHeader = await cloudSync.getAssessAuthHeader();
      const data = await postJson(
        "/api/challenges/assess",
        {
          challengeId: challenge.challengeId,
          files,
          executionMode: challenge.source === "generated" ? "code_interpreter" : "prevalidated_fixture",
          hypothesis,
          hypothesisHistory: submittedHypotheses,
          explanation,
          hintsUsed: revealedHints.length,
          testRuns: submittedRuns,
          elapsedSeconds: Math.min(86_400, Math.max(0, Math.round((Date.now() - startedAt) / 1_000))),
        },
        authHeader,
      );
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
      try {
        // Persist only the strict bounded summary — no source, prose, hints,
        // or test output — into the dedicated local attempt-history key.
        const derivationBase = {
          attemptId: createAttemptId(),
          projectId: challenge.projectId,
          skill: challenge.targetSkill,
          difficulty: challenge.difficulty,
          challengeSource: challenge.source,
          completedAt: Date.now(),
          response: parsed.data,
        };
        const attemptSummary =
          deriveAttemptSummary({ ...derivationBase, lessonId: activeLearningStepId ?? null })
          ?? deriveAttemptSummary({ ...derivationBase, lessonId: null });
        if (attemptSummary) {
          const nextHistory = recordAttemptSummary(attemptHistory, attemptSummary);
          setAttemptHistory(nextHistory);
          window.localStorage.setItem(ATTEMPT_HISTORY_KEY, JSON.stringify(nextHistory));
        }
      } catch {
        // Local attempt history is optional evidence and never blocks the authoritative report.
      }
      if (parsed.data.assessment.completionStatus === "verified" && activeLearningStepId) {
        const nextProgress = recordLearningCompletion(learningProgress, {
          stepId: activeLearningStepId,
          completedAt: Date.now(),
          overallScore: overallAssessmentScore(parsed.data),
          hintsUsed: revealedHints.length,
          testRuns: submittedRuns,
        });
        setLearningProgress(nextProgress);
        try {
          window.localStorage.setItem(LEARNING_PROGRESS_KEY, JSON.stringify(nextProgress));
        } catch {
          // Guided progress is optional local state and never blocks an authoritative report.
        }
      }
      // Local report and progress are already recorded above; the bounded
      // cloudSync fact only updates the sync surface afterwards.
      cloudSync.afterAssessment(parsed.data.cloudSync);
      setStage("report");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The submission failed safely.");
    } finally {
      releaseRequestLock("assess");
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
    const recommendation = getLearningRecommendation(learningProgress);
    setChallenge(null);
    setFiles([]);
    setSkill("");
    setDifficulty("");
    setActiveLearningStepId(null);
    if (recommendation.step) setSelectedLearningStepId(recommendation.step.id);
    setAssessment(null);
    setMessage("");
    setError("");
    setStage("configure");
  }

  const verified = assessment?.assessment.completionStatus === "verified";
  const activeLearningStep = getLearningStep(activeLearningStepId);

  return (
    <main className="min-h-screen">
      <AppHeader stage={stage} verified={verified} />
      <div className="sr-only" aria-live="polite">{requestState === "running" ? "Request in progress" : message || error}</div>
      {stage === "configure" && (
        <ConfigureView
          learningMode={learningMode}
          setLearningMode={setLearningMode}
          learningProgress={learningProgress}
          cloudSync={cloudSync}
          selectedLearningStepId={selectedLearningStepId}
          setSelectedLearningStepId={setSelectedLearningStepId}
          onStartGuidedStep={startGuidedStep}
          projectId={projectId}
          setProjectId={(id) => {
            trackAnonymousEvent("project_selected", { projectId: id, outcome: "selected" });
            setActiveLearningStepId(null);
            setProjectId(id);
            setSkill("");
          }}
          skill={skill}
          setSkill={setSkill}
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          preferLive={preferLive}
          setPreferLive={setPreferLive}
          onForge={() => {
            setActiveLearningStepId(null);
            void forgeChallenge();
          }}
          onFallback={() => {
            setActiveLearningStepId(null);
            void forgeChallenge(false);
          }}
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
        <ReportView
          challenge={challenge}
          response={assessment}
          guidedStep={activeLearningStep}
          learningProgress={learningProgress}
          onPracticeAgain={resetLab}
          onNewLab={chooseNewLab}
        />
      )}
    </main>
  );
}

type ConfigureProps = {
  learningMode: LearningMode;
  setLearningMode: (mode: LearningMode) => void;
  learningProgress: LearningProgress;
  cloudSync: CloudProgressSync;
  selectedLearningStepId: LearningStepId;
  setSelectedLearningStepId: (stepId: LearningStepId) => void;
  onStartGuidedStep: (step: LearningStep) => void;
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
    <div className="grid-texture min-h-[calc(100vh-4.5rem)]">
      <div className="mx-auto max-w-[1480px] px-5 py-10 lg:px-8 lg:py-14">
        <div className="motion-rise grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="max-w-3xl">
            <div className="instrument-label mb-5 flex items-center gap-2 text-amber-300"><span className="h-px w-9 bg-amber-300/65" />Controlled failure. Measurable learning.</div>
            <h1 className="max-w-3xl text-[2.65rem] font-semibold leading-[0.98] tracking-[-0.05em] text-[#f7f3eb] sm:text-6xl lg:text-[4.25rem]">Learn to debug code you<span className="text-zinc-500"> didn&apos;t write.</span></h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">Build the habit AI shortcuts skip: read evidence, form a hypothesis, and prove the smallest repair inside a validated Python lab.</p>
          </div>
          <aside aria-label="FaultSmith learning method" className="workflow-rail hidden rounded-2xl p-4 lg:block">
            <div className="instrument-label text-cyan-200">The investigation loop</div>
            <ol className="mt-4 grid grid-cols-2 gap-2">
              {[
                ["01", "Observe", "Read executed evidence"],
                ["02", "Hypothesize", "Explain the causal chain"],
                ["03", "Repair", "Change the smallest surface"],
                ["04", "Verify", "Prove the exact snapshot"],
              ].map(([number, title, note]) => (
                <li key={number} className="evidence-well rounded-xl p-3">
                  <div className="font-instrument text-[9px] tracking-[0.14em] text-amber-300">{number}</div>
                  <div className="mt-2 text-xs font-semibold text-zinc-200">{title}</div>
                  <div className="mt-1 text-[10px] leading-4 text-zinc-500">{note}</div>
                </li>
              ))}
            </ol>
          </aside>
        </div>
        <div role="group" aria-label="Learning mode" className="mode-switcher mt-9">
          <button type="button" aria-pressed={props.learningMode === "guided"} onClick={() => props.setLearningMode("guided")} className="mode-tab">Guided roadmap</button>
          <button type="button" aria-pressed={props.learningMode === "catalog"} onClick={() => props.setLearningMode("catalog")} className="mode-tab">Practice by skill</button>
          <button type="button" aria-pressed={props.learningMode === "progress"} onClick={() => props.setLearningMode("progress")} className="mode-tab">My Progress</button>
        </div>
        {props.learningMode === "guided" ? (
          <div className="mt-10">
            <GuidedRoadmap
              progress={props.learningProgress}
              selectedStepId={props.selectedLearningStepId}
              onSelectStep={props.setSelectedLearningStepId}
              onStartStep={props.onStartGuidedStep}
            />
          </div>
        ) : props.learningMode === "progress" ? (
          <div className="mt-10">
            <ProgressDashboard
              profile={props.cloudSync.displayProfile}
              onStartStep={props.onStartGuidedStep}
              sync={props.cloudSync}
            />
          </div>
        ) : (
        <div className="motion-rise mt-12 grid gap-7 xl:grid-cols-[1fr_390px]">
          <section aria-labelledby="project-heading">
            <div className="mb-4 flex items-end justify-between"><div><div className="instrument-label">Step 01 · Select evidence domain</div><h2 id="project-heading" className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-white">Choose a system to investigate</h2></div><div className="font-instrument hidden text-[10px] text-zinc-500 md:block">3 curated Python systems</div></div>
            <div className="grid gap-4 md:grid-cols-3">
              {projects.map((project) => {
                const active = props.projectId === project.id;
                return (
                  <button key={project.id} type="button" aria-pressed={active} onClick={() => props.setProjectId(project.id)} className={`group relative min-h-72 overflow-hidden rounded-2xl p-5 text-left transition duration-200 focus-visible:outline-none ${active ? "lab-panel-raised" : "lab-panel hover:-translate-y-0.5 hover:border-white/20"}`}>
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
          <aside className="lab-panel self-start rounded-2xl p-5 xl:sticky xl:top-24">
            <div className="instrument-label">Step 02 · Configure validation</div><h2 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-white">Forge the challenge</h2>
            <div className="mt-7 space-y-6">
              <label className="block"><span className="mb-2 block text-xs font-medium text-zinc-400">Target skill</span><select value={props.skill} onChange={(event) => props.setSkill(event.target.value)} className="evidence-well w-full rounded-xl px-3.5 py-3 text-sm text-zinc-200 outline-none"><option value="">Select a skill</option>{selected.skills.map((item) => <option key={item}>{item}</option>)}</select></label>
              <fieldset><legend className="mb-2 text-xs font-medium text-zinc-400">Practice level</legend><div className="grid grid-cols-3 gap-2">{difficultyOptions.map((option) => <button key={option.value} type="button" aria-pressed={props.difficulty === option.value} onClick={() => props.setDifficulty(option.value)} className={`rounded-xl border px-2 py-2.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${props.difficulty === option.value ? "border-amber-400/40 bg-amber-400/10 text-amber-200" : "border-white/8 bg-black/10 text-zinc-500 hover:text-zinc-300"}`}>{option.label}</button>)}</div><p className="mt-2 text-[10px] leading-4 text-zinc-600">Labels this attempt; the curated fault is selected by system and skill.</p></fieldset>
              <fieldset><legend className="mb-2 text-xs font-medium text-zinc-400">Validation mode</legend><div className="grid grid-cols-2 gap-2"><button type="button" aria-pressed={props.preferLive} onClick={() => props.setPreferLive(true)} className={`rounded-xl border px-3 py-3 text-left text-xs ${props.preferLive ? "border-amber-400/35 bg-amber-400/[0.07] text-amber-200" : "border-white/8 text-zinc-500"}`}><span className="block font-medium">Live + fallback</span><span className="mt-1 block text-[10px] opacity-70">GPT-5.6 when configured</span></button><button type="button" aria-pressed={!props.preferLive} onClick={() => props.setPreferLive(false)} className={`rounded-xl border px-3 py-3 text-left text-xs ${!props.preferLive ? "border-emerald-400/30 bg-emerald-400/[0.06] text-emerald-200" : "border-white/8 text-zinc-500"}`}><span className="block font-medium">Prevalidated</span><span className="mt-1 block text-[10px] opacity-70">Reliable demo fixture</span></button></div></fieldset>
              <div className="rounded-xl border border-white/7 bg-black/20 p-4"><div className="flex items-center justify-between text-xs"><span className="text-zinc-500">Release gate</span><span className="text-emerald-300">Original pass → Mutant fail</span></div><div className="mt-3 h-1 overflow-hidden rounded-full bg-white/5"><div className="h-full w-full bg-gradient-to-r from-amber-500/60 to-emerald-400/70" /></div></div>
              {props.error && <div role="alert" className="rounded-xl border border-red-400/15 bg-red-400/[0.05] p-3 text-xs leading-5 text-red-300">{props.error}<button type="button" disabled={!ready} onClick={props.onFallback} className="mt-2 block font-semibold underline disabled:opacity-40">Load the prevalidated challenge</button></div>}
              <button type="button" disabled={!ready} onClick={props.onForge} className="primary-action forge-pulse flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold focus-visible:outline-none disabled:animate-none disabled:opacity-35">Forge debugging lab <span aria-hidden="true">→</span></button>
              <p className="text-center text-[11px] leading-5 text-zinc-600">Live mode asks GPT-5.6 to emit the approved bounded contract. Executed evidence decides whether it ships.</p>
            </div>
          </aside>
        </div>
        )}
      </div>
    </div>
  );
}

function ForgingView({ projectTitle, validationStep, preferLive }: { projectTitle: string; validationStep: number; preferLive: boolean }) {
  const steps = preferLive ? ["Inspecting curated project", "Requesting a schema-valid mutation", "Running original and mutated tests", "Stripping hidden fields and sealing the lab"] : ["Loading approved fixture contract", "Verifying the source allowlist", "Checking original and mutation evidence", "Sealing the prevalidated lab"];
  return (
    <div className="grid-texture grid min-h-[calc(100vh-4.5rem)] place-items-center px-5"><section aria-busy="true" className="lab-panel-raised motion-rise w-full max-w-xl rounded-3xl p-7 sm:p-10"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-amber-400/25 bg-amber-400/[0.07] forge-pulse"><BrandMark /></div><div className="mt-7 text-center"><div className="instrument-label text-amber-300">Forging challenge</div><h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">{projectTitle}</h1><p className="mt-2 text-sm text-zinc-500">One root cause. Reproducible evidence. No accidental failures.</p></div><div className="mt-8 space-y-2">{steps.map((step, index) => { const complete = index < validationStep; const active = index === validationStep; return <div key={step} className={`flex items-center justify-between rounded-xl border px-4 py-3 ${active ? "border-amber-400/25 bg-amber-400/[0.06]" : "border-white/6 bg-black/10"}`}><div className="flex items-center gap-3 text-sm"><span className={`font-instrument grid h-5 w-5 place-items-center rounded-full text-[10px] ${complete ? "bg-emerald-400/15 text-emerald-300" : active ? "bg-amber-400/15 text-amber-300" : "bg-white/5 text-zinc-600"}`}>{complete ? "✓" : index + 1}</span><span className={complete || active ? "text-zinc-200" : "text-zinc-600"}>{step}</span></div>{active && <span className="instrument-label text-amber-300">Active</span>}</div>; })}</div></section></div>
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
  const hasHypothesis = props.hypothesis.trim().length >= 12;
  const hasPatch = props.files.some((file) => {
    const original = props.challenge.files.find((candidate) => candidate.path === file.path);
    return Boolean(original?.editable && original.content !== file.content);
  });
  const investigationSteps = [
    { label: "Observe", note: "Evidence captured", complete: Boolean(props.testResult) },
    { label: "Hypothesize", note: hasHypothesis ? "Causal claim recorded" : "Record a causal claim", complete: hasHypothesis },
    { label: "Repair", note: hasPatch ? "Source snapshot changed" : "Edit the smallest surface", complete: hasPatch },
    { label: "Verify", note: props.testResult?.status === "passed" ? "Tests passing" : "Run the exact snapshot", complete: props.testResult?.status === "passed" },
  ];

  function updateCode(value: string) {
    if (!editable) return;
    props.setFiles(props.files.map((file) => file.path === selected.path ? { ...file, content: value } : file));
  }

  return (
    <div className="grid-texture motion-rise mx-auto min-h-[calc(100vh-4.5rem)] max-w-[1680px] p-3 sm:p-5">
      <div className="lab-panel mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3"><div className="flex flex-wrap items-center gap-3"><span className="font-instrument rounded-lg border border-red-400/20 bg-red-400/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-red-300">1 validated fault</span><div><h1 className="text-sm font-semibold text-zinc-100">{props.challenge.title}</h1><div className="font-instrument text-[10px] text-zinc-500">{props.challenge.targetSkill} · {difficultyLabel(props.challenge.difficulty)}</div></div><span className="status-pill px-2.5 py-1">{sourceLabel(props.challenge)}</span></div><div className="flex items-center gap-2"><button type="button" onClick={props.onReset} className="secondary-action rounded-lg px-3 py-2 text-xs">Reset lab</button><button type="button" disabled={props.requestState === "running"} onClick={props.onRunTests} className="rounded-lg bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-950 transition hover:-translate-y-0.5 hover:bg-white disabled:opacity-50">{props.requestState === "running" ? "Running in isolation…" : "Run tests"}</button></div></div>
      {(props.message || props.error) && <div role={props.error ? "alert" : "status"} className={`mb-3 rounded-xl border px-4 py-2.5 text-xs leading-5 ${props.error ? "border-red-400/15 bg-red-400/[0.05] text-red-300" : "border-amber-400/15 bg-amber-400/[0.04] text-amber-200"}`}>{props.error || props.message}</div>}
      <ol aria-label="Investigation workflow" className="workflow-rail mb-3 grid gap-px overflow-hidden rounded-xl sm:grid-cols-4">
        {investigationSteps.map((step, index) => (
          <li key={step.label} className={`relative flex items-center gap-3 px-4 py-3 ${step.complete ? "bg-emerald-400/[0.035]" : "bg-white/[0.012]"}`}>
            <span className={`font-instrument grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[9px] ${step.complete ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200" : "border-white/10 bg-black/20 text-zinc-500"}`}>{step.complete ? "✓" : index + 1}</span>
            <span><span className="block text-xs font-semibold text-zinc-200">{step.label}</span><span className="font-instrument mt-0.5 block text-[9px] leading-4 text-zinc-500">{step.note}</span></span>
          </li>
        ))}
      </ol>
      <div className="grid gap-3 xl:grid-cols-[260px_minmax(0,1fr)_370px]">
        <aside aria-label="Challenge overview" className="lab-panel overflow-hidden rounded-xl"><div className="instrument-label border-b border-white/7 px-4 py-3">Challenge brief</div><div className="p-4"><h2 className="text-sm font-semibold leading-5 text-zinc-100">{props.challenge.title}</h2><p className="mt-3 text-xs leading-5 text-zinc-500">{props.challenge.learnerBrief}</p><div className="evidence-well mt-5 rounded-lg p-3"><div className="instrument-label">Learning objective</div><div className="mt-1 text-xs leading-5 text-zinc-300">{props.challenge.learningObjective}</div></div></div><div className="instrument-label border-y border-white/7 px-4 py-3">Project files</div><div className="font-instrument p-2 text-xs">{props.challenge.files.map((file) => <button key={file.path} type="button" onClick={() => props.setActiveFile(file.path)} className={`mt-1 block w-full rounded-lg px-3 py-2 text-left transition ${file.path === selected?.path ? "bg-amber-400/[0.085] text-amber-200" : "text-zinc-600 hover:bg-white/[0.03] hover:text-zinc-300"}`}><span className="mr-2">{file.editable ? "◆" : "◇"}</span>{file.path}<span className="ml-2 text-[9px] uppercase text-zinc-400">{file.editable ? "editable" : "read only"}</span></button>)}</div></aside>
        <section className="lab-panel min-w-0 overflow-hidden rounded-xl"><div className="flex items-center justify-between border-b border-white/7 bg-[#0e1318] px-4 py-2.5"><div className="font-instrument flex items-center gap-2 text-[10px] text-zinc-400"><span className={editable ? "text-amber-300" : "text-zinc-600"}>●</span>{selected?.path}<span className="text-zinc-700">{editable ? "editable" : "read only"}</span></div><div className="font-instrument text-[9px] text-cyan-200/65">Python 3.12</div></div><textarea aria-label={editable ? "Python code editor" : `Read-only ${selected?.path}`} value={content} readOnly={!editable} onChange={(event) => updateCode(event.target.value)} spellCheck={false} className={`font-instrument h-[390px] w-full resize-none border-0 bg-[#080c10] p-5 text-[13px] leading-6 outline-none ${editable ? "text-zinc-300 focus:ring-2 focus:ring-inset focus:ring-amber-400/30" : "text-zinc-500"}`} /><div className="border-t border-white/7 bg-[#070a0d]"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/7 px-4 py-2.5"><div className="instrument-label">{evidenceLabel}</div>{props.testResult && <div className={`font-instrument text-[9px] ${statusTone}`}><span className="font-semibold uppercase">{props.testResult.status}</span> · {props.testResult.passedCount} passed · {props.testResult.failedCount} failed · {props.testResult.durationMs}ms</div>}</div><pre aria-label="Sanitized test output" className="font-instrument h-[220px] overflow-auto whitespace-pre-wrap p-4 text-[11px] leading-5 text-zinc-500">{props.testResult?.sanitizedOutput ?? "Run the suite to collect evidence."}</pre></div></section>
        <aside aria-label="Investigation journal" className="lab-panel overflow-hidden rounded-xl">
          <div className="border-b border-white/7 px-4 py-3">
            <div className="instrument-label">Investigation log</div>
            <p className="mt-1 text-xs text-zinc-500">Reason first. Ask for detail only when blocked.</p>
          </div>
          <div className="space-y-5 p-4">
            <label className="block">
              <span className="mb-2 block text-xs font-medium text-zinc-300">Current hypothesis</span>
              <textarea value={props.hypothesis} onChange={(event) => props.setHypothesis(event.target.value)} placeholder="What do you think is causing the failure?" className="evidence-well h-24 w-full resize-none rounded-xl p-3 text-xs leading-5 text-zinc-300 outline-none placeholder:text-zinc-700" />
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
            <label className="block"><span className="mb-2 block text-xs font-medium text-zinc-300">Root-cause explanation</span><textarea value={props.explanation} onChange={(event) => props.setExplanation(event.target.value)} placeholder="Explain the failure and why your patch is correct." className="evidence-well h-24 w-full resize-none rounded-xl p-3 text-xs leading-5 text-zinc-300 outline-none placeholder:text-zinc-700" /></label>
            <button type="button" disabled={props.requestState === "running"} onClick={props.onSubmit} className="primary-action w-full rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-50">{props.requestState === "running" ? "Verifying exact snapshot…" : "Submit patch + reasoning"}</button>
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
  guidedStep,
  learningProgress,
  onPracticeAgain,
  onNewLab,
}: {
  challenge: PublicChallenge;
  response: AssessmentResponse;
  guidedStep?: LearningStep;
  learningProgress: LearningProgress;
  onPracticeAgain: () => void;
  onNewLab: () => void;
}) {
  const result = response.assessment;
  const verified = result.completionStatus === "verified";
  const overall = overallAssessmentScore(response);
  const roadmapRecommendation = getLearningRecommendation(learningProgress);
  const reasoningSource = response.assessmentSource === "gpt-5.6" ? "GPT-5.6 bounded rubric scores" : "Deterministic reasoning rubric";
  const prevalidatedEvidence = response.testResult.executionMode === "prevalidated_fixture";
  const cards = [["Root-cause accuracy", result.rootCauseScore, reasoningSource], ["Causal reasoning", result.reasoningScore, reasoningSource], ["Patch discipline", result.patchDisciplineScore, `${response.changedLines} changed line${response.changedLines === 1 ? "" : "s"}`], ["Concept understanding", result.conceptUnderstandingScore, challenge.targetSkill]] as const;

  return (
    <div className="grid-texture min-h-[calc(100vh-4.5rem)] px-5 py-10 sm:py-12">
      <div className="motion-rise mx-auto max-w-5xl">
        <div className="text-center">
          <div className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl border text-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${verified ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" : "border-red-400/25 bg-red-400/10 text-red-300"}`}>{verified ? "✓" : "!"}</div>
          <div className={`instrument-label mt-5 ${verified ? "text-emerald-300" : "text-red-300"}`}>{verified ? "Repair verified" : "Repair not verified"}</div>
          <h1 className="mx-auto mt-2 max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">{verified ? "You proved the fix, not just the outcome." : "The evidence found more work to do."}</h1>
          <p className="mt-2 text-sm font-medium text-zinc-300">{challenge.title}</p>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-500">{result.evidenceSummary}</p>
        </div>
        <div className="mt-9 grid gap-4 lg:grid-cols-[280px_1fr]">
          <section className="lab-panel rounded-2xl p-6 text-center">
            <div className="instrument-label">Skill evidence — not a certification</div>
            <div className={`mx-auto mt-5 grid h-36 w-36 place-items-center rounded-full border-[10px] ${verified ? "border-emerald-400/15 bg-emerald-400/[0.04]" : "border-red-400/15 bg-red-400/[0.04]"}`}>
              <div><div className="text-4xl font-semibold text-white">{overall}</div><div className={`text-[10px] uppercase tracking-wider ${verified ? "text-emerald-300" : "text-red-300"}`}>{verified ? "Verified" : "Not verified"}</div></div>
            </div>
            <div className="mt-5 text-sm font-medium text-zinc-200">{challenge.targetSkill}</div>
            <div className="mt-1 text-xs text-zinc-600">{difficultyLabel(challenge.difficulty)} · {sourceLabel(challenge)}</div>
          </section>
          <section className="lab-panel rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><div className="instrument-label">Evidence breakdown</div><h2 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-white">Deterministic proof and reasoning assessment</h2></div>
              <span className="status-pill border-emerald-400/20 bg-emerald-400/[0.055] px-3 py-1.5 text-emerald-300">Tests authoritative</span>
            </div>
            <div className="evidence-well mt-5 rounded-xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-medium text-zinc-300">{prevalidatedEvidence ? "Prevalidated fixture gate" : "Executed Code Interpreter tests"}</span><span className={response.testResult.status === "passed" ? "text-xs font-semibold text-emerald-300" : "text-xs font-semibold text-red-300"}>{response.testResult.status.toUpperCase()} · {response.testResult.passedCount} passed · {response.testResult.failedCount} failed</span></div>
              <p className="mt-2 text-[11px] text-zinc-600">{prevalidatedEvidence ? "Server-side comparison with the approved repair snapshot; no learner Python ran on the application host." : "Isolated Code Interpreter execution evidence. It cannot be overridden by narrative assessment."}</p>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {cards.map(([label, score, note]) => <div key={label} className="evidence-well rounded-xl p-4"><div className="flex items-center justify-between"><span className="text-xs text-zinc-400">{label}</span><span className="font-instrument text-sm font-semibold text-zinc-100">{score}</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5"><div className={`h-full rounded-full ${verified ? "bg-gradient-to-r from-cyan-300/70 to-emerald-400/80" : "bg-gradient-to-r from-amber-300/80 to-amber-500/70"}`} style={{ width: `${score}%` }} /></div><div className="font-instrument mt-2 text-[9px] text-zinc-600">{note}</div></div>)}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-400/12 bg-emerald-400/[0.04] p-4"><div className="text-[10px] uppercase tracking-wider text-emerald-300">Key strength</div><p className="mt-2 text-xs leading-5 text-zinc-400">{result.strengths[0]}</p></div>
              <div className="rounded-xl border border-amber-400/12 bg-amber-400/[0.04] p-4"><div className="text-[10px] uppercase tracking-wider text-amber-300">Primary improvement</div><p className="mt-2 text-xs leading-5 text-zinc-400">{result.improvementAreas[0]}</p></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-[10px] text-zinc-600">
              <span className="rounded-full border border-white/7 px-2.5 py-1">Assessment: {response.assessmentSource === "gpt-5.6" ? "GPT-5.6 scores · server-owned feedback" : "Deterministic fallback rubric"}</span>
              <span className="rounded-full border border-white/7 px-2.5 py-1">Hints: {response.hintsUsed}/3</span>
              <span className="rounded-full border border-white/7 px-2.5 py-1">Test runs: {response.testRuns}</span>
              <span className="rounded-full border border-white/7 px-2.5 py-1">Files changed: {response.changedFiles.length > 0 ? response.changedFiles.join(", ") : "none"}</span>
              <span className="rounded-full border border-white/7 px-2.5 py-1">Time: {elapsedLabel(response.elapsedSeconds)}</span>
              <span className="rounded-full border border-white/7 px-2.5 py-1">Hypothesis revisions: {response.hypothesisRevisions}</span>
            </div>
          </section>
        </div>
        {guidedStep && (
          <section aria-label="Guided roadmap result" className={`lab-panel mt-5 rounded-xl p-4 ${verified ? "border-emerald-400/15" : "border-amber-400/15"}`}>
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <div className={`instrument-label ${verified ? "text-emerald-300" : "text-amber-300"}`}>{verified ? "Guided roadmap updated" : "Lesson remains incomplete"}</div>
                <h2 className="mt-1 text-sm font-medium text-zinc-100">Lesson {guidedStep.order}: {guidedStep.title}</h2>
                <p className="mt-1 text-xs leading-5 text-zinc-400">{verified ? `${learningProgress.completions.length}/9 lessons verified. ${roadmapRecommendation.reason}` : "Only a verified repair records curriculum progress. Review the evidence and try this lesson again."}</p>
              </div>
              {roadmapRecommendation.step && verified && <span className="shrink-0 rounded-full border border-white/8 px-3 py-1.5 text-[10px] text-zinc-300">Next: Lesson {roadmapRecommendation.step.order}</span>}
            </div>
          </section>
        )}
        <div className="lab-panel mt-5 rounded-xl p-4 text-center text-xs text-zinc-500"><span className="font-medium text-zinc-300">Practice next:</span> {result.nextPracticeRecommendation}</div>
        <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row"><button type="button" onClick={onPracticeAgain} className="secondary-action rounded-xl px-5 py-3 text-sm">Practice this lab again</button><button type="button" onClick={onNewLab} className="primary-action rounded-xl px-5 py-3 text-sm font-semibold">{guidedStep ? "Continue guided roadmap" : "Choose another system"}</button></div>
      </div>
    </div>
  );
}
