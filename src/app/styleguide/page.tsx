import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TerminalFrame } from "@/components/terminal-frame";

export const metadata: Metadata = {
  title: "Styleguide — FaultSmith (dev only)",
  robots: { index: false, follow: false },
};

const colorTokens = [
  { name: "--background", value: "#080a0d", purpose: "Canvas" },
  { name: "--surface", value: "#10151b", purpose: "Panel" },
  { name: "--surface-strong", value: "#151b22", purpose: "Raised panel" },
  { name: "--surface-soft", value: "#0c1015", purpose: "Recessed well" },
  { name: "--line", value: "#26303a", purpose: "Hairline" },
  { name: "--line-strong", value: "#3a4652", purpose: "Strong hairline" },
  { name: "--text", value: "#f3f0e8", purpose: "Ink" },
  { name: "--muted", value: "#a7adb3", purpose: "Muted ink" },
  { name: "--muted-dim", value: "#747d86", purpose: "Dim ink" },
  { name: "--amber", value: "#f2b84b", purpose: "Investigation / action" },
  { name: "--amber-bright", value: "#ffd36e", purpose: "Focus ring / cursor" },
  { name: "--amber-soft", value: "#6f4717", purpose: "Amber wash" },
  { name: "--cyan", value: "#69d0cb", purpose: "Instrumentation" },
  { name: "--green", value: "#70d69e", purpose: "Verified only" },
  { name: "--red", value: "#ff7a72", purpose: "Failure only" },
];

const typeScale = [
  { label: "Display / clamp(3.1rem, 6.3vw, 6.6rem)", className: "text-6xl font-semibold tracking-[-0.065em]" },
  { label: "Heading 2 / clamp(2.35rem, 4vw, 4.25rem)", className: "text-4xl font-semibold tracking-[-0.055em]" },
  { label: "Heading 3 / 1.15–1.45rem", className: "text-xl font-semibold tracking-[-0.025em]" },
  { label: "Body / 0.98rem · 1.75 line height", className: "text-base" },
  { label: "Small body / 0.8rem", className: "text-sm" },
];

const spacingSteps = [4, 8, 12, 16, 24, 32, 48, 64, 96];

