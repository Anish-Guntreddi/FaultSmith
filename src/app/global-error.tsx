"use client";

export default function GlobalError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#090b0d", color: "#f3f5f7", fontFamily: "Arial, sans-serif" }}>
        <main style={{ display: "grid", minHeight: "100vh", placeItems: "center", padding: 24 }}>
          <section style={{ maxWidth: 520, textAlign: "center" }}>
            <h1>FaultSmith needs a clean restart.</h1>
            <p style={{ color: "#a1a1aa", lineHeight: 1.6 }}>
              The application shell encountered an unexpected error. Your saved attempt remains in this browser.
            </p>
            <button
              type="button"
              onClick={() => unstable_retry()}
              style={{ border: 0, borderRadius: 12, background: "#f0a43c", color: "#1a1105", cursor: "pointer", fontWeight: 700, padding: "12px 20px" }}
            >
              Retry FaultSmith
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
