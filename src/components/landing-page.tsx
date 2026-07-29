import Link from "next/link";
import type { ReactNode } from "react";

import { BrandLockup } from "@/components/brand-mark";
import { DebuggingCaseFile } from "@/components/debugging-case-file";
import { DebuggingDemo } from "@/components/debugging-demo";
import { LandingMobileNav } from "@/components/landing-mobile-nav";
import { ReasoningBypassFigure } from "@/components/reasoning-bypass-figure";
import { Dossier, EvidenceLedger, SectionMark } from "@/components/ui";

const learningModes = [
  {
    number: "01",
    eyebrow: "Guided foundations",
    title: "A roadmap before an open prompt",
    description:
      "Nine sequenced lessons teach beginners to read failure evidence, reason about behavior, and defend real systems without needing to invent the right prompt first.",
    detail: "9 lessons · 3 phases · no credits required",
    tone: "amber",
  },
  {
    number: "02",
    eyebrow: "Adaptive practice",
    title: "Controlled faults with room to grow",
    description:
      "Choose a system, target skill, and difficulty. Use validated fixtures for reliable practice or GPT-5.6 generation when a server credential is configured.",
    detail: "3 Python systems · live + fallback",
    tone: "cyan",
  },
  {
    number: "03",
    eyebrow: "Evidence dashboard",
    title: "Progress earned by verified repairs",
    description:
      "FaultSmith records bounded skill evidence only after the submitted snapshot passes its verification gate. Guest progress works locally; accounts add optional sync.",
    detail: "Verified outcomes · guest first",
    tone: "green",
  },
] as const;

const evidenceBoundaries = [
  {
    title: "Tests decide completion",
    description: "A persuasive explanation cannot promote failing code. The exact submitted files are verified before progress advances.",
    signal: "Authority · executed evidence",
    tone: "amber",
  },
  {
    title: "Fallback stays demo-ready",
    description: "Missing credentials, provider drift, or a timeout recover to a clearly labeled prevalidated challenge instead of breaking the lesson.",
    signal: "Reliability · controlled fixture",
    tone: "cyan",
  },
  {
    title: "Private by default",
    description: "Guest learning stays on the device. Hidden solutions, provider identifiers, and credentials remain behind server-owned boundaries.",
    signal: "Privacy · bounded state",
    tone: "green",
  },
] as const;

function ArrowIcon() {
  return <span aria-hidden="true">→</span>;
}

/** Split (not hand-counted, so it can never drift from the copy) for the
 * hero's word-by-word reveal — see .tw-word / --tw-i in globals.css. */
const heroValuePropWords = "FaultSmith teaches you to prove it.".split(" ");

/** Decorative Warp-style command chip beside the primary CTA. Not a real
 * installable command — it names the in-app action the button performs, in
 * terminal-invocation form, and fabricates no npm package. */
const HERO_COMMAND = "start lesson-01";

const traceTickerEvents = [
  "OBSERVE · failing assertion captured",
  "HYPOTHESIZE · causal branch isolated",
  "REPAIR · minimal diff applied",
  "VERIFY · full suite executed",
] as const;

/** CSS-only marquee of evidence-loop events. Purely decorative ambient
 * detail — content is fully hidden from assistive tech and carries no
 * information not already stated elsewhere on the page. Pausable on
 * hover/focus; collapses to a single static row under reduced motion. */
