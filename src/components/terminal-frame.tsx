import type { ReactNode } from "react";

function joinClassNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

/**
 * Themed terminal window chrome from the Forensic Terminal grammar: three
 * window lights, a monospace session label, an optional right-aligned meta
 * slot, and a content slot. Intended for evidence wells and the case-file
 * monitor; purely presentational (no landmarks, no motion of its own).
 */
export function TerminalFrame({
  label,
  meta,
  children,
  className,
  bodyClassName,
}: {
  /** Monospace session label shown in the titlebar, e.g. "faultsmith — pytest". */
  label: string;
  /** Optional right-aligned titlebar detail, e.g. a timing counter. */
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={joinClassNames("terminal-frame", className)}>
      <div className="terminal-frame-bar">
        <span aria-hidden="true" className="terminal-frame-lights">
          <i />
          <i />
          <i />
        </span>
        <span className="terminal-frame-label">{label}</span>
        {meta !== undefined && meta !== null ? (
          <span className="terminal-frame-meta">{meta}</span>
        ) : null}
      </div>
      <div className={joinClassNames("terminal-frame-body", bodyClassName)}>{children}</div>
    </div>
  );
}
