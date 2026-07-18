// Toggle the signed-in user's `is_active` visibility (ported from
// src/app/api/account/active/route.ts). Uses the service role after verifying
// the caller. Recompute is triggered separately by the match-recompute function.
import { authenticate } from "../_shared/auth.ts";
import { corsHeaders, json } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const ctx = await authenticate(req);
  if (!ctx) return json({ error: "Not signed in." }, 401);

  const { is_active } = await req.json().catch(() => ({}));
  if (typeof is_active !== "boolean") return json({ error: "Missing is_active." }, 400);

  const { error } = await ctx.admin
    .from("profiles")
    .update({ is_active })
    .eq("id", ctx.userId);
  if (error) return json({ error: error.message }, 400);

  return json({ ok: true });
});
