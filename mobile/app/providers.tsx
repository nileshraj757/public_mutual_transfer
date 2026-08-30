"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { ToastProvider } from "./_components/toast";

interface AuthValue {
  /** True until the first session + profile resolution completes. */
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  supabase: SupabaseClient;
  /** Re-fetch the current user's profile row (after edits/onboarding). */
  refreshProfile: () => Promise<void>;
  /** Unread notification count for the nav badge. */
  unreadCount: number;
  /** Re-count unread notifications (after opening/marking the alerts read). */
  refreshUnread: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/**
 * Client-side auth for the standalone app. Replaces the web app's server-side
 * session (middleware + requireUser/requireProfile). The session lives in
 * localStorage (see src/lib/supabase/client.ts native branch).
 *
 * Shared components each call createClient() (their own instance) but all read
 * the same `mt-auth` storage key, so to stay in sync regardless of which
 * instance mutated auth, we re-read the session on every navigation, plus listen
 * to this instance's auth events.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadProfile = useCallback(
    async (userId: string | undefined) => {
      if (!userId) {
        setProfile(null);
        return;
      }
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      setProfile((data as Profile) ?? null);
    },
    [supabase]
  );

  const refreshUnread = useCallback(async () => {
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("read", false);
    setUnreadCount(count ?? 0);
  }, [supabase]);

  // Keep the unread badge in sync with the session (login/logout) and refresh it
  // whenever the alerts view marks things read (via refreshUnread from context).
  useEffect(() => {
    if (session) refreshUnread();
    else setUnreadCount(0);
  }, [session, refreshUnread]);

  // Resolve the session on mount, on every navigation, and on auth events.
  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { session: s },
      } = await supabase.auth.getSession();
      if (!active) return;
      setSession(s);
      await loadProfile(s?.user.id);
      setLoading(false);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      loadProfile(s?.user.id);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
    // Re-run on navigation so auth mutations made by other client instances
    // (sign-in form, callback page, sign-out button) are picked up.
  }, [supabase, loadProfile, pathname]);

  const value: AuthValue = {
    loading,
    session,
    profile,
    supabase,
    refreshProfile: () => loadProfile(session?.user.id),
    unreadCount,
    refreshUnread,
    signOut: async () => {
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
    },
  };

  return (
    <AuthContext.Provider value={value}>
      <ToastProvider>{children}</ToastProvider>
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AppProviders>");
  return ctx;
}
