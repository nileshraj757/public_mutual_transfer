"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAdminEmail } from "@/lib/env";
import { useAuth } from "../providers";
import { Splash } from "./splash";

/**
 * Require a signed-in user WITH a completed profile. Replaces the web app's
 * middleware guard + requireProfile(): redirects to /sign-in when logged out and
 * to /onboarding when the profile hasn't been created yet.
 */
export function RequireProfile({ children }: { children: React.ReactNode }) {
  const { loading, session, profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session) router.replace("/sign-in");
    else if (!profile) router.replace("/onboarding");
  }, [loading, session, profile, router]);

  if (loading) return <Splash />;
  if (!session || !profile) return <Splash label="Redirecting…" />;
  return <>{children}</>;
}

/**
 * Require an admin — either the profiles.is_admin flag or an allowlisted sign-in
 * email. Mirrors the web app's requireAdmin(). Sends non-admins to /dashboard.
 */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { loading, session, profile } = useAuth();
  const router = useRouter();
  const isAdmin = Boolean(profile?.is_admin) || isAdminEmail(session?.user.email);

  useEffect(() => {
    if (loading) return;
    if (!session) router.replace("/sign-in");
    else if (!profile) router.replace("/onboarding");
    else if (!isAdmin) router.replace("/dashboard");
  }, [loading, session, profile, isAdmin, router]);

  if (loading) return <Splash />;
  if (!session || !profile || !isAdmin) return <Splash label="Redirecting…" />;
  return <>{children}</>;
}

/**
 * Require a signed-in user (profile optional) — used by /onboarding, where the
 * profile is being created.
 */
export function RequireSession({ children }: { children: React.ReactNode }) {
  const { loading, session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session) router.replace("/sign-in");
  }, [loading, session, router]);

  if (loading) return <Splash />;
  if (!session) return <Splash label="Redirecting…" />;
  return <>{children}</>;
}
