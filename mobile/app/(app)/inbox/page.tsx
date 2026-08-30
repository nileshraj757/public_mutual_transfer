"use client";

import { useEffect, useState } from "react";
import { MatchesInbox } from "@/components/matches-inbox";
import { isPremiumLockedClient } from "@/lib/billing-client";
import { PremiumTeaser } from "@/components/premium-teaser";
import { useAuth } from "../../providers";
import { Splash } from "../../_components/splash";

/** Dedicated "Chats" tab: all matches + their conversations in a master–detail
 *  layout. Profile is guaranteed by the (app) RequireProfile layout guard. */
export default function InboxPage() {
  const { supabase, profile } = useAuth();
  const [locked, setLocked] = useState<boolean | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!profile) return;
    let active = true;
    (async () => {
      const [isLocked, res] = await Promise.all([
        isPremiumLockedClient(supabase, profile.id),
        supabase.from("matches").select("id", { count: "exact", head: true }),
      ]);
      if (active) {
        setLocked(isLocked);
        setCount(res.count ?? 0);
      }
    })();
    return () => {
      active = false;
    };
  }, [supabase, profile]);

  if (!profile || locked === null) return <Splash />;

  if (locked) {
    return (
      <PremiumTeaser
        headline={`${count} conversation${count === 1 ? "" : "s"}`}
        blurb="Subscribe to chat with your matches and share contact details."
      >
        <div className="card h-64" />
      </PremiumTeaser>
    );
  }

  return <MatchesInbox userId={profile.id} />;
}
