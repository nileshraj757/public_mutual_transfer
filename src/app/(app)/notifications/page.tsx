import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { NotificationRow } from "@/lib/types";
import { markAllRead } from "./actions";

export const metadata = { title: "Notifications — Mutual Transfer" };

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
        <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
        {hasUnread && (
          <form action={markAllRead}>
            <button className="btn-secondary" type="submit">Mark all read</button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="card text-sm text-slate-500">No notifications yet. We&apos;ll alert you when a new match appears.</p>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => {
            const inner = (
              <div className={`card flex items-start justify-between gap-3 ${n.read ? "" : "border-brand-300 bg-brand-50/40"}`}>
                <div>
                  <p className="font-medium text-slate-900">{n.title}</p>
                  {n.body && <p className="text-sm text-slate-600">{n.body}</p>}
                  <p className="mt-1 text-xs text-slate-400">{new Date(n.created_at).toLocaleString("en-IN")}</p>
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
