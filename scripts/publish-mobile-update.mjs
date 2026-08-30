/**
 * Publishes a new OTA bundle for the native app's in-Settings updater
 * (src/components/app-update-button.tsx, @capgo/capacitor-updater).
 *
 *   npm run mobile:publish-update            (bumps patch: v1.0.0 → v1.0.1)
 *   npm run mobile:publish-update -- --minor  (v1.0.1 → v1.1.0)
 *   npm run mobile:publish-update -- --major  (v1.1.0 → v2.0.0)
 *
 * Builds the standalone mobile/ app, zips the static export, and uploads it to
 * the public Supabase Storage bucket "app-updates" — the same free-tier project
 * already used for auth/db, so no extra hosting is needed. The next version
 * number is derived by reading the currently-published bundles/latest.json and
 * bumping it, so there's no local version file to keep in sync.
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your env
 * (loaded from .env.local automatically below, same as scripts/seed.mjs).
 *
 * Devices already running a build with the updater plugin pick this up the
 * next time someone taps "Check for updates" in Settings — no APK rebuild, no
 * reinstall, no store review.
 */

import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import os from "node:os";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const BUCKET = "app-updates";

const bump = process.argv.includes("--major") ? "major" : process.argv.includes("--minor") ? "minor" : "patch";

function nextVersion(previous, kind) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(previous ?? "");
  if (!m) return "v1.0.0";
  const majorN = Number(m[1]);
  const minorN = Number(m[2]);
  const patchN = Number(m[3]);
  if (kind === "major") return `v${majorN + 1}.0.0`;
  if (kind === "minor") return `v${majorN}.${minorN + 1}.0`;
  return `v${majorN}.${minorN}.${patchN + 1}`;
}

async function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      const txt = await readFile(path.join(root, file), "utf8");
      for (const line of txt.split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && !process.env[m[1]]) {
          process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
        }
      }
    } catch {
      /* file optional */
    }
  }
}

await loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    "✗ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "  Copy .env.example → .env.local and fill them in first."
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const manifestUrl = `${url}/storage/v1/object/public/${BUCKET}/bundles/latest.json`;
let previousVersion = null;
try {
  const res = await fetch(manifestUrl, { cache: "no-store" });
  if (res.ok) previousVersion = (await res.json())?.version ?? null;
} catch {
  /* first-ever publish, or offline — falls back to v1.0.0 */
}
const version = nextVersion(previousVersion, bump);
console.log(previousVersion ? `→ ${previousVersion} → ${version} (${bump})` : `→ First publish: ${version}`);

console.log("→ Building mobile/out (npm run mobile:build)…");
execFileSync("npm", ["run", "mobile:build"], { cwd: root, stdio: "inherit" });

const outDir = path.join(root, "mobile", "out");
if (!existsSync(outDir)) {
  console.error(`✗ ${outDir} wasn't produced by the build.`);
  process.exit(1);
}

const zipPath = path.join(os.tmpdir(), `mobile-update-${Date.now()}.zip`);
console.log("→ Zipping mobile/out…");
try {
  execFileSync("zip", ["-r", "-X", "-q", zipPath, "."], { cwd: outDir });
} catch (e) {
  console.error(
    "✗ Couldn't run `zip`. Install it (e.g. `brew install zip` / `apt install zip`) and retry.\n" + e.message
  );
  process.exit(1);
}

const zipData = await readFile(zipPath);
console.log(`→ ${version} (${(zipData.length / 1024 / 1024).toFixed(2)} MB)`);

// Idempotent: fine if the bucket already exists.
const { error: bucketError } = await admin.storage.createBucket(BUCKET, { public: true });
if (bucketError && !/already exists/i.test(bucketError.message)) {
  console.error(`✗ Couldn't create/verify bucket "${BUCKET}": ${bucketError.message}`);
  process.exit(1);
}

console.log("→ Uploading bundle…");
const zipKey = `bundles/${version}.zip`;
const { error: zipUploadError } = await admin.storage.from(BUCKET).upload(zipKey, zipData, {
  contentType: "application/zip",
  cacheControl: "31536000",
  upsert: true,
});
if (zipUploadError) {
  console.error(`✗ Bundle upload failed: ${zipUploadError.message}`);
  process.exit(1);
}

const {
  data: { publicUrl: bundleUrl },
} = admin.storage.from(BUCKET).getPublicUrl(zipKey);

console.log("→ Publishing latest.json…");
const manifest = JSON.stringify({ version, url: bundleUrl, publishedAt: new Date().toISOString() });
const { error: manifestUploadError } = await admin.storage.from(BUCKET).upload("bundles/latest.json", manifest, {
  contentType: "application/json",
  cacheControl: "0",
  upsert: true,
});
if (manifestUploadError) {
  console.error(`✗ Manifest upload failed: ${manifestUploadError.message}`);
  process.exit(1);
}

await rm(zipPath, { force: true });

console.log(`✓ Published ${version}\n  ${bundleUrl}`);
