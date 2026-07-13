import { NextResponse } from "next/server";

// Never statically cache: the whole point is a fresh read on every request.
export const dynamic = "force-dynamic";

/**
 * Identifies the currently-deployed build so the client can detect a newer
 * deployment while the app is already open (see update-checker.tsx) and offer
 * a reload — without needing a fresh native app install.
 */
export async function GET() {
  const id = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.VERCEL_DEPLOYMENT_ID ?? "dev";
  return NextResponse.json({ id });
}
