import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Best-effort client-error sink: the native shell has no accessible browser
 * console, so this is the only way to see what a real device actually threw.
 * Logged to stdout, which Vercel's Runtime Logs capture and make searchable —
 * same place we've been diagnosing server-side exceptions all along.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.error("[client-error]", JSON.stringify({
      message: body?.message,
      stack: body?.stack,
      digest: body?.digest,
      url: body?.url,
      userAgent: request.headers.get("user-agent"),
    }));
  } catch {
    /* best-effort logging only */
  }
  return NextResponse.json({ ok: true });
}
