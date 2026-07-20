import Link from "next/link";
import type { ReactNode } from "react";

import { BrandLockup } from "@/components/brand-mark";
import { DebuggingCaseFile } from "@/components/debugging-case-file";
import { DebuggingDemo } from "@/components/debugging-demo";
import { LandingMobileNav } from "@/components/landing-mobile-nav";
import { ReasoningBypassFigure } from "@/components/reasoning-bypass-figure";
import { Card } from "@/components/ui";

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
  },
  {
    title: "Fallback stays demo-ready",
    description: "Missing credentials, provider drift, or a timeout recover to a clearly labeled prevalidated challenge instead of breaking the lesson.",
    signal: "Reliability · controlled fixture",
  },
  {
    title: "Private by default",
    description: "Guest learning stays on the device. Hidden solutions, provider identifiers, and credentials remain behind server-owned boundaries.",
    signal: "Privacy · bounded state",
  },
] as const;

function ArrowIcon() {
  return <span aria-hidden="true">→</span>;
}

/** Split (not hand-counted, so it can never drift from the copy) for the
 * hero's word-by-word reveal — see .tw-word / --tw-i in globals.css. */
const heroValuePropWords = "FaultSmith teaches you to prove it.".split(" ");

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
            <div className="instrument-label flex items-center gap-2 text-amber-300">
              <span className="h-px w-9 bg-amber-300/65" />OpenAI Build Week · Education
            </div>
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
            <p>
              A deliberate debugging lab for students and engineers who want to understand unfamiliar code—not just accept the first generated fix.
            </p>
            <div className="landing-hero-actions">
              <Link href="/learn" className="primary-action focus-brackets rounded-xl px-5 py-3.5 text-sm font-semibold">
                Start a guided lab <ArrowIcon />
              </Link>
              <a href="#method" className="secondary-action focus-brackets rounded-xl px-5 py-3.5 text-sm font-semibold">
                Watch the investigation
              </a>
            </div>
            <ul className="landing-proof-list" aria-label="FaultSmith availability">
              <li><span />No sign-in required</li>
              <li><span />No API key required for guided labs</li>
              <li><span />Verified progress evidence</li>
            </ul>
            <TraceTicker />
          </div>
          <div className="landing-hero-visual motion-rise">
            <div className="landing-orbit landing-orbit-amber" aria-hidden="true" />
            <div className="landing-orbit landing-orbit-cyan" aria-hidden="true" />
            <DebuggingDemo />
          </div>
        </section>

        <section id="problem" aria-labelledby="problem-heading" className="landing-section landing-problem">
          <div className="landing-problem-layout">
            <div className="landing-problem-copy">
              <div className="instrument-label text-amber-300">Problem / reasoning bypass</div>
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
              <Card variant="raised" padding="md" className="landing-problem-bridge">
                <div className="instrument-label text-amber-300">FaultSmith&apos;s constraint</div>
                <p>FaultSmith withholds the repair, guides the investigation, and lets executed tests decide completion.</p>
              </Card>
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
              <div className="instrument-label text-cyan-200">One product · two levels of guidance</div>
              <h2 id="learning-system-heading" className="prompt-heading prompt-heading-display">Ground beginners. Stretch advanced learners.</h2>
            </div>
            <p>
              Curated curriculum carries the fundamentals. Dynamic generation is reserved for the cases where more range creates more value.
            </p>
          </div>
          <div className="landing-learning-grid">
            {learningModes.map((mode) => (
              <article key={mode.number} className={`landing-learning-card fine-hover-lift landing-learning-card-${mode.tone}`}>
                <div className="flex items-center justify-between gap-4">
                  <span className="landing-card-number">{mode.number}</span>
                  <span className="instrument-label">{mode.eyebrow}</span>
                </div>
                <h3>{mode.title}</h3>
                <p>{mode.description}</p>
                <div className="landing-card-detail">{mode.detail}</div>
              </article>
            ))}
          </div>
        </section>

        <section id="evidence" aria-labelledby="evidence-heading" className="landing-section landing-evidence">
          <div className="landing-evidence-intro">
            <div className="instrument-label text-emerald-300">Designed to fail safely</div>
            <h2 id="evidence-heading" className="prompt-heading prompt-heading-display">The AI proposes. The evidence decides.</h2>
            <p>
              FaultSmith keeps generation, execution, assessment, and persistence behind explicit boundaries so the learning loop stays honest when providers or credentials are unavailable.
            </p>
            <Link href="/learn" className="secondary-action focus-brackets mt-7 inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold">
              Explore the learning system <ArrowIcon />
            </Link>
          </div>
          <div className="landing-evidence-stack">
            {evidenceBoundaries.map((boundary, index) => (
              <Card key={boundary.title} as="article" variant="evidence-well" padding="lg" className="fine-hover-lift">
                <div className="flex gap-4">
                  <span className="font-instrument text-[10px] text-amber-300">0{index + 1}</span>
                  <div>
                    <h3>{boundary.title}</h3>
                    <p>{boundary.description}</p>
                    <div className="landing-evidence-signal"><span />{boundary.signal}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section aria-labelledby="final-cta-heading" className="landing-final-cta">
          <div>
            <div className="instrument-label text-amber-300">Your first case is ready</div>
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
