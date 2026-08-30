import { NextResponse, type NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * Block a profile (ported to supabase/functions/profile-block for the native
 * app). Blocking is enforced by RLS/RPC changes in
 * supabase/migrations/0008_relaxed_rules_and_prefs.sql — this route only needs
 * the service role to also cascade-cancel any existing shared match, which a
 * plain RLS insert into blocked_profiles can't do on its own.
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { profile_id } = (await request.json().catch(() => ({}))) as { profile_id?: string };
  if (!profile_id) return NextResponse.json({ error: "Missing profile_id." }, { status: 400 });
  if (profile_id === user.id) return NextResponse.json({ error: "You can't block yourself." }, { status: 400 });

  const admin = createAdminClient();

  const { error: insertError } = await admin
    .from("blocked_profiles")
    .upsert({ blocker_id: user.id, blocked_id: profile_id }, { onConflict: "blocker_id,blocked_id" });
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });

  await admin
    .from("matches")
    .update({ status: "cancelled" })
    .contains("member_profile_ids", [user.id, profile_id])
    .neq("status", "cancelled")
    .neq("status", "completed");

  return NextResponse.json({ ok: true });
}
