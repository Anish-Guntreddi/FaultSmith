import type { ReactNode } from "react";

import { cn } from "./variants";

export type StatTone = "neutral" | "investigation" | "instrument" | "verified" | "failure";
export type StatSize = "sm" | "md" | "lg";

const toneClass: Record<StatTone, string> = {
  neutral: "text-white",
  investigation: "text-amber-300",
  instrument: "text-cyan-200",
  verified: "text-emerald-300",
  failure: "text-red-300",
};

const sizeClass: Record<StatSize, string> = {
  sm: "text-sm",
  md: "text-2xl",
  lg: "text-4xl",
};

export type StatDisplayProps = {
  value: ReactNode;
  label: string;
  caption?: ReactNode;
  tone?: StatTone;
  size?: StatSize;
  className?: string;
};

/**
 * Monospace metric counter used across roadmap/progress evidence tiles: an
 * instrument-label caption, a big tabular-nums value, and an optional
 * supporting caption line — consolidating the font-instrument tabular-nums
 * text-{2xl,4xl,sm} font-semibold combo repeated at each metric call site.
 */
export function StatDisplay({ value, label, caption, tone = "neutral", size = "md", className }: StatDisplayProps) {
  return (
    <div className={className}>
      <div className="instrument-label">{label}</div>
      <div className={cn("font-instrument tabular-nums mt-1.5 font-semibold", toneClass[tone], sizeClass[size])}>
        {value}
      </div>
      {caption ? <p className="mt-1.5 text-xs leading-5 text-zinc-500">{caption}</p> : null}
    </div>
  );
}
