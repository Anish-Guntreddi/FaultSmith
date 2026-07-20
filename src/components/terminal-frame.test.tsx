import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TerminalFrame } from "@/components/terminal-frame";

describe("TerminalFrame", () => {
  it("renders the titlebar chrome with a monospace session label and content slot", () => {
    const markup = renderToStaticMarkup(
      <TerminalFrame label="faultsmith — pytest">
        <p>evidence body</p>
      </TerminalFrame>,
    );

    expect(markup).toContain("terminal-frame-label");
    expect(markup).toContain("faultsmith — pytest");
    expect(markup).toContain("evidence body");
    // The three window lights are decorative and hidden from assistive tech.
    expect(markup).toContain('aria-hidden="true"');
    expect(markup.match(/<i><\/i>/g)).toHaveLength(3);
  });

  it("omits the meta slot unless provided", () => {
    const without = renderToStaticMarkup(
      <TerminalFrame label="session">
        <span>body</span>
      </TerminalFrame>,
    );
    expect(without).not.toContain("terminal-frame-meta");

    const withMeta = renderToStaticMarkup(
      <TerminalFrame label="session" meta="0.34s">
        <span>body</span>
      </TerminalFrame>,
    );
    expect(withMeta).toContain("terminal-frame-meta");
    expect(withMeta).toContain("0.34s");
  });

  it("merges caller class names onto the frame and body", () => {
    const markup = renderToStaticMarkup(
      <TerminalFrame label="session" className="mt-4" bodyClassName="p-0">
        <span>body</span>
      </TerminalFrame>,
    );

    expect(markup).toContain('class="terminal-frame mt-4"');
    expect(markup).toContain('class="terminal-frame-body p-0"');
  });
});
