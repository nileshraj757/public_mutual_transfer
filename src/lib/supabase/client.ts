"use client";

import { createBrowserClient } from "@supabase/ssr";
import { createClient as createSupabaseJsClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { isNativeApp } from "@/lib/native";

// Harmless fallbacks so the client constructor never throws when Supabase isn't
// configured yet (e.g. during the mobile static export/prerender, or before keys
// are added). Real NEXT_PUBLIC_ values are inlined at build time when present.
const URL_OR_PLACEHOLDER = SUPABASE_URL || "https://placeholder.supabase.co";
const KEY_OR_PLACEHOLDER = SUPABASE_ANON_KEY || "placeholder-anon-key";

/**
 * Browser-side Supabase client (public anon key + RLS).
 *
 * - Web: the @supabase/ssr browser client stores the session in cookies so the
 *   Next.js server (SSR, middleware, route handlers) can read it. Unchanged.
 * - Native (standalone mobile app): there is no server to share cookies with, so
 *   we use the plain supabase-js client with a localStorage-persisted PKCE
 *   session. `detectSessionInUrl` is off — the magic-link/OTP code is exchanged
 *   explicitly by the /auth/callback page (see mobile/app/auth/callback).
 *
 * Cached as a module-level singleton: every caller (sign-in form, callback
 * page, AppProviders) must share the exact same GoTrueClient instance. Two
 * separate instances read/write the same localStorage key fine, but each
 * caches its session in memory after its first getSession() call rather than
 * re-reading storage on every call — so a second instance never learns about a
 * session the first instance just wrote, and guards relying on it see no
 * session at all even right after a successful sign-in.
 */
let cachedClient: SupabaseClient | undefined;

export function createClient() {
  if (cachedClient) return cachedClient;
  cachedClient = isNativeApp()
    ? createSupabaseJsClient(URL_OR_PLACEHOLDER, KEY_OR_PLACEHOLDER, {
        auth: {
          flowType: "pkce",
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          storage: window.localStorage,
          storageKey: "mt-auth",
        },
      })
    : createBrowserClient(URL_OR_PLACEHOLDER, KEY_OR_PLACEHOLDER);
  return cachedClient;
}
