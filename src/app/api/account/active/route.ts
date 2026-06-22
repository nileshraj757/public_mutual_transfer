import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recomputeForUser } from "@/lib/matching/recompute";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { is_active } = (await request.json().catch(() => ({}))) as { is_active?: boolean };
  if (typeof is_active !== "boolean") return NextResponse.json({ error: "Missing is_active." }, { status: 400 });

  const { error } = await supabase.from("profiles").update({ is_active }).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Re-running keeps cached matches consistent with the new visibility.
  try {
    await recomputeForUser(user.id);
  } catch {
    /* best-effort */
  }

  return NextResponse.json({ ok: true });
}
