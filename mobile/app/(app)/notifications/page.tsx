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
  const { supabase, profile, refreshUnread, realtimeVersion } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRow[] | null>(null);
  const [locked, setLocked] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    const [{ data }, isLocked] = await Promise.all([
      supabase.from("notifications").select("*").eq("profile_id", profile.id).order("created_at", { ascending: false }).limit(100),
      isPremiumLockedClient(supabase, profile.id),
    ]);
    setNotifications((data ?? []) as NotificationRow[]);
    setLocked(isLocked);
  }, [supabase, profile]);

  useEffect(() => {
    load();
  }, [load, realtimeVersion]);

  async function markAllRead() {
    if (!profile) return;
    setNotifications((cur) => cur?.map((n) => ({ ...n, read: true })) ?? cur);
    await supabase.from("notifications").update({ read: true }).eq("profile_id", profile.id).eq("read", false);
    await refreshUnread();
  }

  if (!profile || notifications === null) return <Splash />;

  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div>
      <div
        className="sticky top-0 z-10 -mx-5 mb-4 flex items-center justify-between border-b px-5 py-4 backdrop-blur-xl [padding-top:calc(env(safe-area-inset-top)+1rem)]"
        style={{ background: "var(--ts-sticky-bg)", borderColor: "var(--ts-border)" }}
      >
        <p className="font-display text-xl font-bold tracking-[-0.3px]" style={{ color: "var(--ts-text-strong)" }}>Notifications</p>
        {hasUnread && !locked && (
          <button type="button" className="ts-btn-secondary px-3 py-2 text-xs" onClick={markAllRead}>
            Mark all read
          </button>
        )}
      </div>

      {locked ? (
        <PremiumTeaser
          headline={`${notifications.length} alert${notifications.length === 1 ? "" : "s"}`}
          blurb="Subscribe to see match alerts, connection requests, and messages as they happen."
        >
          <div className="ts-card h-64" />
        </PremiumTeaser>
      ) : notifications.length === 0 ? (
        <p className="ts-card text-sm" style={{ color: "var(--ts-muted)" }}>No notifications yet. We&apos;ll alert you when a new match appears.</p>
      ) : (
        <ul className="space-y-2.5">
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
