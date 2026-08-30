// Accept or decline an incoming connection request (ported from
// src/app/api/matches/request/[id]/respond/route.ts). Accepting creates (or
// reuses) a real `matches` row — from there the existing consent →
// contact-reveal → chat flow takes over unmodified.
import { authenticate } from "../_shared/auth.ts";
import { corsHeaders, json } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const ctx = await authenticate(req);
  if (!ctx) return json({ error: "Not signed in." }, 401);
  const { admin, userId } = ctx;

  const { request_id, accept } = await req.json().catch(() => ({}));
  if (!request_id || typeof accept !== "boolean") {
    return json({ error: "Missing request_id or accept." }, 400);
  }

  const { data: reqRow } = await admin
    .from("match_requests")
    .select("id, requester_id, recipient_id, status")
    .eq("id", request_id)
    .maybeSingle();
  if (!reqRow || reqRow.recipient_id !== userId) return json({ error: "Request not found." }, 404);
  if (reqRow.status !== "pending") {
    return json({ error: "This request has already been responded to." }, 400);
  }

  if (!accept) {
    await admin
      .from("match_requests")
      .update({ status: "declined", responded_at: new Date().toISOString() })
      .eq("id", reqRow.id);
    await admin.from("notifications").insert({
      profile_id: reqRow.requester_id,
      kind: "system",
      title: "Your connection request was declined",
    });
    return json({ ok: true, status: "declined" });
  }

  const [a, b] = [reqRow.requester_id, reqRow.recipient_id].sort();
  const signature = `interest:${a}:${b}`;

  const { data: match, error: matchError } = await admin
    .from("matches")
    .upsert(
      { type: "direct", member_profile_ids: [reqRow.requester_id, reqRow.recipient_id], signature, status: "suggested" },
      { onConflict: "signature" }
    )
    .select("id")
    .single();
  if (matchError) return json({ error: matchError.message }, 400);

  await admin
    .from("match_requests")
    .update({ status: "accepted", match_id: match.id, responded_at: new Date().toISOString() })
    .eq("id", reqRow.id);

  await admin.from("notifications").insert({
    profile_id: reqRow.requester_id,
    kind: "new_match",
    title: "Your connection request was accepted",
    body: "Open the match to review eligibility and signal your interest.",
    link: `/matches/${match.id}`,
  });

  return json({ ok: true, status: "accepted", match_id: match.id });
});
