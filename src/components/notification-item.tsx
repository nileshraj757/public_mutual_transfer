"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { NotificationRow } from "@/lib/types";

/**
 * A single alert. Opening it (tapping the card / following its link) marks THAT
 * alert read — so read and unread notifications stay visually distinct in the
 * list, rather than everything clearing at once when the tab is opened.
 *
 * Marks read via the RLS-scoped browser client (owner-only update). `onRead`
 * lets the mobile app refresh its context-held nav badge; `router.refresh()`
 * recomputes the web layout's badge (a no-op under the mobile static export).
 */
export function NotificationItem({
  n,
  href,
  onRead,
}: {
  n: NotificationRow;
  href: string | null;
  onRead?: () => void;
}) {
  const router = useRouter();
  const [read, setRead] = useState(n.read);

  async function markRead() {
    if (read) return;
    setRead(true);
    const supabase = createClient();
    await supabase.from("notifications").update({ read: true }).eq("id", n.id).eq("read", false);
    onRead?.();
    router.refresh();
  }

  const inner = (
    <div className={`card flex items-start justify-between gap-3 ${read ? "" : "border-brand-300 bg-brand-50/40"}`}>
      <div>
        <p className="font-medium text-sand-900">{n.title}</p>
        {n.body && <p className="text-sm text-sand-600">{n.body}</p>}
        <p className="mt-1 text-xs text-sand-400">{new Date(n.created_at).toLocaleString("en-IN")}</p>
      </div>
      {!read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />}
    </div>
  );

  if (href) {
    return (
      <Link href={href} onClick={markRead} className="block">
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={markRead} className="block w-full text-left">
      {inner}
    </button>
  );
}
