import { NextResponse, type NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { notify } from "@/lib/notify";

/**
 * Accept or decline an incoming connection request (ported to
 * supabase/functions/match-request-respond for the native app). Accepting
 * creates (or reuses) a real `matches` row — from there the existing
 * consent → contact-reveal → chat flow (ConsentPanel, MessageThread) takes
 * over unmodified.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { accept } = (await request.json().catch(() => ({}))) as { accept?: boolean };
  if (typeof accept !== "boolean") return NextResponse.json({ error: "Missing accept value." }, { status: 400 });

  const admin = createAdminClient();

  const { data: reqRow } = await admin
    .from("match_requests")
    .select("id, requester_id, recipient_id, status")
    .eq("id", params.id)
    .maybeSingle();
  if (!reqRow || reqRow.recipient_id !== user.id) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }
  if (reqRow.status !== "pending") {
    return NextResponse.json({ error: "This request has already been responded to." }, { status: 400 });
  }

  if (!accept) {
    await admin
      .from("match_requests")
      .update({ status: "declined", responded_at: new Date().toISOString() })
      .eq("id", reqRow.id);
    await notify({
      profileId: reqRow.requester_id,
      kind: "system",
      title: "Your connection request was declined",
    });
    return NextResponse.json({ ok: true, status: "declined" });
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
  if (matchError) return NextResponse.json({ error: matchError.message }, { status: 400 });

  await admin
    .from("match_requests")
    .update({ status: "accepted", match_id: match.id, responded_at: new Date().toISOString() })
    .eq("id", reqRow.id);

  await notify({
    profileId: reqRow.requester_id,
    kind: "new_match",
    title: "Your connection request was accepted",
    body: "Open the match to review eligibility and signal your interest.",
    link: `/matches/${match.id}`,
  });

  return NextResponse.json({ ok: true, status: "accepted", match_id: match.id });
}
