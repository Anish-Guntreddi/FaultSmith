import type { ReactNode } from "react";

import { cn } from "./variants";

export type BadgeVariant = "neutral" | "investigation" | "instrument" | "verified" | "failure" | "locked";

const variantClass: Record<BadgeVariant, string> = {
  neutral: "status-pill",
  investigation: "status-pill status-pill-investigation",
  instrument: "status-pill status-pill-instrument",
  verified: "status-pill status-pill-verified",
  failure: "status-pill status-pill-failure",
  locked: "status-pill status-pill-locked",
};

export type BadgeProps = {
  variant?: BadgeVariant;
  /**
   * Required decorative glyph carrying the status independent of color —
   * the Forensic Workbench grammar never signals status by color alone.
   * Pass a short symbol (e.g. "▸" ready, "✓" verified, "✕" failure, "▪"
   * locked). Rendered aria-hidden, so `children` must still say the state
   * in words.
   */
  glyph: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Status label primitive built on the existing .status-pill surface, with
 * tone variants for the five color-grammar states plus a neutral default.
 * A glyph is mandatory so status is never carried by color alone.
 */
export function Badge({ variant = "neutral", glyph, children, className }: BadgeProps) {
  return (
    <span className={cn(variantClass[variant], "px-2.5 py-1", className)}>
      <span aria-hidden="true">{glyph}</span>
      <span>{children}</span>
    </span>
  );
}
