import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Where to send a user right after they authenticate (password sign-in, magic
 * link, or signup-confirmation). First-time users (no profile row yet) always
 * go to onboarding; everyone else goes to their intended destination (default
 * the matches/dashboard tab). Shared by the web callback route, the mobile
 * callback page, and password sign-in — one rule, evaluated with whichever
 * Supabase client the caller has (cookie server client or browser client).
 */
export async function postAuthDestination(
  supabase: SupabaseClient,
  userId: string,
  next: string
): Promise<string> {
  const { data: profile } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
  return profile ? next : "/onboarding";
}
