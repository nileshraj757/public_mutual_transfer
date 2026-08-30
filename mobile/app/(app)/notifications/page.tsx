"use client";

import { useCallback, useEffect, useState } from "react";
import type { NotificationRow } from "@/lib/types";
import { matchHref } from "@/lib/native";
import { isPremiumLockedClient } from "@/lib/billing-client";
import { NotificationItem } from "@/components/notification-item";
import { PremiumTeaser } from "@/components/premium-teaser";
import { useAuth } from "../../providers";
import { Splash } from "../../_components/splash";

/** Rewrite stored links (/matches/<id>) to the mobile query-param route. */
function mobileLink(link: string | null): string | null {
  if (!link) return null;
  const m = link.match(/^\/matches\/([^/?#]+)/);
  return m ? matchHref(m[1]) : link;
}

export default function NotificationsPage() {
  const { supabase, profile, refreshUnread } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRow[] | null>(null);
  const [locked, setLocked] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    const [{ data }, isLocked] = await Promise.all([
      supabase
        .from("notifications")
        .select("*")
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(100),
      isPremiumLockedClient(supabase, profile.id),
    ]);
    setNotifications((data ?? []) as NotificationRow[]);
    setLocked(isLocked);
  }, [supabase, profile]);

  useEffect(() => {
    load();
  }, [load]);

  async function markAllRead() {
    if (!profile) return;
    setNotifications((cur) => cur?.map((n) => ({ ...n, read: true })) ?? cur);
    await supabase.from("notifications").update({ read: true }).eq("profile_id", profile.id).eq("read", false);
    await refreshUnread();
  }

  if (!profile || notifications === null) return <Splash />;

  const hasUnread = notifications.some((n) => !n.read);

  if (locked) {
    return (
      <PremiumTeaser
        headline={`${notifications.length} alert${notifications.length === 1 ? "" : "s"}`}
        blurb="Subscribe to see match alerts, connection requests, and messages as they happen."
      >
        <div className="card h-64" />
      </PremiumTeaser>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-sand-900">Notifications</h1>
        {hasUnread && (
          <button className="btn-secondary" type="button" onClick={markAllRead}>
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="card text-sm text-sand-500">No notifications yet. We&apos;ll alert you when a new match appears.</p>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li key={n.id}>
              <NotificationItem n={n} href={mobileLink(n.link)} onRead={refreshUnread} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
