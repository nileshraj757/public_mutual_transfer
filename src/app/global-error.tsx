"use client";

import { useEffect } from "react";

/**
 * Catches errors that escape even the root layout (rare, but with no boundary
 * at all those previously showed Next.js's bare, unhelpful generic message).
 * Must render its own <html>/<body> since it replaces the whole tree.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: error.message, stack: error.stack, digest: error.digest, url: window.location.href, boundary: "global" }),
    }).catch(() => {});
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{ display: "grid", minHeight: "100vh", placeItems: "center", padding: "16px", textAlign: "center", fontFamily: "sans-serif" }}>
          <div>
            <p style={{ fontSize: "2.5rem", fontWeight: 700, color: "#146152" }}>Oops</p>
            <h1 style={{ marginTop: 8, fontSize: "1.25rem", fontWeight: 600, color: "#241d16" }}>Something went wrong</h1>
            <p style={{ marginTop: 4, maxWidth: 320, fontSize: "0.875rem", color: "#6b5d4d" }}>
              The app hit an unexpected error. Reloading usually fixes it.
            </p>
            {error.digest && <p style={{ marginTop: 8, fontSize: "0.75rem", color: "#af9f8b" }}>Reference: {error.digest}</p>}
            <div style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 12 }}>
              <button
                type="button"
                onClick={() => reset()}
                style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #d3c8b8", background: "#fff", color: "#52463a", fontSize: "0.875rem", fontWeight: 500 }}
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#146152", color: "#fff", fontSize: "0.875rem", fontWeight: 500 }}
              >
                Reload app
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
