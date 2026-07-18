import type { Subscription } from "@/lib/types";

/**
 * Browser-safe subscription helpers (no node/server imports) so the mobile app
 * can evaluate access. The server-only wrappers live in @/lib/billing.
 */

/** Is this subscription currently granting access? */
export function isActiveSubscription(sub: Subscription | null): boolean {
  if (!sub) return false;
  if (sub.status !== "active" && sub.status !== "authenticated") return false;
  if (sub.current_end && new Date(sub.current_end).getTime() < Date.now()) return false;
  return true;
}
