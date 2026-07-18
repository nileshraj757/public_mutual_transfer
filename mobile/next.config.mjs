import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// This app's project root is mobile/, so Next won't pick up the repo-root
// .env.local automatically. Load NEXT_PUBLIC_* from ../.env.local (then ../.env)
// so real Supabase/Razorpay values are inlined into the static bundle at build.
const here = dirname(fileURLToPath(import.meta.url));
for (const file of [".env.local", ".env"]) {
  try {
    const text = readFileSync(join(here, "..", file), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*(NEXT_PUBLIC_[A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* file may not exist — placeholders in the client keep the build working */
  }
}

/** @type {import('next').NextConfig} */

/**
 * Mobile (Capacitor) build. This is a SEPARATE Next.js app from the web app in
 * ../src/app. It contains ONLY client-rendered routes and is statically exported
 * to ./out, which Capacitor bundles inside the APK/IPA.
 *
 * Because it is its own build graph, the web app's middleware.ts, src/app/api/**
 * route handlers and auth/callback route are NEVER compiled here — that's what
 * makes `output: 'export'` succeed. See mobile/.eslintrc.json for the guardrail
 * that keeps server-only modules from leaking in.
 */
const nextConfig = {
  reactStrictMode: true,
  // Produce a fully static site in ./out for Capacitor's webDir.
  output: "export",
  distDir: "out",
  // Static export can't run the Next image optimizer.
  images: { unoptimized: true },
  // Emit /route/index.html so Capacitor's WebView resolves clean paths offline.
  trailingSlash: true,
  // We import shared components/libs from ../src (outside this app's root).
  experimental: { externalDir: true },
};

export default nextConfig;