function TraceTicker() {
  return (
    <div className="trace-ticker" aria-hidden="true">
      <div className="trace-ticker-track">
        <span className="trace-ticker-set">
          {traceTickerEvents.map((event) => (
            <em key={`a-${event}`}>{event}</em>
          ))}
        </span>
        <span className="trace-ticker-set">
          {traceTickerEvents.map((event) => (
            <em key={`b-${event}`}>{event}</em>
          ))}
        </span>
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="landing-page grid-texture min-h-screen">
      <a href="#main-content" className="landing-skip-link">Skip to main content</a>

      <header className="landing-nav-shell">
        <nav aria-label="Primary navigation" className="landing-nav">
          <Link href="/" aria-label="FaultSmith home" className="focus-brackets rounded-xl">
            <BrandLockup />
          </Link>
          <div className="landing-nav-links">
            <a href="#method" className="focus-brackets">Method</a>
            <a href="#learning-system" className="focus-brackets">Learning system</a>
            <a href="#evidence" className="focus-brackets">Evidence</a>
          </div>
          {/* Below 1024px the desktop links are hidden; this native
              disclosure keeps every story section reachable and closes
              itself after selection so it never covers the destination. */}
          <LandingMobileNav />
          <Link href="/learn" className="primary-action landing-nav-cta focus-brackets rounded-xl px-4 py-2.5 text-xs font-semibold">
            Open FaultSmith <ArrowIcon />
          </Link>
        </nav>
      </header>

      <main id="main-content">
        <section aria-labelledby="landing-hero-heading" className="landing-hero">
          <div className="landing-hero-copy motion-rise">
            <h1 id="landing-hero-heading" className="prompt-heading prompt-heading-display">
              AI can write the patch.<br />
              <span className="typewriter-reveal block-cursor">
                {heroValuePropWords.flatMap((word, index, words) => {
                  const nodes: ReactNode[] = [
                    <span
                      key={`${word}-${index}`}
                      className="tw-word"
                      style={{ ["--tw-i" as string]: String(index) }}
                    >
                      {word}
                    </span>,
                  ];
                  // The space is a sibling text node OUTSIDE the tw-word
                  // inline-block, not inside it: a trailing space inside a
                  // single-line inline-block sits at the end of that box's
                  // own internal line box and gets collapsed away by CSS
                  // white-space rules, which visually glues the words
                  // together with no gap.
                  if (index < words.length - 1) nodes.push(" ");
                  return nodes;
                })}
              </span>
            </h1>
            <p>A deliberate debugging lab that withholds the fix until the evidence proves it.</p>
            <div className="landing-hero-actions">
              <Link href="/learn" className="primary-action focus-brackets rounded-xl px-5 py-3.5 text-sm font-semibold">
                Start a guided lab <ArrowIcon />
              </Link>
              <span className="command-chip font-instrument" aria-hidden="true">
                <span className="command-chip-prompt">$</span> {HERO_COMMAND}
              </span>
              <a href="#method" className="secondary-action focus-brackets rounded-xl px-5 py-3.5 text-sm font-semibold">
                Watch the investigation
              </a>
            </div>
          </div>
          <TraceTicker />
          <div className="landing-hero-visual motion-rise">
            <div className="landing-orbit landing-orbit-amber" aria-hidden="true" />
            <div className="landing-orbit landing-orbit-cyan" aria-hidden="true" />
            <DebuggingDemo />
          </div>
        </section>

        <section id="problem" aria-labelledby="problem-heading" className="landing-section landing-problem">
          <div className="landing-problem-layout">
            <div className="landing-problem-copy">
              <div className="instrument-label text-amber-300">
                <SectionMark index="01">Problem / reasoning bypass</SectionMark>
              </div>
              <h2 id="problem-heading" className="prompt-heading prompt-heading-display">
                A patch can pass before the engineer understands why.
              </h2>
              <p className="landing-problem-lead">
                Send a failure straight to a model and the code may recover. The learner may not.
              </p>
              <p className="landing-problem-body">
                The work that disappears is causal: read the evidence, form a hypothesis, change the smallest
                responsible surface, and prove the submitted snapshot. Repeatedly bypass that work and accepting a
                diff becomes easier than debugging or maintaining unfamiliar code.
              </p>
              <Dossier index="C0" tone="amber" className="landing-problem-bridge">
                <div className="instrument-label text-amber-300">FaultSmith&apos;s constraint</div>
                <p>FaultSmith withholds the repair, guides the investigation, and lets executed tests decide completion.</p>
              </Dossier>
            </div>
            <ReasoningBypassFigure />
          </div>
        </section>

        <div id="method" className="landing-section landing-method">
          <DebuggingCaseFile />
        </div>

        <section id="learning-system" aria-labelledby="learning-system-heading" className="landing-section">
          <div className="landing-section-heading landing-section-heading-wide">
            <div>
              <div className="instrument-label text-cyan-200">
                <SectionMark index="03">One product · two levels of guidance</SectionMark>
              </div>
              <h2 id="learning-system-heading" className="prompt-heading prompt-heading-display">Ground beginners. Stretch advanced learners.</h2>
            </div>
            <p>
              Curated curriculum carries the fundamentals. Dynamic generation is reserved for the cases where more range creates more value.
            </p>
          </div>
          <div className="landing-learning-grid">
            {learningModes.map((mode, modeIndex) => (
              <Dossier
                key={mode.number}
                index={mode.number}
                tone={mode.tone}
                className={`landing-learning-dossier fine-hover-lift ${
                  modeIndex === 0 ? "landing-learning-dossier-primary" : "landing-learning-dossier-secondary"
                }`}
              >
                <div className="landing-dossier-header">
                  <span className="instrument-label">{mode.eyebrow}</span>
                  <span aria-hidden="true" className="landing-dossier-code">TRACK/{mode.number}</span>
                </div>
                <h3>{mode.title}</h3>
                <p>{mode.description}</p>
                <div className="landing-dossier-detail"><span aria-hidden="true">↳</span>{mode.detail}</div>
              </Dossier>
            ))}
          </div>
        </section>

        <section id="evidence" aria-labelledby="evidence-heading" className="landing-section landing-evidence">
          <div className="landing-evidence-intro">
            <div className="instrument-label text-emerald-300">
              <SectionMark index="04">Designed to fail safely</SectionMark>
            </div>
            <h2 id="evidence-heading" className="prompt-heading prompt-heading-display">The AI proposes. The evidence decides.</h2>
            <p>
              FaultSmith keeps generation, execution, assessment, and persistence behind explicit boundaries so the learning loop stays honest when providers or credentials are unavailable.
            </p>
            <Link href="/learn" className="secondary-action focus-brackets mt-7 inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold">
              Explore the learning system <ArrowIcon />
            </Link>
          </div>
          <EvidenceLedger items={evidenceBoundaries} className="landing-evidence-ledger" />
        </section>

        <section aria-labelledby="final-cta-heading" className="landing-final-cta">
          <div>
            <div className="instrument-label text-amber-300">
              <SectionMark index="EOF">Your first case is ready</SectionMark>
            </div>
            <h2 id="final-cta-heading" className="prompt-heading prompt-heading-display">Stop guessing at code. Start investigating it.</h2>
            <p>Begin with a prevalidated guided fault. No account, API key, or setup ceremony required.</p>
          </div>
          <Link href="/learn" className="primary-action focus-brackets shrink-0 rounded-xl px-6 py-4 text-sm font-semibold">
            Open the debugging lab <ArrowIcon />
          </Link>
        </section>
      </main>

      <footer className="landing-footer">
        <BrandLockup compact />
        <p>Built for deliberate practice. Verified by evidence.</p>
        <Link href="/learn" className="focus-brackets">Launch application <ArrowIcon /></Link>
      </footer>
    </div>
  );
}
