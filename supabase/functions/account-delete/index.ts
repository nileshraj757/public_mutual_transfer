// DPDP "right to erasure": permanently delete the caller's account and all their
// data (ported from src/app/api/account/delete/route.ts). Matches reference
// members via an array (not an FK), so they're deleted explicitly first; the rest
// cascade from the auth user / profile row.
import { authenticate } from "../_shared/auth.ts";
import { corsHeaders, json } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const ctx = await authenticate(req);
  if (!ctx) return json({ error: "Not signed in." }, 401);

  const { admin, userId } = ctx;

  // Remove matches that include this user (cascades consents/messages).
  const { data: matches } = await admin
    .from("matches")
    .select("id")
    .contains("member_profile_ids", [userId]);
  if (matches?.length) {
    await admin.from("matches").delete().in("id", matches.map((m: { id: string }) => m.id));
  }

  // Deleting the auth user cascades to profiles → preferences, match_consents,
  // messages, notifications; reports are set null.
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    await admin.from("profiles").delete().eq("id", userId);
    return json({ error: error.message }, 500);
  }

  return json({ ok: true });
});
