/**
 * Zero-dependency class-name utilities for the ui/ primitive layer.
 *
 * `cn` joins class values, skipping falsy ones and flattening arrays — the
 * hand-rolled equivalent of `clsx`. `variant` builds a typed variant
 * resolver from a config object — the hand-rolled equivalent of `cva` —
 * without adding a package. Both are pure and framework-agnostic.
 */

export type ClassValue = string | number | null | boolean | undefined | ClassValue[];

export function cn(...values: ClassValue[]): string {
  const out: string[] = [];
  const push = (value: ClassValue): void => {
    if (value === null || value === undefined || value === false || value === "") return;
    if (Array.isArray(value)) {
      value.forEach(push);
      return;
    }
    out.push(String(value));
  };
  values.forEach(push);
  return out.join(" ");
}

type VariantMap = Record<string, Record<string, ClassValue>>;

type VariantConfig<V extends VariantMap> = {
  /** Classes applied regardless of the chosen variants. */
  base?: ClassValue;
  variants: V;
  defaultVariants?: { [K in keyof V]?: keyof V[K] };
};

export type VariantSelection<V extends VariantMap> = {
  [K in keyof V]?: keyof V[K];
};

/**
 * Builds a resolver: `resolve(selection, className)` returns the joined
 * class string for `base` + each selected (or default) variant option +
 * a caller override, all deduped by `cn`.
 */
export function variant<V extends VariantMap>(config: VariantConfig<V>) {
  return function resolve(selection?: VariantSelection<V>, className?: ClassValue): string {
    const parts: ClassValue[] = [config.base];
    for (const key in config.variants) {
      const chosen = selection?.[key] ?? config.defaultVariants?.[key];
      if (chosen !== undefined) {
        parts.push(config.variants[key][chosen as string]);
      }
    }
    parts.push(className);
    return cn(...parts);
  };
}
