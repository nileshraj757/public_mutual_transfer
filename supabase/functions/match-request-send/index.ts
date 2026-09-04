// Send a "request to connect" to a profile found via Browse/Search (ported
// from src/app/api/matches/request/route.ts). Idempotent: if the two are
// already matched, or a request is already pending, returns the existing
// state instead of erroring.
import { authenticate } from "../_shared/auth.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
// import { billingEnabled } from "../_shared/razorpay.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const ctx = await authenticate(req);
  if (!ctx) return json({ error: "Not signed in." }, 401);
  const { admin, userId } = ctx;

  // Subscription flow is temporarily disabled on mobile — premium is unlocked
  // for everyone until it's reimplemented (mirrors isPremiumLockedClient in
  // src/lib/billing-client.ts). Restore this block to bring the gate back.
  // if (billingEnabled()) {
  //   const { data: sub } = await admin
  //     .from("subscriptions")
  //     .select("status, current_end")
  //     .eq("profile_id", userId)
  //     .order("created_at", { ascending: false })
  //     .limit(1)
  //     .maybeSingle();
  //   const active =
  //     sub &&
  //     (sub.status === "active" || sub.status === "authenticated") &&
  //     (!sub.current_end || new Date(sub.current_end).getTime() > Date.now());
  //   if (!active) {
  //     return json({ error: "Sending connection requests requires an active subscription." }, 402);
  //   }
  // }

  const { recipient_id } = await req.json().catch(() => ({}));
  if (!recipient_id) return json({ error: "Missing recipient_id." }, 400);
  if (recipient_id === userId) {
    return json({ error: "You can't request to connect with yourself." }, 400);
  }

  const { data: recipient } = await admin
    .from("profiles")
    .select("id, is_active")
    .eq("id", recipient_id)
    .maybeSingle();
  if (!recipient || !recipient.is_active) {
    return json({ error: "That profile isn't available right now." }, 404);
  }

  // Only short-circuit if a prior accepted request's match is still active —
  // if it was later declined ("not interested") or blocked, that match is
  // cancelled and this pair should be able to start over with a fresh request.
  const { data: existingAccepted } = await admin
    .from("match_requests")
    .select("match_id, matches(status)")
    .eq("status", "accepted")
    .or(
      `and(requester_id.eq.${userId},recipient_id.eq.${recipient_id}),and(requester_id.eq.${recipient_id},recipient_id.eq.${userId})`
    )
    .maybeSingle();
  const existingMatchStatus = (existingAccepted?.matches as { status?: string } | null)?.status;
  if (existingAccepted?.match_id && existingMatchStatus !== "cancelled") {
    return json({ ok: true, status: "accepted", match_id: existingAccepted.match_id });
  }

  const { data: reqRow, error: insertError } = await admin
    .from("match_requests")
    .insert({ requester_id: userId, recipient_id })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") return json({ ok: true, status: "pending" });
    return json({ error: insertError.message }, 400);
  }

  const { data: requesterProfile } = await admin
    .from("profiles")
    .select("current_state, current_district")
    .eq("id", userId)
    .maybeSingle();
  const from = [requesterProfile?.current_district, requesterProfile?.current_state].filter(Boolean).join(", ");

  await admin.from("notifications").insert({
    profile_id: recipient_id,
    kind: "match_request",
    title: "New connection request",
    body: from ? `Someone from ${from} wants to connect with you.` : "Someone wants to connect with you.",
    related_id: reqRow.id,
  });

  return json({ ok: true, status: "pending", request_id: reqRow.id });
});
