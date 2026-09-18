"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { isNativeApp } from "@/lib/native";
import { callFn } from "@/lib/functions";
import { createClient } from "@/lib/supabase/client";

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
  /** Mobile re-fetch hook (router.refresh() is a no-op under static export). */
  onDone?: () => void;
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
  onDone,
}: BillingClientProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  async function subscribe() {
    setError("");
    setBusy(true);
    try {
      let data: {
        alreadyActive?: boolean;
        error?: string;
        keyId?: string;
        subscriptionId?: string;
        shortUrl?: string;
      };
      if (isNativeApp()) {
        try {
          data = await callFn(createClient(), "billing-subscribe");
        } catch (e) {
          setError((e as Error).message || "Couldn't start checkout.");
          return;
        }
      } else {
        const res = await fetch("/api/billing/subscribe", { method: "POST" });
        data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? "Couldn't start checkout.");
          return;
        }
      }
      if (data.alreadyActive) {
        router.refresh();
        onDone?.();
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
        theme: { color: "#2fc488" },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_subscription_id: string;
          razorpay_signature: string;
        }) => {
          if (isNativeApp()) {
            await callFn(createClient(), "billing-verify", { ...response });
          } else {
            await fetch("/api/billing/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            });
          }
          router.refresh();
          onDone?.();
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
      try {
        if (isNativeApp()) {
          await callFn(createClient(), "billing-cancel");
        } else {
          const res = await fetch("/api/billing/cancel", { method: "POST" });
          if (!res.ok) {
            setError((await res.json().catch(() => ({})))?.error ?? "Couldn't cancel.");
            return;
          }
        }
        router.refresh();
        onDone?.();
      } catch (e) {
        setError((e as Error).message || "Couldn't cancel.");
      }
    });
  }

  if (!configured) {
    return (
      <div className="space-y-4">
        <div className="ts-card" style={{ borderColor: "var(--ts-warning-border)" }}>
          <h2 className="font-semibold" style={{ color: "var(--ts-text-strong)" }}>Premium is coming soon</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--ts-muted)" }}>
            Subscriptions aren&apos;t available yet — payment details are being set up. All features are currently free.
            Check back shortly.
          </p>
        </div>
        <BillingFaq />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="ts-card" style={{ borderColor: "var(--ts-warning-border)", boxShadow: "var(--ts-shadow-card), 0 0 40px rgba(240,166,60,0.1)" }}>
        <p className="text-xs font-bold tracking-[0.5px]" style={{ color: "var(--ts-warning)" }}>PREMIUM</p>
        <div className="mt-1 flex items-baseline gap-2">
          <h2 className="font-display text-2xl font-extrabold" style={{ color: "var(--ts-text-strong)" }}>{planName}</h2>
          {isActive ? (
            <span className="ts-badge" style={{ background: "var(--ts-accent-soft)", color: "var(--ts-accent-strong)" }}>Active</span>
          ) : (
            <span className="ts-badge" style={{ background: "var(--ts-surface)", color: "var(--ts-muted)" }}>{status ?? "Not subscribed"}</span>
          )}
        </div>
        <p className="text-sm" style={{ color: "var(--ts-muted)" }}>{priceLabel}</p>

        {isActive ? (
          <div className="mt-5 space-y-3">
            {currentEnd && (
              <div className="rounded-xl px-3.5 py-3 text-sm font-semibold" style={{ background: "var(--ts-accent-soft)", color: "var(--ts-accent-strong)" }}>
                {cancelAtPeriodEnd ? "Access ends on " : "Active · renews "}
                {new Date(currentEnd).toLocaleDateString("en-IN")}
              </div>
            )}
            {cancelAtPeriodEnd ? (
              <p className="text-sm" style={{ color: "var(--ts-warning)" }}>Cancellation scheduled — you keep premium until the period ends.</p>
            ) : (
              <button className="ts-btn-secondary w-full" onClick={cancel} disabled={pending}>
                {pending ? "Cancelling…" : "Cancel subscription"}
              </button>
            )}
          </div>
        ) : (
          <div className="mt-4">
            <ul className="mb-5 space-y-2 text-sm" style={{ color: "var(--ts-muted)" }}>
              <li className="flex items-start gap-2"><CheckMark />See your Direct &amp; Chain matches in full</li>
              <li className="flex items-start gap-2"><CheckMark />Send connection requests and chat once there&apos;s mutual interest</li>
              <li className="flex items-start gap-2"><CheckMark />Get match, message and request alerts</li>
              <li className="flex items-start gap-2"><CheckMark />Generate &amp; download the official joint-application PDF</li>
            </ul>
            <button
              className="relative w-full overflow-hidden rounded-2xl py-3.5 text-sm font-bold"
              style={{ background: "linear-gradient(135deg, var(--ts-warning), var(--ts-warning-strong))", color: "var(--ts-on-warning)" }}
              onClick={subscribe}
              disabled={busy}
            >
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 w-2/5 animate-ts-sweep"
                style={{ background: "linear-gradient(120deg, transparent, rgba(255,255,255,0.5), transparent)" }}
              />
              <span className="relative">{busy ? "Starting…" : `Subscribe — ${priceLabel}`}</span>
            </button>
            <p className="mt-2.5 text-xs" style={{ color: "var(--ts-faint)" }}>
              Secure recurring payment via Razorpay (UPI Autopay / cards / netbanking). Cancel anytime.
            </p>
          </div>
        )}

        {error && <p className="mt-3 text-sm" style={{ color: "var(--ts-danger)" }}>{error}</p>}
      </div>
      <BillingFaq />
    </div>
  );
}

function CheckMark() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ts-warning)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0" aria-hidden>
      <path d="M5 13l4.5 4.5L19 7" />
    </svg>
  );
}

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "What payment methods can I use?",
    a: "Cards, netbanking, and UPI (including UPI Autopay for the recurring subscription) via Razorpay, subject to what your bank supports.",
  },
  {
    q: "Why don't I see UPI as an option at checkout?",
    a: "UPI Autopay for recurring subscriptions depends on your bank's support for e-mandates and can take a moment to appear. If it's missing, cards and netbanking work the same way and can be used right away.",
  },
  {
    q: "Is this a recurring subscription?",
    a: "Yes — it renews automatically each billing cycle until you cancel. You can cancel anytime from this page.",
  },
  {
    q: "What happens when I cancel?",
    a: "You keep Premium access until the end of the period you already paid for, then it won't renew. No partial charges happen after you cancel.",
  },
  {
    q: "Do you get a refund for the current period?",
    a: "No — cancelling stops future renewals but doesn't refund the current billing period, in line with Razorpay's standard subscription handling.",
  },
  {
    q: "Do you store my card or bank details?",
    a: "No. Payments are processed entirely by Razorpay — we never see or store your card, UPI, or bank details.",
  },
];

function BillingFaq() {
  return (
    <div className="ts-card">
      <h2 className="font-semibold" style={{ color: "var(--ts-text-strong)" }}>Frequently asked questions</h2>
      <div className="mt-2 divide-y" style={{ borderColor: "var(--ts-border)" }}>
        {FAQ_ITEMS.map((item) => (
          <details key={item.q} className="group py-3 first:pt-0 last:pb-0" style={{ borderColor: "var(--ts-border)" }}>
            <summary
              className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold marker:content-none"
              style={{ color: "var(--ts-text-strong)" }}
            >
              {item.q}
              <span aria-hidden className="shrink-0 text-lg leading-none transition-transform group-open:rotate-45" style={{ color: "var(--ts-muted)" }}>
                +
              </span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--ts-muted)" }}>
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}
