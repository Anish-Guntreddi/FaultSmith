"use client";

import { useEffect, useRef } from "react";

const chapters = [
  {
    number: "01",
    title: "Observe",
    eyebrow: "Executed evidence",
    description:
      "Start with the failure, not a guess. One retry-boundary assertion narrows the investigation to an exact threshold.",
    signal: "1 failed · 6 passed",
    tone: "red",
  },
  {
    number: "02",
    title: "Hypothesize",
    eyebrow: "Causal model",
    description:
      "Connect the failing boundary to the comparison that controls it. The exact retry limit slips past a strict greater-than check.",
    signal: "Cause isolated",
    tone: "amber",
  },
  {
    number: "03",
    title: "Repair",
    eyebrow: "Smallest surface",
    description:
      "Change only the condition supported by the evidence. The two-line diff preserves every behavior outside the failed boundary.",
    signal: "1 condition changed",
    tone: "cyan",
  },
  {
    number: "04",
    title: "Verify",
    eyebrow: "Proof, not confidence",
    description:
      "Run the full focused suite again. The repair is complete only when the original failure is gone and the surrounding tests remain green.",
    signal: "7 passed · verified",
    tone: "green",
  },
] as const;

function CaseMonitor() {
  return (
    <div className="case-monitor-scene" aria-hidden="true">
      <div className="case-monitor-shell" data-case-monitor>
        <div className="case-monitor-bar">
          <span className="case-monitor-lights"><i /><i /><i /></span>
          <span>retry_policy.py · controlled case</span>
          <span>FS-017</span>
        </div>
        <div className="case-monitor-screen">
          <div className="case-visual-stage" data-case-visual-stage="0">
            <div className="case-terminal-label" data-case-line>OBSERVE / TEST EVIDENCE</div>
            <div className="case-code-line text-zinc-300" data-case-line><span className="text-zinc-600">$</span> pytest -q</div>
            <div className="case-code-line text-zinc-500" data-case-line>......F</div>
            <div className="case-callout case-callout-red" data-case-line>
              <span>FAILED</span>
              <code>test_stops_at_retry_limit</code>
            </div>
            <div className="case-code-line text-red-300" data-case-line>expected stop=True · received False</div>
            <div className="case-evidence-strip case-evidence-red" data-case-line><span />1 failure captured at the exact boundary</div>
          </div>

          <div className="case-visual-stage" data-case-visual-stage="1">
            <div className="case-terminal-label" data-case-line>HYPOTHESIZE / TRACE THE DECISION</div>
            <div className="case-code-block" data-case-line>
              <div><span className="text-zinc-600">18</span> <span className="text-cyan-200">def</span> should_stop(attempts, retry_limit):</div>
              <div className="case-code-focus"><span className="text-zinc-600">19</span> &nbsp;&nbsp;<span className="text-cyan-200">return</span> attempts <strong>&gt;</strong> retry_limit</div>
            </div>
            <div className="case-causal-note" data-case-line>
              <span className="case-causal-arrow">↳</span>
              <div><strong>Boundary excluded</strong><br />At equality, the strict comparison returns false.</div>
            </div>
            <div className="case-evidence-strip case-evidence-amber" data-case-line><span />Hypothesis explains the observed assertion</div>
          </div>

          <div className="case-visual-stage" data-case-visual-stage="2">
            <div className="case-terminal-label" data-case-line>REPAIR / MINIMAL PATCH</div>
            <div className="case-diff" data-case-line>
              <div className="case-diff-remove"><span>-</span> return attempts &gt; retry_limit</div>
              <div className="case-diff-add"><span>+</span> return attempts &gt;= retry_limit</div>
            </div>
            <div className="case-change-summary" data-case-line>
              <div><span>Files</span><strong>1</strong></div>
              <div><span>Conditions</span><strong>1</strong></div>
              <div><span>Unrelated edits</span><strong>0</strong></div>
            </div>
            <div className="case-evidence-strip case-evidence-cyan" data-case-line><span />Change matches the causal claim</div>
          </div>

          <div className="case-visual-stage" data-case-visual-stage="3">
            <div className="case-terminal-label" data-case-line>VERIFY / EXECUTE THE PROOF</div>
            <div className="case-code-line text-zinc-300" data-case-line><span className="text-zinc-600">$</span> pytest -q</div>
            <div className="case-test-grid" data-case-line>
              {Array.from({ length: 7 }, (_, index) => <span key={index}>✓</span>)}
            </div>
            <div className="case-verified-seal" data-case-line>
              <span className="case-seal-mark">✓</span>
              <div><strong>Repair verified</strong><br />7 passed · 0 failed · 31ms</div>
            </div>
            <div className="case-evidence-strip case-evidence-green" data-case-line><span />Executed evidence sealed</div>
          </div>
        </div>
      </div>
      <div className="case-monitor-neck" />
      <div className="case-monitor-base" />
    </div>
  );
}

