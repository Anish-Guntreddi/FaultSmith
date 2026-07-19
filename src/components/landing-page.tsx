import Link from "next/link";

import { BrandLockup } from "@/components/brand-mark";
import { DebuggingCaseFile } from "@/components/debugging-case-file";

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

function HeroConsole() {
  return (
    <div className="landing-console" aria-label="Example FaultSmith evidence sequence">
      <div className="landing-console-bar">
        <span className="landing-console-lights" aria-hidden="true"><i /><i /><i /></span>
        <span>record_buffer.py · demonstration trace</span>
        <span>DEMO-024</span>
      </div>
      <div className="landing-console-body">
        <div className="landing-console-command">
          <span className="text-zinc-500">$</span> pytest -q
          <strong className="text-red-300">5 passed · 1 failed</strong>
        </div>
        <div className="landing-console-failure">
          <span>FAILED</span>
          <code>test_trailing_record_is_preserved</code>
        </div>
        <div className="landing-console-code" aria-hidden="true">
          <span><i>18</i> if record.is_complete():</span>
          <span><i>19</i> &nbsp;&nbsp;emit(record)</span>
        </div>
        <ol className="landing-trace" aria-label="FaultSmith investigation stages">
          <li><span>01</span><div><strong>Observe</strong><small>Trailing record disappears</small></div><i>captured</i></li>
          <li><span>02</span><div><strong>Hypothesize</strong><small>Final buffer skips the emit path</small></div><i>reasoned</i></li>
          <li><span>03</span><div><strong>Repair</strong><small>One causal branch changed</small></div><i>minimal</i></li>
          <li className="is-verified"><span>04</span><div><strong>Verify</strong><small>Full focused suite passes</small></div><i>sealed</i></li>
        </ol>
      </div>
      <div className="landing-console-footer">
        <span><i className="bg-emerald-400" /> Repair verified</span>
        <span>6 passed · 0 failed · 47ms</span>
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
          <Link href="/" aria-label="FaultSmith home" className="rounded-xl">
            <BrandLockup />
          </Link>
          <div className="landing-nav-links">
            <a href="#method">Method</a>
            <a href="#learning-system">Learning system</a>
            <a href="#evidence">Evidence</a>
          </div>
          <Link href="/learn" className="primary-action landing-nav-cta rounded-xl px-4 py-2.5 text-xs font-semibold">
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
            <h1 id="landing-hero-heading">
              AI can write the patch.<br />
              <span>FaultSmith teaches you to prove it.</span>
            </h1>
            <p>
              A deliberate debugging lab for students and engineers who want to understand unfamiliar code—not just accept the first generated fix.
            </p>
            <div className="landing-hero-actions">
              <Link href="/learn" className="primary-action rounded-xl px-5 py-3.5 text-sm font-semibold">
                Start a guided lab <ArrowIcon />
              </Link>
              <a href="#method" className="secondary-action rounded-xl px-5 py-3.5 text-sm font-semibold">
                Watch the investigation
              </a>
            </div>
            <ul className="landing-proof-list" aria-label="FaultSmith availability">
              <li><span />No sign-in required</li>
              <li><span />No API key required for guided labs</li>
              <li><span />Verified progress evidence</li>
            </ul>
          </div>
          <div className="landing-hero-visual motion-rise">
            <div className="landing-orbit landing-orbit-amber" aria-hidden="true" />
            <div className="landing-orbit landing-orbit-cyan" aria-hidden="true" />
            <HeroConsole />
          </div>
        </section>

        <section aria-labelledby="problem-heading" className="landing-section landing-problem">
          <div className="landing-section-heading">
            <div className="instrument-label text-red-300">The skill gap</div>
            <h2 id="problem-heading">The shortcut becomes the dependency.</h2>
            <p>
              When every failure goes straight into an AI prompt, learners can receive working code without building the reasoning needed to maintain it.
            </p>
          </div>
          <div className="landing-problem-grid">
            <article className="lab-panel rounded-2xl p-5">
              <span className="landing-card-number">01</span>
              <h3>Symptoms replace evidence</h3>
              <p>The visible error gets patched before the failing boundary or causal branch is understood.</p>
            </article>
            <article className="lab-panel rounded-2xl p-5">
              <span className="landing-card-number">02</span>
              <h3>Confidence replaces proof</h3>
              <p>A plausible answer feels finished even when the exact submitted snapshot was never tested.</p>
            </article>
            <article className="lab-panel rounded-2xl p-5">
              <span className="landing-card-number">03</span>
              <h3>Velocity creates maintenance debt</h3>
              <p>Code ships faster, but the engineer responsible for it cannot explain or safely extend the behavior.</p>
            </article>
          </div>
          <div className="landing-thesis lab-panel-raised">
            <div className="instrument-label text-amber-300">FaultSmith&apos;s intervention</div>
            <p><strong>Preserve the productive struggle.</strong> Guide the learner through evidence, hypothesis, minimal repair, and verification before revealing confidence.</p>
          </div>
        </section>

        <div id="method" className="landing-section landing-method">
          <DebuggingCaseFile />
        </div>

        <section id="learning-system" aria-labelledby="learning-system-heading" className="landing-section">
          <div className="landing-section-heading landing-section-heading-wide">
            <div>
              <div className="instrument-label text-cyan-200">One product · two levels of guidance</div>
              <h2 id="learning-system-heading">Ground beginners. Stretch advanced learners.</h2>
            </div>
            <p>
              Curated curriculum carries the fundamentals. Dynamic generation is reserved for the cases where more range creates more value.
            </p>
          </div>
          <div className="landing-learning-grid">
            {learningModes.map((mode) => (
              <article key={mode.number} className={`landing-learning-card landing-learning-card-${mode.tone}`}>
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
            <h2 id="evidence-heading">The AI proposes. The evidence decides.</h2>
            <p>
              FaultSmith keeps generation, execution, assessment, and persistence behind explicit boundaries so the learning loop stays honest when providers or credentials are unavailable.
            </p>
            <Link href="/learn" className="secondary-action mt-7 inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold">
              Explore the learning system <ArrowIcon />
            </Link>
          </div>
          <div className="landing-evidence-stack">
            {evidenceBoundaries.map((boundary, index) => (
              <article key={boundary.title} className="evidence-well rounded-2xl p-5">
                <div className="flex gap-4">
                  <span className="font-instrument text-[10px] text-amber-300">0{index + 1}</span>
                  <div>
                    <h3>{boundary.title}</h3>
                    <p>{boundary.description}</p>
                    <div className="landing-evidence-signal"><span />{boundary.signal}</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="final-cta-heading" className="landing-final-cta">
          <div>
            <div className="instrument-label text-amber-300">Your first case is ready</div>
            <h2 id="final-cta-heading">Stop guessing at code. Start investigating it.</h2>
            <p>Begin with a prevalidated guided fault. No account, API key, or setup ceremony required.</p>
          </div>
          <Link href="/learn" className="primary-action shrink-0 rounded-xl px-6 py-4 text-sm font-semibold">
            Open the debugging lab <ArrowIcon />
          </Link>
        </section>
      </main>

      <footer className="landing-footer">
        <BrandLockup compact />
        <p>Built for deliberate practice. Verified by evidence.</p>
        <Link href="/learn">Launch application <ArrowIcon /></Link>
      </footer>
    </div>
  );
}
