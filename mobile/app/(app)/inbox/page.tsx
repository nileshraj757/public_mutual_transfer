"use client";

import { MatchesInbox } from "@/components/matches-inbox";
import { useAuth } from "../../providers";
import { Splash } from "../../_components/splash";

/** Dedicated "Chats" tab: all matches + their conversations in a master–detail
 *  layout. Profile is guaranteed by the (app) RequireProfile layout guard. */
export default function InboxPage() {
  const { profile } = useAuth();
  if (!profile) return <Splash />;
  return <MatchesInbox userId={profile.id} />;
}
