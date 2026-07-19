export function BrandMark() {
  return (
    <span
      aria-hidden="true"
      className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-amber-300/25 bg-[linear-gradient(145deg,rgba(242,184,75,0.14),rgba(105,208,203,0.035))] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
    >
      <span className="h-3.5 w-3.5 rotate-45 rounded-[3px] border-2 border-amber-200" />
      <span className="absolute bottom-1.5 h-[2px] w-4 rounded-full bg-cyan-200/60" />
      <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-amber-300/15 blur-sm" />
    </span>
  );
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <BrandMark />
      <span>
        <span className="font-instrument block text-[13px] font-semibold tracking-[0.2em] text-[#f6f1e6]">
          FAULTSMITH
        </span>
        {!compact && (
          <span className="font-instrument block text-[9px] uppercase tracking-[0.17em] text-zinc-500">
            Deliberate debugging practice
          </span>
        )}
      </span>
    </span>
  );
}
