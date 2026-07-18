import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Thin client for invoking Supabase Edge Functions from the app.
 *
 * `supabase.functions.invoke` automatically attaches the signed-in user's access
 * token as `Authorization: Bearer <token>`, which each function verifies before
 * doing any privileged (service-role) work. Use this from the mobile app for the
 * operations that can't run under the caller's RLS — see supabase/functions/*.
 *
 * Throws on a transport error or a non-2xx response so callers can try/catch.
 */
export async function callFn<T = unknown>(
  supabase: SupabaseClient,
  name: FunctionName,
  body?: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, {
    body: body ?? {},
  });
  if (error) throw new Error(error.message || `Edge function ${name} failed`);
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(String((data as { error: unknown }).error));
  }
  return data as T;
}

/** The privileged operations that live as Supabase Edge Functions. */
export type FunctionName =
  | "account-active"
  | "account-delete"
  | "match-recompute"
  | "match-recompute-all"
  | "billing-subscribe"
  | "billing-verify"
  | "billing-cancel";
// match-recompute-all is admin-only (used by the mobile admin overview). Not
// exposed to the mobile app: agreement-PDF generation (heavier pdf-lib port,
// deferred). See supabase/functions/README.md.
