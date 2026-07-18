"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("FaultSmith route error", error.digest ?? "no-digest");
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <section className="max-w-lg rounded-2xl border border-white/10 bg-[#111418] p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Recovery checkpoint</p>
        <h1 className="mt-3 text-2xl font-semibold text-white">The lab could not render safely.</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Your browser-local attempt is still available. Retry the route, or reload to restore the last saved checkpoint.
        </p>
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="mt-6 rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-[#1a1105] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Retry lab
        </button>
      </section>
    </main>
  );
}
