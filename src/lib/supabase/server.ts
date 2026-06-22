import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, getServiceRoleKey } from "@/lib/env";

/**
 * Server-side Supabase client bound to the request cookies (respects RLS as the
 * signed-in user). Use in Server Components, Route Handlers and Server Actions.
 */
export function createClient() {
  const cookieStore = cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component where cookies are read-only — the
          // middleware refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}

/**
 * Privileged client using the service role key. BYPASSES RLS — only use in
 * trusted server code (match recompute, admin actions, hard account deletion).
 * Never expose to the browser.
 */
export function createAdminClient() {
  return createSupabaseClient(SUPABASE_URL, getServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
