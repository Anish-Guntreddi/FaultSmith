import type { ElementType, ReactNode } from "react";

import { cn } from "./variants";

export type CardVariant = "panel" | "raised" | "evidence-well" | "inset";
export type CardPadding = "none" | "sm" | "md" | "lg";

const variantClass: Record<CardVariant, string> = {
  panel: "lab-panel rounded-2xl",
  raised: "lab-panel-raised rounded-2xl",
  "evidence-well": "evidence-well rounded-xl",
  inset: "ui-card-inset rounded-xl",
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
 * Surface primitive: wraps the existing .lab-panel / .lab-panel-raised /
 * .evidence-well surfaces (plus a new .ui-card-inset nested-well variant)
 * with one canonical border radius per variant, so call sites stop
 * choosing their own rounded-xl/rounded-2xl/rounded-3xl per instance.
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
