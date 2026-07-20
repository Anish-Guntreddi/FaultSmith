import { cn } from "./variants";

export type StatusDotTone = "neutral" | "investigation" | "instrument" | "verified" | "failure" | "locked";
export type StatusDotSize = "sm" | "md" | "lg";

const toneClass: Record<StatusDotTone, string> = {
  neutral: "status-dot-neutral",
  investigation: "status-dot-investigation",
  instrument: "status-dot-instrument",
  verified: "status-dot-verified",
  failure: "status-dot-failure",
  locked: "status-dot-locked",
};

const sizeClass: Record<StatusDotSize, string> = {
  sm: "status-dot-sm",
  md: "status-dot-md",
  lg: "status-dot-lg",
};

export type StatusDotProps = {
  tone?: StatusDotTone;
  size?: StatusDotSize;
  className?: string;
};

/**
 * Decorative status indicator only — always aria-hidden. Color is never the
 * sole status signal in the Forensic Workbench grammar, so every caller
 * must place this next to visible status text (e.g. inside a Badge, or
 * beside a plain label); this component renders no text of its own.
 */
export function StatusDot({ tone = "neutral", size = "md", className }: StatusDotProps) {
  return <span aria-hidden="true" className={cn("status-dot", toneClass[tone], sizeClass[size], className)} />;
}
