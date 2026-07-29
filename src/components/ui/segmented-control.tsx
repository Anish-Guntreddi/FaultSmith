"use client";

import type { KeyboardEvent } from "react";
import { useRef } from "react";

import { cn } from "./variants";

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  disabled?: boolean;
};

export type SegmentedControlProps<T extends string> = {
  /** Accessible name for the radiogroup, e.g. "Learning mode". */
  label: string;
  options: Array<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

/**
 * The Roadmap / Skill practice / My Progress switcher pattern: a
 * role="radiogroup" of role="radio" buttons on the existing
 * .mode-switcher/.mode-tab surface, with roving-tabindex arrow-key
 * navigation per the WAI-ARIA radio-group authoring pattern — a single Tab
 * stop, then ArrowLeft/Right/Up/Down/Home/End move focus and selection
 * together. Disabled options are skipped when moving.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function selectIndex(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    itemRefs.current[index]?.focus();
    onChange(option.value);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const enabled = options
      .map((option, index) => (option.disabled ? -1 : index))
      .filter((index) => index !== -1);
    if (enabled.length === 0) return;

    const currentIndex = options.findIndex((option) => option.value === value);
    const currentEnabledPos = Math.max(enabled.indexOf(currentIndex), 0);

    const moveBy = (delta: number) => {
      const nextPos = (currentEnabledPos + delta + enabled.length) % enabled.length;
      selectIndex(enabled[nextPos]);
    };

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        moveBy(1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        moveBy(-1);
        break;
      case "Home":
        event.preventDefault();
        selectIndex(enabled[0]);
        break;
      case "End":
        event.preventDefault();
        selectIndex(enabled[enabled.length - 1]);
        break;
      default:
        break;
    }
  }

  return (
    <div role="radiogroup" aria-label={label} className={cn("mode-switcher", className)} onKeyDown={handleKeyDown}>
      {options.map((option, index) => (
        <button
          key={option.value}
          ref={(node) => {
            itemRefs.current[index] = node;
          }}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          tabIndex={option.value === value ? 0 : -1}
          disabled={option.disabled}
          onClick={() => onChange(option.value)}
          className="mode-tab focus-brackets"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
