import { TopNav } from "@/components/top-nav";
import { Disclaimer } from "@/components/disclaimer";
import { getProfile, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  const profile = await getProfile();

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
      <TopNav signedIn isAdmin={profile?.is_admin} unread={unread} />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Disclaimer className="mb-5" />
        {children}
      </main>
    </div>
  );
}
