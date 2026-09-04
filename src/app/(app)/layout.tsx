import { TopNav } from "@/components/top-nav";
import { Disclaimer } from "@/components/disclaimer";
import { RealtimeAppRefresh } from "@/components/realtime-app-refresh";
import { getProfile, requireUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const profile = await getProfile();
  const isAdmin = Boolean(profile?.is_admin) || isAdminEmail(user.email);

  let unread = 0;
  if (profile) {
    const supabase = createClient();
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("read", false);
    unread = count ?? 0;
  }

  return (
    <div className="min-h-screen">
      <RealtimeAppRefresh />
      <TopNav signedIn isAdmin={isAdmin} unread={unread} />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Disclaimer className="mb-5" />
        {children}
      </main>
    </div>
  );
}
