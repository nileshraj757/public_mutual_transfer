"use client";

import { useEffect } from "react";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: error.message, stack: error.stack, digest: error.digest, url: window.location.href }),
    }).catch(() => {});
  }, [error]);

  return (
    <div className="grid min-h-screen place-items-center px-4 text-center [padding-top:env(safe-area-inset-top)]">
      <div>
        <p className="font-display text-5xl font-semibold text-brand-600">Oops</p>
        <h1 className="mt-2 font-display text-xl font-semibold text-sand-900">Something went wrong</h1>
        <p className="mt-1 max-w-sm text-sm text-sand-600">
          This screen hit an unexpected error. Trying again usually fixes it.
        </p>
        {error.digest && <p className="mt-2 text-xs text-sand-400">Reference: {error.digest}</p>}
        <div className="mt-5 flex justify-center gap-3">
          <button type="button" className="btn-secondary" onClick={() => reset()}>Try again</button>
          <button type="button" className="btn-primary" onClick={() => window.location.reload()}>Reload app</button>
        </div>
      </div>
    </div>
  );
}
