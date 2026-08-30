import { NextResponse, type NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { notify } from "@/lib/notify";
import { isPremiumLocked } from "@/lib/billing";

/**
 * Send a "request to connect" to a profile found via Browse/Search (ported to
 * supabase/functions/match-request-send for the native app). Idempotent: if
 * the two are already matched, or a request is already pending, returns the
 * existing state instead of erroring.
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  if (await isPremiumLocked(user.id)) {
    return NextResponse.json({ error: "Sending connection requests requires an active subscription." }, { status: 402 });
  }

  const { recipient_id } = (await request.json().catch(() => ({}))) as { recipient_id?: string };
  if (!recipient_id) return NextResponse.json({ error: "Missing recipient_id." }, { status: 400 });
  if (recipient_id === user.id) {
    return NextResponse.json({ error: "You can't request to connect with yourself." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: recipient } = await admin
    .from("profiles")
    .select("id, is_active")
    .eq("id", recipient_id)
    .maybeSingle();
  if (!recipient || !recipient.is_active) {
    return NextResponse.json({ error: "That profile isn't available right now." }, { status: 404 });
  }

  const { data: existingAccepted } = await admin
    .from("match_requests")
    .select("match_id")
    .eq("status", "accepted")
    .or(
      `and(requester_id.eq.${user.id},recipient_id.eq.${recipient_id}),and(requester_id.eq.${recipient_id},recipient_id.eq.${user.id})`
    )
    .maybeSingle();
  if (existingAccepted?.match_id) {
    return NextResponse.json({ ok: true, status: "accepted", match_id: existingAccepted.match_id });
  }

  const { data: reqRow, error: insertError } = await admin
    .from("match_requests")
    .insert({ requester_id: user.id, recipient_id })
    .select("id")
    .single();

  if (insertError) {
    // Unique violation = a pending request between this pair already exists.
    if (insertError.code === "23505") {
      return NextResponse.json({ ok: true, status: "pending" });
    }
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  const { data: requesterProfile } = await admin
    .from("profiles")
    .select("current_state, current_district")
    .eq("id", user.id)
    .maybeSingle();
  const from = [requesterProfile?.current_district, requesterProfile?.current_state].filter(Boolean).join(", ");

  await notify({
    profileId: recipient_id,
    kind: "match_request",
    title: "New connection request",
    body: from ? `Someone from ${from} wants to connect with you.` : "Someone wants to connect with you.",
    relatedId: reqRow.id,
  });

  return NextResponse.json({ ok: true, status: "pending", request_id: reqRow.id });
}
