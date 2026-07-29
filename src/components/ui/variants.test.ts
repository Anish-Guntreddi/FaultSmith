import { describe, expect, it } from "vitest";

import { cn, variant } from "@/components/ui/variants";

describe("cn", () => {
  it("joins truthy string values with a single space", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("filters out falsy values", () => {
    expect(cn("a", false, undefined, null, "", "b")).toBe("a b");
  });

  it("keeps the literal string 0 as falsy input filtered, but numeric 0 class names never occur in practice", () => {
    // Guards the specific falsy set cn() treats as "omit": null/undefined/false/"" — not the number 0.
    expect(cn("a", 0 as unknown as string)).toBe("a 0");
  });

  it("flattens nested arrays", () => {
    expect(cn("a", ["b", ["c", false, "d"]], undefined)).toBe("a b c d");
  });

  it("returns an empty string when nothing is truthy", () => {
    expect(cn(false, undefined, null, "")).toBe("");
  });
});

describe("variant", () => {
  const buttonVariant = variant({
    base: "focus-brackets rounded-xl",
    variants: {
      tone: {
        primary: "primary-action",
        secondary: "secondary-action",
      },
      size: {
        sm: "px-3 py-1.5 text-xs",
        md: "px-5 py-2.5 text-sm",
      },
    },
    defaultVariants: {
      tone: "primary",
      size: "md",
    },
  });

  it("applies default variants when no selection is given", () => {
    expect(buttonVariant()).toBe("focus-brackets rounded-xl primary-action px-5 py-2.5 text-sm");
  });

  it("overrides individual variants from the selection", () => {
    expect(buttonVariant({ tone: "secondary" })).toBe(
      "focus-brackets rounded-xl secondary-action px-5 py-2.5 text-sm",
    );
  });

  it("appends a caller className after resolved variant classes", () => {
    expect(buttonVariant({ size: "sm" }, "mt-4")).toBe(
      "focus-brackets rounded-xl primary-action px-3 py-1.5 text-xs mt-4",
    );
  });

  it("omits a variant entirely when it has no default and no selection", () => {
    const noDefaults = variant({
      base: "card",
      variants: { tone: { warm: "warm", cool: "cool" } },
    });
    expect(noDefaults()).toBe("card");
    expect(noDefaults({ tone: "cool" })).toBe("card cool");
  });
});
