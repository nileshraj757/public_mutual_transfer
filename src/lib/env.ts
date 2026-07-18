// Centralized env access with friendly errors. Public vars are inlined by Next.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Whether Supabase is configured. The app renders informative placeholders
 *  instead of crashing when it isn't (so it boots before you add keys). */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** Server-only — do not import into client components. */
export function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return key;
}

export function officialEmailDomains(): string[] {
  return (process.env.OFFICIAL_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

/** Built-in super admin — always has admin access regardless of the DB flag. */
export const SUPER_ADMIN_EMAIL = "nileshraj757@gmail.com";

/** Emails that unconditionally get admin access. The built-in super admin plus
 *  any comma-separated addresses in ADMIN_EMAILS. */
export function adminEmails(): string[] {
  const configured = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set([SUPER_ADMIN_EMAIL, ...configured]));
}

/** True when the given sign-in email is on the admin allowlist. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}
