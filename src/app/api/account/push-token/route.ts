import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Store a native push device token for the signed-in user (idempotent). */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { token, platform } = (await request.json().catch(() => ({}))) as {
    token?: string;
    platform?: string;
  };
  if (!token) return NextResponse.json({ error: "Missing token." }, { status: 400 });

  const { error } = await supabase
    .from("device_tokens")
    .upsert(
      { profile_id: user.id, token, platform: platform ?? null },
      { onConflict: "profile_id,token" }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
