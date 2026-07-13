import crypto from "node:crypto";
import type { SubscriptionStatus } from "@/lib/types";

/**
 * Razorpay subscriptions via the REST API + node:crypto — no SDK dependency.
 * Server-only (uses the secret key). Everything no-ops / reports "not configured"
 * until the keys + plan id are set, so the app runs fine before you add bank
 * details.
 *
 * Required env to enable billing:
 *   NEXT_PUBLIC_RAZORPAY_KEY_ID   (rzp_test_… / rzp_live_…)  — public, for Checkout
 *   RAZORPAY_KEY_SECRET           — server secret
 *   RAZORPAY_PLAN_ID              (plan_…)  — your monthly plan (create in dashboard)
 *   RAZORPAY_WEBHOOK_SECRET       — for verifying webhooks
 * Optional:
 *   RAZORPAY_TOTAL_COUNT          — max billing cycles (default 120 months)
 */

const API = "https://api.razorpay.com/v1";

/** True only when keys + plan are all present. Gating is inert until then. */
export function billingEnabled(): boolean {
  return Boolean(
    process.env.RAZORPAY_KEY_SECRET &&
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID &&
      process.env.RAZORPAY_PLAN_ID
  );
}

export function publicKeyId(): string {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";
}

function authHeader(): string {
  const id = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";
  const secret = process.env.RAZORPAY_KEY_SECRET ?? "";
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

async function rzp<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: authHeader(), "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error?.description || `Razorpay request failed (${res.status})`);
  }
  return json as T;
}

export interface RazorpaySubscription {
  id: string;
  plan_id: string;
  status: SubscriptionStatus;
  short_url: string | null;
  current_start: number | null;
  current_end: number | null;
  customer_id: string | null;
}

/** Create a recurring monthly subscription against the configured plan. */
export async function createSubscription(notes: Record<string, string>): Promise<RazorpaySubscription> {
  const totalCount = parseInt(process.env.RAZORPAY_TOTAL_COUNT ?? "120", 10) || 120;
  return rzp<RazorpaySubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      plan_id: process.env.RAZORPAY_PLAN_ID,
      total_count: totalCount,
      customer_notify: 1,
      notes,
    }),
  });
}

/** Cancel a subscription (at cycle end by default, so access lasts the period). */
export async function cancelSubscription(subId: string, cancelAtCycleEnd = true): Promise<RazorpaySubscription> {
  return rzp<RazorpaySubscription>(`/subscriptions/${subId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ cancel_at_cycle_end: cancelAtCycleEnd ? 1 : 0 }),
  });
}

export async function fetchSubscription(subId: string): Promise<RazorpaySubscription> {
  return rzp<RazorpaySubscription>(`/subscriptions/${subId}`, { method: "GET" });
}

/** Verify the Checkout callback signature for a subscription payment. */
export function verifyPaymentSignature(paymentId: string, subscriptionId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  // For subscriptions Razorpay signs `payment_id|subscription_id`.
  const expected = crypto.createHmac("sha256", secret).update(`${paymentId}|${subscriptionId}`).digest("hex");
  return safeEqual(expected, signature);
}

/** Verify a webhook payload against the raw body + webhook secret. */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}

function safeEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/** Unix seconds → ISO string (Razorpay sends epoch seconds). */
export function epochToIso(sec: number | null | undefined): string | null {
  return sec ? new Date(sec * 1000).toISOString() : null;
}
