"use client";

import { useEffect, useState } from "react";
import { TopNav } from "@/components/top-nav";
import { Disclaimer } from "@/components/disclaimer";
import { isAdminEmail } from "@/lib/env";
import { useAuth } from "../providers";
import { RequireProfile } from "../_components/guards";

/** Authenticated app shell: guard + top navigation + page content. Mirrors the
 *  web app's src/app/(app)/layout.tsx, but client-rendered. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireProfile>
      <Shell>{children}</Shell>
    </RequireProfile>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { supabase, profile, session } = useAuth();
  const [unread, setUnread] = useState(0);
  const isAdmin = Boolean(profile?.is_admin) || isAdminEmail(session?.user.email);

  useEffect(() => {
    let active = true;
    (async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("read", false);
      if (active) setUnread(count ?? 0);
    })();
    return () => {
      active = false;
    };
  }, [supabase]);

  return (
    <div className="min-h-screen">
      <TopNav signedIn isAdmin={isAdmin} unread={unread} />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Disclaimer className="mb-5" />
        {children}
      </main>
    </div>
  );
}
