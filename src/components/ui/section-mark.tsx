export type SectionMarkProps = {
  /** A two-digit stage number ("01") for the page's narrative sequence, or a
   * literal marker like "EOF" for the closing section, which isn't a step in
   * that sequence. */
  index: string;
  children: string;
};

/**
 * Terminal-native section eyebrow ornament. Flanks the existing eyebrow copy
 * with box-drawing rule characters and a "§" stage marker, e.g.
 * "── § 01 · Problem / reasoning bypass ──" — a commented-header treatment
 * that reads like an annotated terminal buffer rather than a generic
 * marketing eyebrow.
 *
 * The rule/marker glyphs carry no information a reader needs (the section's
 * place in the page is already legible from scroll position and heading
 * text), so they're wrapped in aria-hidden spans; only the plain label text
 * — unwrapped, in document order — reaches assistive tech.
 */
export function SectionMark({ index, children }: SectionMarkProps) {
  const marker = /^\d+$/.test(index) ? `§ ${index}` : index;
  return (
    <>
      <span aria-hidden="true" className="section-mark-glyph">{`── ${marker} ·`}</span>{" "}
      {children}{" "}
      <span aria-hidden="true" className="section-mark-glyph">──</span>
    </>
  );
}
