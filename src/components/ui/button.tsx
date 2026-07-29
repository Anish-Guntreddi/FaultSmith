import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "./variants";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const variantClass: Record<ButtonVariant, string> = {
  primary: "primary-action",
  secondary: "secondary-action",
  ghost: "ghost-action",
  danger: "danger-action",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "ui-btn-sm px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "ui-btn-lg px-6 py-3.5 text-base",
};

type ButtonOwnProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and marks aria-busy; the control is disabled while true. */
  loading?: boolean;
  /** Optional label swapped in for `children` while `loading` is true. */
  loadingText?: ReactNode;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
};

type ButtonAsButtonProps = ButtonOwnProps &
  Omit<ComponentPropsWithoutRef<"button">, keyof ButtonOwnProps | "type"> & {
    href?: undefined;
    type?: "button" | "submit" | "reset";
  };

type ButtonAsAnchorProps = ButtonOwnProps &
  Omit<ComponentPropsWithoutRef<"a">, keyof ButtonOwnProps> & {
    href: string;
  };

export type ButtonProps = ButtonAsButtonProps | ButtonAsAnchorProps;

/**
 * Primary interactive-control primitive. Wraps the existing
 * .primary-action / .secondary-action / .ghost-action / .danger-action
 * surfaces (color grammar: amber=action, red=destructive) with canonical
 * sizing, a loading state, and .focus-brackets keyboard focus — instead of
 * each call site re-deriving its own rounded-xl/px/py/text-size combo.
 * Renders <a> when `href` is supplied, <button> otherwise.
 */
export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    loading = false,
    loadingText,
    disabled = false,
    className,
    children,
    ...rest
  } = props;

  const isDisabled = disabled || loading;

  const classes = cn(
    "focus-brackets inline-flex items-center justify-center gap-2 rounded-xl font-semibold",
    variantClass[variant],
    sizeClass[size],
    loading && "cursor-wait",
    className,
  );

  const content = (
    <>
      {loading ? <span aria-hidden="true" className="ui-btn-spinner" /> : null}
      <span>{loading && loadingText !== undefined ? loadingText : children}</span>
    </>
  );

  if (rest.href !== undefined) {
    const { href, ...anchorRest } = rest;
    return (
      <a
        {...anchorRest}
        href={isDisabled ? undefined : href}
        aria-disabled={isDisabled || undefined}
        aria-busy={loading || undefined}
        tabIndex={isDisabled ? -1 : anchorRest.tabIndex}
        className={classes}
      >
        {content}
      </a>
    );
  }

  const { type = "button", ...buttonRest } = rest;
  return (
    <button {...buttonRest} type={type} disabled={isDisabled} aria-busy={loading || undefined} className={classes}>
      {content}
    </button>
  );
}
