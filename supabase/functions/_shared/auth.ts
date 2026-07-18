import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

/**
 * Shared bootstrap for privileged Edge Functions.
 *
 * Verifies the caller's Bearer token (the mobile app sends the signed-in user's
 * access token) and returns both the authenticated user and a SERVICE-ROLE
 * client for the privileged work. The service key never leaves the function.
 *
 * Returns `null` when the caller is not authenticated, so handlers can early-out
 * with a 401.
 */
export interface AuthedContext {
  userId: string;
  email: string | null;
  /** Service-role client — bypasses RLS. Use only after the auth check. */
  admin: SupabaseClient;
}

export async function authenticate(req: Request): Promise<AuthedContext | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  // Resolve the user from their access token using the anon client.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return null;

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return { userId: user.id, email: user.email ?? null, admin };
}
