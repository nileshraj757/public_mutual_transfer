import { requireProfile } from "@/lib/auth";
import { MatchesInbox } from "@/components/matches-inbox";

export const metadata = { title: "Chats — Transfer Setu" };

/** "Chats" tab (web). The guard runs server-side; MatchesInbox is a client
 *  component that reads/sends over the cookie-bound browser client + API routes. */
export default async function InboxPage() {
  const profile = await requireProfile("/inbox");
  return <MatchesInbox userId={profile.id} />;
}
