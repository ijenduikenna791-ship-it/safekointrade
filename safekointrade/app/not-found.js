import Link from "next/link";

// Fallback for requests that never reach a locale segment.
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100dvh", margin: 0, background: "#f4f6f5", color: "#0f1e26" }}>
        <main style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 24 }}>Page not found</h1>
          <p><Link href="/" style={{ color: "#8a6524" }}>Go to the homepage</Link></p>
        </main>
      </body>
    </html>
  );
}
