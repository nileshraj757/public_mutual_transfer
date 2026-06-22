import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const rl = rateLimit(`reports:${user.id}`, 5, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many reports. Try again later." }, { status: 429 });

  const { match_id, reported_profile_id, reason } = (await request.json().catch(() => ({}))) as {
    match_id?: string;
    reported_profile_id?: string;
    reason?: string;
  };
  if (!reason?.trim()) return NextResponse.json({ error: "Reason is required." }, { status: 400 });

  const { error } = await supabase.from("reports").insert({
    reporter_profile_id: user.id,
    reported_profile_id: reported_profile_id ?? null,
    match_id: match_id ?? null,
    reason: reason.trim(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
