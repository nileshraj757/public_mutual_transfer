import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

/**
 * DPDP "right to erasure": permanently delete the user's account and ALL their
 * data. Most tables cascade from profiles/auth user; matches reference members
 * via an array (not an FK), so we delete those explicitly first.
 */
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const admin = createAdminClient();

  // Remove matches that include this user (and their cascaded consents/messages).
  const { data: matches } = await admin
    .from("matches")
    .select("id")
    .contains("member_profile_ids", [user.id]);
  if (matches?.length) {
    await admin
      .from("matches")
      .delete()
      .in(
        "id",
        matches.map((m) => m.id)
      );
  }

  // Deleting the auth user cascades to profiles → preferences, match_consents,
  // messages, notifications (all ON DELETE CASCADE); reports are set null.
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    // Fall back to deleting the profile row even if auth deletion fails.
    await admin.from("profiles").delete().eq("id", user.id);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
