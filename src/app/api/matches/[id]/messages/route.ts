import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notify } from "@/lib/notify";
import { rateLimit } from "@/lib/rate-limit";

/** Send a message in a match. Rate-limited and gated by RLS (members of a
 *  fully-consented match only). Reads happen client-side via Supabase + RLS. */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const rl = rateLimit(`messages:${user.id}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "You're sending messages too fast. Slow down a moment." }, { status: 429 });
  }

  const { body } = (await request.json().catch(() => ({}))) as { body?: string };
  const text = (body ?? "").trim();
  if (!text) return NextResponse.json({ error: "Empty message." }, { status: 400 });
  if (text.length > 4000) return NextResponse.json({ error: "Message too long." }, { status: 400 });

  // RLS enforces membership + all-consented; this insert fails otherwise.
  const { error } = await supabase
    .from("messages")
    .insert({ match_id: params.id, sender_profile_id: user.id, body: text });
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });

  // Notify other members (best effort).
  const { data: match } = await supabase
    .from("matches")
    .select("member_profile_ids")
    .eq("id", params.id)
    .maybeSingle();
  const others = (match?.member_profile_ids ?? []).filter((id: string) => id !== user.id);
  await Promise.all(
    others.map((pid: string) =>
      notify({ profileId: pid, kind: "message", title: "New message in your match", link: `/matches/${params.id}` })
    )
  );

  return NextResponse.json({ ok: true });
}
