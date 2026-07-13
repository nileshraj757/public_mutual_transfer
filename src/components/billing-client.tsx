"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadCheckout(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = CHECKOUT_SRC;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

interface BillingClientProps {
  configured: boolean;
  isActive: boolean;
  status: string | null;
  currentEnd: string | null;
  cancelAtPeriodEnd: boolean;
  email: string | null;
  planName: string;
  priceLabel: string;
}

export function BillingClient({
  configured,
  isActive,
  status,
  currentEnd,
  cancelAtPeriodEnd,
  email,
  planName,
  priceLabel,
}: BillingClientProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  async function subscribe() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/billing/subscribe", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (data.alreadyActive) {
        router.refresh();
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Couldn't start checkout.");
        return;
      }

      const ok = await loadCheckout();
      if (!ok || !window.Razorpay) {
        // Fallback: Razorpay's hosted page works even if the script is blocked.
        if (data.shortUrl) window.location.href = data.shortUrl;
        else setError("Couldn't load the payment widget.");
        return;
      }

      const rzp = new window.Razorpay({
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: planName,
        description: `${planName} — monthly subscription`,
        prefill: email ? { email } : undefined,
        theme: { color: "#1e51eb" },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_subscription_id: string;
          razorpay_signature: string;
        }) => {
          await fetch("/api/billing/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          router.refresh();
        },
      });
      rzp.open();
    } finally {
      setBusy(false);
    }
  }

  function cancel() {
    setError("");
    startTransition(async () => {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      if (res.ok) router.refresh();
      else setError((await res.json().catch(() => ({})))?.error ?? "Couldn't cancel.");
    });
  }

  if (!configured) {
    return (
      <div className="card border-amber-300 bg-amber-50">
        <h2 className="font-semibold text-amber-900">Premium is coming soon</h2>
        <p className="mt-1 text-sm text-amber-800">
          Subscriptions aren&apos;t available yet — payment details are being set up. All features are currently free.
          Check back shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{planName}</h2>
          <p className="text-sm text-slate-600">{priceLabel}</p>
        </div>
        {isActive ? (
          <span className="badge bg-green-100 text-green-800">Active</span>
        ) : (
          <span className="badge bg-slate-100 text-slate-600">{status ?? "Not subscribed"}</span>
        )}
      </div>

      {isActive ? (
        <div className="mt-4 space-y-3">
          {currentEnd && (
            <p className="text-sm text-slate-600">
              {cancelAtPeriodEnd ? "Access ends on " : "Renews on "}
              <strong>{new Date(currentEnd).toLocaleDateString("en-IN")}</strong>.
            </p>
          )}
          {cancelAtPeriodEnd ? (
            <p className="text-sm text-amber-700">Cancellation scheduled — you keep premium until the period ends.</p>
          ) : (
            <button className="btn-secondary" onClick={cancel} disabled={pending}>
              {pending ? "Cancelling…" : "Cancel subscription"}
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4">
          <ul className="mb-4 space-y-1 text-sm text-slate-600">
            <li>✓ Generate & download the official joint-application PDF</li>
            <li>✓ Priority email alerts for new matches</li>
            <li>✓ Support the platform&apos;s free upkeep</li>
          </ul>
          <button className="btn-primary" onClick={subscribe} disabled={busy}>
            {busy ? "Starting…" : `Subscribe — ${priceLabel}`}
          </button>
          <p className="mt-2 text-xs text-slate-400">
            Secure recurring payment via Razorpay (UPI Autopay / cards / netbanking). Cancel anytime.
          </p>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
