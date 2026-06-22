import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recomputeForUser } from "@/lib/matching/recompute";
import { rateLimit } from "@/lib/rate-limit";

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const rl = rateLimit(`recompute:${user.id}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many refreshes. Try again shortly." }, { status: 429 });
  }

  try {
    const result = await recomputeForUser(user.id);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
