"use client";

// Last-resort boundary when the root layout itself fails.
export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100dvh", margin: 0, background: "#f4f6f5", color: "#0f1e26" }}>
        <main style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 24 }}>Something went wrong</h1>
          <p>The page couldn&apos;t load. Try again in a moment.</p>
          <button onClick={() => reset()} style={{ marginTop: 16, padding: "10px 18px", borderRadius: 8, border: 0, background: "#0f1e26", color: "#f4f6f5", cursor: "pointer" }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
