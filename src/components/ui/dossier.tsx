import type { ElementType, ReactNode } from "react";

import { cn } from "./variants";

export type DossierTone = "amber" | "cyan" | "green" | "neutral";

export type DossierProps = {
  index: string;
  tone?: DossierTone;
  active?: boolean;
  children: ReactNode;
  className?: string;
  as?: ElementType;
  "aria-label"?: string;
  "aria-labelledby"?: string;
};

/**
 * FaultSmith's authored case-file surface. The numbered rail, registration
 * marks, and chamfered shell make related content read like an investigation
 * artifact instead of a generic dashboard card.
 */
export function Dossier({
  index,
  tone = "neutral",
  active = false,
  children,
  className,
  as: Tag = "article",
  ...aria
}: DossierProps) {
  return (
    <Tag
      className={cn(
        "ui-dossier",
        `ui-dossier-${tone}`,
        active && "ui-dossier-active",
        className,
      )}
      {...aria}
    >
      <div aria-hidden="true" className="ui-dossier-rail">
        <span className="ui-dossier-index">{index}</span>
        <span className="ui-dossier-axis" />
        <span className="ui-dossier-stamp">FS/{index}</span>
      </div>
      <div className="ui-dossier-body">
        <span aria-hidden="true" className="ui-dossier-register">+ + + + + + + +</span>
        {children}
      </div>
    </Tag>
  );
}
