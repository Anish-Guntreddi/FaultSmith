import type { ElementType, ReactNode } from "react";

import { cn } from "./variants";

export type CardVariant = "panel" | "raised" | "evidence-well" | "inset";
export type CardPadding = "none" | "sm" | "md" | "lg";

const variantClass: Record<CardVariant, string> = {
  panel: "lab-panel ui-instrument-shell",
  raised: "lab-panel-raised ui-instrument-shell ui-instrument-shell-raised",
  "evidence-well": "evidence-well ui-evidence-well",
  inset: "ui-card-inset ui-inset-record",
};

const paddingClass: Record<CardPadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

export type CardProps = {
  variant?: CardVariant;
  /** Padding applied to the body slot only — header/footer keep a fixed px-4 py-3. */
  padding?: CardPadding;
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Wrapping element — defaults to "div"; pass "section"/"article"/"aside" for landmark semantics. */
  as?: ElementType;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
};

/**
 * Surface primitive: wraps FaultSmith's panel materials in one consistent
 * instrument-shell silhouette. Call sites choose hierarchy, while the
 * primitive owns the cut corner, keyline, and nested-record treatment.
 */
export function Card({
  variant = "panel",
  padding = "lg",
  header,
  footer,
  children,
  className,
  as: Tag = "div",
  ...aria
}: CardProps) {
  return (
    <Tag className={cn(variantClass[variant], Boolean(header || footer) && "overflow-hidden", className)} {...aria}>
      {header ? <div className="ui-card-header px-4 py-3">{header}</div> : null}
      <div className={paddingClass[padding]}>{children}</div>
      {footer ? <div className="ui-card-footer px-4 py-3">{footer}</div> : null}
    </Tag>
  );
}
