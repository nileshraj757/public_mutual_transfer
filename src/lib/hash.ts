import { createHash } from "node:crypto";

/** SHA-256 hash of a normalized employee id (server-only; never store raw). */
export function hashEmployeeId(raw: string): string {
  return createHash("sha256").update(raw.trim().toLowerCase()).digest("hex");
}

/** Human-readable mask shown to the owner/admin only, e.g. "JA••••27". */
export function maskEmployeeId(raw: string): string {
  const v = raw.trim();
  if (v.length <= 3) return "•".repeat(v.length);
  return v.slice(0, 2) + "••••" + v.slice(-2);
}
