import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notify } from "@/lib/notify";
import type { MatchStatus } from "@/lib/types";

/** Record (or withdraw) the user's interest in a match. When everyone has
 *  consented the status advances to 'contact_shared', unlocking reveal/messaging. */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { consented } = (await request.json().catch(() => ({}))) as { consented?: boolean };
  if (typeof consented !== "boolean") {
    return NextResponse.json({ error: "Missing consent value." }, { status: 400 });
  }

  // RLS ensures the match is only returned if the caller is a member.
  const { data: match } = await supabase
    .from("matches")
    .select("id, member_profile_ids, status")
    .eq("id", params.id)
    .maybeSingle();
  if (!match) return NextResponse.json({ error: "Match not found." }, { status: 404 });

  const { error: upErr } = await supabase.from("match_consents").upsert(
    {
      match_id: params.id,
      profile_id: user.id,
      consented,
      consented_at: consented ? new Date().toISOString() : null,
    },
    { onConflict: "match_id,profile_id" }
  );
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

  // Recompute aggregate status from all consent rows.
  const { data: consents } = await supabase
    .from("match_consents")
    .select("profile_id, consented")
    .eq("match_id", params.id);

  const consentedIds = new Set((consents ?? []).filter((c) => c.consented).map((c) => c.profile_id));
  const total = match.member_profile_ids.length;
  const allConsented = match.member_profile_ids.every((id: string) => consentedIds.has(id));

  let nextStatus: MatchStatus = match.status;
  if (!["agreement_generated", "completed", "cancelled"].includes(match.status)) {
    nextStatus = allConsented ? "contact_shared" : consentedIds.size > 0 ? "both_interested" : "suggested";
    if (nextStatus !== match.status) {
      await supabase.from("matches").update({ status: nextStatus }).eq("id", params.id);
    }
  }

  // Notify the other members.
  const others = match.member_profile_ids.filter((id: string) => id !== user.id);
  await Promise.all(
    others.map((pid: string) =>
      notify({
        profileId: pid,
        kind: "consent",
        title: allConsented ? "All parties consented — contact unlocked" : "Someone is interested in your match",
        body: allConsented
          ? "Open the match to view contact details and start messaging."
          : `${consentedIds.size}/${total} parties are now interested.`,
        link: `/matches/${params.id}`,
      })
    )
  );

  return NextResponse.json({ ok: true, status: nextStatus, allConsented });
}
