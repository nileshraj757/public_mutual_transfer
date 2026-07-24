import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { NotificationRow } from "@/lib/types";

export const metadata = { title: "Notifications — Transfer Setu" };

export default async function NotificationsPage() {
  const profile = await requireProfile("/notifications");
  const supabase = createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const notifications = (data ?? []) as NotificationRow[];

  // Opening this view counts as reading the alerts: mark any unread ones read so
  // the nav badge clears on the next navigation. The list still reflects the
  // pre-update state, so the user can see which ones were new this visit.
  if (notifications.some((n) => !n.read)) {
    await supabase.from("notifications").update({ read: true }).eq("profile_id", profile.id).eq("read", false);
  }

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
            return (
              <li key={n.id}>{n.link ? <Link href={n.link}>{inner}</Link> : inner}</li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
