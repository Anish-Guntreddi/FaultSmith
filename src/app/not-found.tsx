import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <section className="max-w-lg text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">404 · Unknown lab</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">This challenge does not exist.</h1>
        <Link className="mt-6 inline-block rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-[#1a1105]" href="/">
          Return to FaultSmith
        </Link>
      </section>
    </main>
  );
}
