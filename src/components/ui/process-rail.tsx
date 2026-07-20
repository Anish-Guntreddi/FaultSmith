import { cn } from "./variants";

export type ProcessRailStep = {
  number?: string;
  title: string;
  note?: string;
};

type ProcessRailProps = {
  steps: readonly ProcessRailStep[];
  compact?: boolean;
  className?: string;
};

/** A connected investigation sequence, styled like a signal path. */
export function ProcessRail({ steps, compact = false, className }: ProcessRailProps) {
  return (
    <ol className={cn("ui-process-rail", compact && "ui-process-rail-compact", className)}>
      {steps.map((step, index) => (
        <li key={`${step.number ?? index}-${step.title}`}>
          <span aria-hidden="true" className="ui-process-node">
            {step.number ?? String(index + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <div className="ui-process-title">{step.title}</div>
            {step.note ? <div className="ui-process-note">{step.note}</div> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
