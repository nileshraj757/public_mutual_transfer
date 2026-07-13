import { createClient } from "@/lib/supabase/server";
import { billingEnabled } from "@/lib/razorpay";
import type { Subscription } from "@/lib/types";

/** The signed-in user's most recent subscription row (read via their RLS). */
export async function getLatestSubscription(userId: string): Promise<Subscription | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("profile_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Subscription) ?? null;
}

/** Is this subscription currently granting access? */
export function isActiveSubscription(sub: Subscription | null): boolean {
  if (!sub) return false;
  if (sub.status !== "active" && sub.status !== "authenticated") return false;
  if (sub.current_end && new Date(sub.current_end).getTime() < Date.now()) return false;
  return true;
}

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  return isActiveSubscription(await getLatestSubscription(userId));
}

/**
 * Whether the user may use premium features. Returns true when billing is NOT
 * configured (everything is free until you add Razorpay keys), or when the user
 * has an active subscription. Use this to gate premium features.
 */
export async function canUsePremium(userId: string): Promise<boolean> {
  if (!billingEnabled()) return true;
  return hasActiveSubscription(userId);
}

/** True only when billing is configured AND the user is NOT subscribed. */
export async function isPremiumLocked(userId: string): Promise<boolean> {
  if (!billingEnabled()) return false;
  return !(await hasActiveSubscription(userId));
}
