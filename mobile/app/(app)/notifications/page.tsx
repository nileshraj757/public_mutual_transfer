"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { NotificationRow } from "@/lib/types";
import { matchHref } from "@/lib/native";
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

  // Load the alerts and, since opening this view counts as reading them, mark any
  // unread ones read in the background and refresh the nav badge. The list keeps
  // the original read/unread state for THIS view so the user can still see which
  // ones were new; they show as read on the next visit.
  const load = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(100);
    const rows = (data ?? []) as NotificationRow[];
    setNotifications(rows);

    if (rows.some((n) => !n.read)) {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("profile_id", profile.id)
        .eq("read", false);
      await refreshUnread();
    }
  }, [supabase, profile, refreshUnread]);

  useEffect(() => {
    load();
  }, [load]);

  if (!profile || notifications === null) return <Splash />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-sand-900">Notifications</h1>
      </div>

      {notifications.length === 0 ? (
        <p className="card text-sm text-sand-500">No notifications yet. We&apos;ll alert you when a new match appears.</p>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => {
            const inner = (
              <div className={`card flex items-start justify-between gap-3 ${n.read ? "" : "border-brand-300 bg-brand-50/40"}`}>
                <div>
                  <p className="font-medium text-sand-900">{n.title}</p>
                  {n.body && <p className="text-sm text-sand-600">{n.body}</p>}
                  <p className="mt-1 text-xs text-sand-400">{new Date(n.created_at).toLocaleString("en-IN")}</p>
                </div>
                {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
              </div>
            );
            const link = mobileLink(n.link);
            return <li key={n.id}>{link ? <Link href={link}>{inner}</Link> : inner}</li>;
          })}
        </ul>
      )}
    </div>
  );
}
