// Block a profile (ported from src/app/api/profiles/block/route.ts). Blocking
// itself is enforced by RLS/RPC changes in
// supabase/migrations/0008_relaxed_rules_and_prefs.sql — this function only
// needs the service role to also cascade-cancel any existing shared match.
import { authenticate } from "../_shared/auth.ts";
import { corsHeaders, json } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const ctx = await authenticate(req);
  if (!ctx) return json({ error: "Not signed in." }, 401);
  const { admin, userId } = ctx;

  const { profile_id } = await req.json().catch(() => ({}));
  if (!profile_id) return json({ error: "Missing profile_id." }, 400);
  if (profile_id === userId) return json({ error: "You can't block yourself." }, 400);

  const { error: insertError } = await admin
    .from("blocked_profiles")
    .upsert({ blocker_id: userId, blocked_id: profile_id }, { onConflict: "blocker_id,blocked_id" });
  if (insertError) return json({ error: insertError.message }, 400);

  await admin
    .from("matches")
    .update({ status: "cancelled" })
    .contains("member_profile_ids", [userId, profile_id])
    .neq("status", "cancelled")
    .neq("status", "completed");

  return json({ ok: true });
});
