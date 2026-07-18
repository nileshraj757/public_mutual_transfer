import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/env";
import type { Profile } from "@/lib/types";

export interface SessionUser {
  id: string;
  email: string | null;
}

/** Returns the signed-in auth user (or null). Server-only. */
export async function getUser(): Promise<SessionUser | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? null };
}

/** Returns the signed-in user's profile row, or null if none exists yet. */
export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return (data as Profile) ?? null;
}

/** Require a signed-in user; redirect to sign-in otherwise. */
export async function requireUser(next = "/dashboard"): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return user;
}

/**
 * Require a completed profile. Redirects to sign-in if logged out, or to
 * onboarding if the profile hasn't been created yet.
 */
export async function requireProfile(next = "/dashboard"): Promise<Profile> {
  const user = await getUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  const profile = await getProfile();
  if (!profile) redirect("/onboarding");
  return profile;
}

/**
 * Whether the signed-in user has admin access — either the DB `is_admin` flag
 * or an allowlisted sign-in email (see {@link isAdminEmail}).
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getUser();
  if (!user) return false;
  if (isAdminEmail(user.email)) return true;
  const profile = await getProfile();
  return Boolean(profile?.is_admin);
}

/** Require an admin; redirect to sign-in/onboarding/dashboard otherwise. */
export async function requireAdmin(): Promise<Profile> {
  const user = await getUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent("/admin")}`);
  const profile = await getProfile();
  if (!profile) redirect("/onboarding");
  if (!profile.is_admin && !isAdminEmail(user.email)) redirect("/dashboard");
  return profile;
}
