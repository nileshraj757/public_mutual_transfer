import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isPremiumLocked } from "@/lib/billing";
import { MatchesInbox } from "@/components/matches-inbox";
import { PremiumTeaser } from "@/components/premium-teaser";

export const metadata = { title: "Chats — TransferSetu" };

/** "Chats" tab (web). The guard runs server-side; MatchesInbox is a client
 *  component that reads/sends over the cookie-bound browser client + API routes. */
export default async function InboxPage() {
  const profile = await requireProfile("/inbox");
  const supabase = createClient();
  const [locked, { count }] = await Promise.all([
    isPremiumLocked(profile.id),
    supabase.from("matches").select("id", { count: "exact", head: true }),
  ]);

  if (locked) {
    return (
      <PremiumTeaser
        headline={`${count ?? 0} conversation${count === 1 ? "" : "s"}`}
        blurb="Subscribe to chat with your matches and share contact details."
      >
        <div className="card h-64" />
      </PremiumTeaser>
    );
  }

  return <MatchesInbox userId={profile.id} />;
}
