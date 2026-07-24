"use client";

import { TopNav } from "@/components/top-nav";
import { Disclaimer } from "@/components/disclaimer";
import { isAdminEmail } from "@/lib/env";
import { useAuth } from "../providers";
import { RequireProfile } from "../_components/guards";
import { BackBar } from "../_components/back-bar";

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
  const { profile, session, unreadCount } = useAuth();
  const isAdmin = Boolean(profile?.is_admin) || isAdminEmail(session?.user.email);

  return (
    <div className="min-h-screen">
      <TopNav signedIn isAdmin={isAdmin} unread={unreadCount} />
      <BackBar />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Disclaimer className="mb-5" />
        {children}
      </main>
    </div>
  );
}
