import { useId } from "react";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "./variants";

type FieldOwnProps = {
  label: string;
  description?: string;
  error?: string;
  id?: string;
  required?: boolean;
  wrapperClassName?: string;
  className?: string;
};

type FieldInputProps = FieldOwnProps & { as?: "input" } & Omit<
    ComponentPropsWithoutRef<"input">,
    keyof FieldOwnProps | "className"
  >;

type FieldTextareaProps = FieldOwnProps & { as: "textarea" } & Omit<
    ComponentPropsWithoutRef<"textarea">,
    keyof FieldOwnProps | "className"
  >;

export type FieldProps = FieldInputProps | FieldTextareaProps;

/**
 * Label + input/textarea + description + error primitive, wired with ids:
 * the description and error each get their own id, both joined onto the
 * control's aria-describedby, and aria-invalid is set whenever `error` is
 * present. Builds on the existing .field-input surface (default/hover/
 * focus-visible/disabled/invalid states).
 */
export function Field(props: FieldProps) {
  const generatedId = useId();
  const {
    label,
    description,
    error,
    id = generatedId,
    required = false,
    wrapperClassName,
    className,
    as = "input",
    ...rest
  } = props;

  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;
  const inputClasses = cn("field-input px-4 py-2.5 text-sm", className);

  return (
    <div className={cn("grid gap-1.5", wrapperClassName)}>
      <label htmlFor={id} className="text-xs font-medium text-zinc-300">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-amber-300">
            *
          </span>
        ) : null}
      </label>
      {as === "textarea" ? (
        <textarea
          id={id}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={cn(inputClasses, "resize-none")}
          {...(rest as ComponentPropsWithoutRef<"textarea">)}
        />
      ) : (
        <input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={inputClasses}
          {...(rest as ComponentPropsWithoutRef<"input">)}
        />
      )}
      {description ? (
        <p id={descriptionId} className="text-[0.7rem] leading-4 text-zinc-500">
          {description}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-[0.7rem] leading-4 text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
