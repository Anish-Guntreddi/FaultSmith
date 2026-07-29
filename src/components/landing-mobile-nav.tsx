"use client";

import type { KeyboardEvent } from "react";
import { useRef } from "react";

const links = [
  { href: "#method", label: "Method" },
  { href: "#learning-system", label: "Learning system" },
  { href: "#evidence", label: "Evidence" },
] as const;

/**
 * Compact navigation for tablet and phone layouts.
 *
 * Native details/summary keeps the disclosure useful before hydration. The
 * small client enhancement closes it after an in-page navigation and gives
 * Escape the expected menu-dismiss behavior, so the panel never obscures the
 * section a presenter just selected.
 */
export function LandingMobileNav() {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);

  function closeMenu() {
    detailsRef.current?.removeAttribute("open");
  }

  function handleEscape(event: KeyboardEvent<HTMLDetailsElement>) {
    if (event.key !== "Escape" || !detailsRef.current?.open) return;
    event.preventDefault();
    closeMenu();
    summaryRef.current?.focus();
  }

  return (
    <details ref={detailsRef} className="landing-nav-mobile" onKeyDown={handleEscape}>
      <summary
        ref={summaryRef}
        className="landing-nav-mobile-trigger focus-brackets rounded-xl"
        aria-label="Toggle navigation menu"
      >
        <span className="landing-nav-mobile-icon" aria-hidden="true" />
      </summary>
      <div className="landing-nav-mobile-panel">
        {links.map((link) => (
          <a key={link.href} href={link.href} className="focus-brackets" onClick={closeMenu}>
            {link.label}
          </a>
        ))}
      </div>
    </details>
  );
}