export function DebuggingCaseFile() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const mediaQuery = window.matchMedia("(min-width: 1024px) and (prefers-reduced-motion: no-preference)");
    let cancelled = false;
    let loading = false;
    let observer: IntersectionObserver | null = null;
    let gsapContext: gsap.Context | null = null;
    let gsapMedia: gsap.MatchMedia | null = null;
    let activeTimeline: gsap.core.Timeline | null = null;

    const resetStaticState = () => {
      root.dataset.motion = "static";
      root.dataset.activeStage = "0";
    };

    const initializeMotion = async () => {
      if (cancelled || loading || !mediaQuery.matches) return;
      loading = true;

      try {
        const [{ gsap }, { ScrollTrigger }] = await Promise.all([
          import("gsap"),
          import("gsap/ScrollTrigger"),
        ]);
        loading = false;
        if (cancelled || !mediaQuery.matches) {
          if (!cancelled) observeWhenEligible();
          return;
        }

        gsap.registerPlugin(ScrollTrigger);
        gsapMedia = gsap.matchMedia();
        gsapMedia.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
          root.dataset.motion = "enhanced";
          const panels = Array.from(root.querySelectorAll<HTMLElement>("[data-case-visual-stage]"));
          const animatedLines = Array.from(root.querySelectorAll<HTMLElement>("[data-case-line]"));
          const monitor = root.querySelector<HTMLElement>("[data-case-monitor]");
          const rotations = [
            { rotateX: 2, rotateY: -8 },
            { rotateX: 1.7, rotateY: -6.5 },
            { rotateX: 1.3, rotateY: -5 },
            { rotateX: 1, rotateY: -4 },
          ];

          gsapContext = gsap.context(() => {
            const activateStage = (stage: number) => {
              const selected = panels[stage];
              if (!selected || !monitor) return;
              const otherPanels = panels.filter((panel) => panel !== selected);
              const lines = Array.from(selected.querySelectorAll<HTMLElement>("[data-case-line]"));

              root.dataset.activeStage = String(stage);
              activeTimeline?.kill();
              activeTimeline = gsap.timeline({
                defaults: { duration: 0.42, ease: "power3.out", overwrite: "auto" },
              });
              activeTimeline
                .to(otherPanels, { opacity: 0, y: 8, duration: 0.18 }, 0)
                .fromTo(selected, { opacity: 0, y: 10 }, { opacity: 1, y: 0 }, 0.04)
                .to(monitor, rotations[stage], 0)
                .fromTo(lines, { opacity: 0, y: 5 }, { opacity: 1, y: 0, stagger: 0.04 }, 0.08);
            };

            gsap.set(panels, { opacity: 0, y: 8 });
            activateStage(0);

            root.querySelectorAll<HTMLElement>("[data-case-chapter]").forEach((chapter, stage) => {
              ScrollTrigger.create({
                trigger: chapter,
                start: "top 62%",
                end: "bottom 38%",
                onEnter: () => activateStage(stage),
                onEnterBack: () => activateStage(stage),
              });
            });
          }, root);

          return () => {
            activeTimeline?.kill();
            activeTimeline = null;
            gsapContext?.revert();
            gsapContext = null;
            gsap.set([...panels, ...animatedLines], { clearProps: "opacity,transform" });
            if (monitor) gsap.set(monitor, { clearProps: "transform" });
            resetStaticState();
          };
        });
      } catch {
        loading = false;
        resetStaticState();
      }
    };

    const observeWhenEligible = () => {
      if (!mediaQuery.matches) {
        observer?.disconnect();
        observer = null;
        resetStaticState();
        return;
      }
      if (observer || gsapMedia || loading) return;

      observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer?.disconnect();
          observer = null;
          void initializeMotion();
        },
        { rootMargin: "400px 0px" },
      );
      observer.observe(root);
    };

    mediaQuery.addEventListener("change", observeWhenEligible);
    observeWhenEligible();

    return () => {
      cancelled = true;
      mediaQuery.removeEventListener("change", observeWhenEligible);
      observer?.disconnect();
      activeTimeline?.kill();
      gsapMedia?.revert();
      gsapContext?.revert();
    };
  }, []);

  return (
    <section
      ref={rootRef}
      aria-labelledby="debugging-case-file-heading"
      className="debugging-case-file motion-rise"
      data-debugging-story
      data-motion="static"
      data-active-stage="0"
    >
      <header className="case-file-heading">
        <div>
          <div className="instrument-label text-cyan-200">A debugging case file · four evidence gates</div>
          <h2 id="debugging-case-file-heading" className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
            See the investigation, not just the answer.
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-zinc-400">
          FaultSmith turns debugging into a repeatable method. Follow one fictional retry-boundary defect from observed failure to executed proof.
        </p>
      </header>

      <div className="case-file-layout">
        <div className="case-monitor-column">
          <div className="case-monitor-sticky"><CaseMonitor /></div>
        </div>

        <ol className="case-chapters" aria-label="Debugging investigation stages">
          {chapters.map((chapter) => (
            <li key={chapter.title} data-case-chapter className="case-chapter lab-panel">
              <article aria-labelledby={`case-stage-${chapter.number}`}>
                <div className="flex items-center justify-between gap-4">
                  <span className="font-instrument text-[10px] font-semibold tracking-[0.16em] text-amber-300">{chapter.number}</span>
                  <span className={`case-chapter-signal case-chapter-signal-${chapter.tone}`}>{chapter.signal}</span>
                </div>
                <div className="instrument-label mt-8">{chapter.eyebrow}</div>
                <h3 id={`case-stage-${chapter.number}`} className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-zinc-100">{chapter.title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{chapter.description}</p>
              </article>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
