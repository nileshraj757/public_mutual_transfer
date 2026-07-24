import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { NotificationRow } from "@/lib/types";
import { NotificationItem } from "@/components/notification-item";
import { markAllRead } from "./actions";

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
  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-sand-900">Notifications</h1>
        {hasUnread && (
          <form action={markAllRead}>
            <button className="btn-secondary" type="submit">Mark all read</button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="card text-sm text-sand-500">No notifications yet. We&apos;ll alert you when a new match appears.</p>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li key={n.id}>
              <NotificationItem n={n} href={n.link} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