const motionTokens = [
  { name: "--dur-fast", value: "140ms", role: "Press / tap feedback" },
  { name: "--dur-base", value: "240ms", role: "Standard UI transitions" },
  { name: "--dur-slow", value: "420ms", role: "Explanatory / continuity" },
  { name: "--dur-reveal", value: "900ms", role: "Stepped typewriter reveals" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-16">
      <h2 className="prompt-heading text-2xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function StyleguidePage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <main className="grid-texture min-h-screen px-6 pb-24 pt-14">
      {/* Dev-only demo styles: kept inline so the production stylesheet
          carries no styleguide-only rules. */}
      <style>{`
        .sg-swatch { display: grid; grid-template-rows: 4rem auto; gap: 0.5rem; }
        .sg-swatch > i { border: 1px solid rgba(255,255,255,0.12); border-radius: 0.6rem; }
        .sg-motion-dot {
          width: 1.1rem; height: 1.1rem; border-radius: 0.3rem; background: var(--amber);
          animation: sg-slide var(--sg-dur, 240ms) var(--ease-out) infinite alternate;
        }
        @keyframes sg-slide { from { transform: translateX(0); } to { transform: translateX(9rem); } }
        .sg-state-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); }
        @media (prefers-reduced-motion: reduce) { .sg-motion-dot { animation: none; } }
      `}</style>

      <div className="mx-auto max-w-[1100px]">
        <p className="instrument-label">FaultSmith · Forensic Terminal · development styleguide</p>
        <h1 className="prompt-heading-cmd block-cursor mt-4 text-4xl font-semibold tracking-tight">
          styleguide
        </h1>
        <p className="mt-4 max-w-[42rem] text-sm text-zinc-500">
          Living reference for the Forensic Workbench tokens and the Forensic Terminal grammar.
          This route renders in development only and returns 404 in production builds.
        </p>

        <Section title="Color tokens">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {colorTokens.map((token) => (
              <div key={token.name} className="sg-swatch">
                <i style={{ background: token.value }} />
                <div className="font-instrument text-[0.62rem] text-zinc-500">
                  <span className="block text-zinc-300">{token.name}</span>
                  <span className="block">{token.value}</span>
                  <span className="block">{token.purpose}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Type scale">
          <div className="grid gap-6">
            {typeScale.map((step) => (
              <div key={step.label}>
                <p className="instrument-label">{step.label}</p>
                <p className={`mt-1 ${step.className}`}>Prove the fix with executed evidence.</p>
              </div>
            ))}
            <div>
              <p className="instrument-label">Instrument label / mono uppercase 0.16em tracking</p>
              <p className="instrument-label mt-1 text-zinc-300">Observe · Hypothesize · Repair · Verify</p>
            </div>
          </div>
        </Section>

        <Section title="Spacing rhythm (4px base grid)">
          <div className="grid gap-2">
            {spacingSteps.map((step) => (
              <div key={step} className="flex items-center gap-4">
                <span className="font-instrument w-14 text-[0.62rem] text-zinc-500">{step}px</span>
                <span
                  className="block h-3 rounded-sm bg-cyan-300/40"
                  style={{ width: `${step}px` }}
                />
              </div>
            ))}
          </div>
        </Section>

        <Section title="Motion tokens">
          <div className="grid gap-5">
            {motionTokens.map((token) => (
              <div key={token.name}>
                <p className="font-instrument text-[0.62rem] text-zinc-500">
                  <span className="text-zinc-300">{token.name}</span> · {token.value} · {token.role}
                </p>
                <div className="mt-2 w-[11rem] rounded-md border border-white/10 bg-black/30 p-2">
                  <span className="sg-motion-dot block" style={{ ["--sg-dur" as string]: token.value }} />
                </div>
              </div>
            ))}
            <p className="font-instrument text-[0.62rem] text-zinc-500">
              Easings: --ease-out (respond to user) · --ease-in-out (A→B moves) · --ease-snap
              (entrance rise) · all motion collapses under prefers-reduced-motion.
            </p>
          </div>
        </Section>

        <Section title="Prompt grammar">
          <div className="grid gap-5">
            <h3 className="prompt-heading text-xl font-semibold tracking-tight">
              Heading with investigation prompt
            </h3>
            <h3 className="prompt-heading-cmd text-xl font-semibold tracking-tight">
              Heading with command prompt
            </h3>
            <p className="block-cursor font-instrument text-sm text-zinc-300">
              Block-cursor accent, CSS-only blink, static under reduced motion
            </p>
          </div>
        </Section>

        <Section title="Focus states (Tab through)">
          <div className="flex flex-wrap items-center gap-6">
            <button type="button" className="focus-brackets primary-action rounded-xl px-5 text-sm font-bold">
              Bracket focus · button
            </button>
            <a href="#top" className="focus-brackets secondary-action inline-flex items-center rounded-xl px-5 text-sm">
              Bracket focus · link
            </a>
            <input
              type="text"
              defaultValue="Bracket focus · input"
              aria-label="Focus bracket demo input"
              className="focus-brackets rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm"
            />
            <button type="button" className="secondary-action rounded-xl px-5 text-sm">
              Default focus ring
            </button>
          </div>
        </Section>

        <Section title="Terminal frame">
          <div className="grid gap-6 lg:grid-cols-2">
            <TerminalFrame label="faultsmith — pytest · session 042" meta="0.34s">
              <pre className="font-instrument text-[0.72rem] leading-7 text-zinc-300">
                {"$ pytest tests/test_retry.py\n"}
                <span className="text-red-300">FAILED</span>
                {" tests/test_retry.py::test_gives_up_after_max_attempts\n"}
                <span className="text-zinc-500">AssertionError: retried 4 times, expected 3</span>
              </pre>
            </TerminalFrame>
            <TerminalFrame label="evidence — verified snapshot">
              <p className="font-instrument text-[0.72rem] leading-7 text-emerald-300">
                7 passed · 0 failed · snapshot verified
              </p>
            </TerminalFrame>
          </div>
        </Section>

        <Section title="Buttons">
          <div className="sg-state-grid">
            <div>
              <p className="instrument-label">Primary / default</p>
              <button type="button" className="primary-action mt-2 rounded-xl px-5 text-sm font-bold">
                Run the tests
              </button>
            </div>
            <div>
              <p className="instrument-label">Primary / disabled</p>
              <button type="button" disabled className="primary-action mt-2 rounded-xl px-5 text-sm font-bold opacity-50">
                Run the tests
              </button>
            </div>
            <div>
              <p className="instrument-label">Secondary / default</p>
              <button type="button" className="secondary-action mt-2 rounded-xl px-5 text-sm">
                Request a hint
              </button>
            </div>
            <div>
              <p className="instrument-label">Secondary / disabled</p>
              <button type="button" disabled className="secondary-action mt-2 rounded-xl px-5 text-sm opacity-50">
                Request a hint
              </button>
            </div>
          </div>
          <p className="font-instrument mt-4 text-[0.62rem] text-zinc-500">
            Hover lifts 1px on fine pointers; active scales to 0.97; both use --dur-fast /
            --ease-out.
          </p>
        </Section>

        <Section title="Cards and wells">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lab-panel rounded-2xl p-5">
              <p className="instrument-label">lab-panel</p>
              <p className="mt-2 text-sm text-zinc-400">Primary work surface.</p>
            </div>
            <div className="lab-panel-raised rounded-2xl p-5">
              <p className="instrument-label">lab-panel-raised</p>
              <p className="mt-2 text-sm text-zinc-400">Selected / important surface.</p>
            </div>
            <div className="evidence-well rounded-2xl p-5">
              <p className="instrument-label">evidence-well</p>
              <p className="mt-2 text-sm text-zinc-400">Recessed executed evidence.</p>
            </div>
          </div>
        </Section>

        <Section title="Inputs and pills">
          <div className="flex flex-wrap items-center gap-6">
            <input
              type="text"
              placeholder="Text input"
              aria-label="Styleguide text input"
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm"
            />
            <select
              aria-label="Styleguide select"
              defaultValue="beginner"
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
            </select>
            <span className="status-pill px-3 py-1.5">
              <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span className="ml-2">status-pill</span>
            </span>
            <div className="mode-switcher">
              <button type="button" aria-pressed="true" className="mode-tab">
                Roadmap
              </button>
              <button type="button" aria-pressed="false" className="mode-tab">
                Skill practice
              </button>
              <button type="button" aria-pressed="false" className="mode-tab">
                My Progress
              </button>
            </div>
          </div>
        </Section>
      </div>
    </main>
  );
}
