// Deno port of src/lib/razorpay.ts (REST + HMAC, no SDK). Server-only secrets.
// Set these as Supabase function secrets:
//   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_PLAN_ID,
//   RAZORPAY_WEBHOOK_SECRET, (optional) RAZORPAY_TOTAL_COUNT
import { createHmac, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";

const API = "https://api.razorpay.com/v1";

export function billingEnabled(): boolean {
  return Boolean(
    Deno.env.get("RAZORPAY_KEY_SECRET") &&
      Deno.env.get("RAZORPAY_KEY_ID") &&
      Deno.env.get("RAZORPAY_PLAN_ID")
  );
}

export function publicKeyId(): string {
  return Deno.env.get("RAZORPAY_KEY_ID") ?? "";
}

function authHeader(): string {
  const id = Deno.env.get("RAZORPAY_KEY_ID") ?? "";
  const secret = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

// deno-lint-ignore no-explicit-any
async function rzp<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
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
  status: string;
  short_url: string | null;
  current_start: number | null;
  current_end: number | null;
  customer_id: string | null;
}

export function createSubscription(notes: Record<string, string>): Promise<RazorpaySubscription> {
  const totalCount = parseInt(Deno.env.get("RAZORPAY_TOTAL_COUNT") ?? "120", 10) || 120;
  return rzp<RazorpaySubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      plan_id: Deno.env.get("RAZORPAY_PLAN_ID"),
      total_count: totalCount,
      customer_notify: 1,
      notes,
    }),
  });
}

export function cancelSubscription(subId: string, cancelAtCycleEnd = true): Promise<RazorpaySubscription> {
  return rzp<RazorpaySubscription>(`/subscriptions/${subId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ cancel_at_cycle_end: cancelAtCycleEnd ? 1 : 0 }),
  });
}

export function verifyPaymentSignature(paymentId: string, subscriptionId: string, signature: string): boolean {
  const secret = Deno.env.get("RAZORPAY_KEY_SECRET");
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(`${paymentId}|${subscriptionId}`).digest("hex");
  return safeEqual(expected, signature);
}

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}

function safeEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    return ba.length === bb.length && timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export function epochToIso(sec: number | null | undefined): string | null {
  return sec ? new Date(sec * 1000).toISOString() : null;
}
