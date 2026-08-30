"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isNativeApp } from "@/lib/native";
import { callFn } from "@/lib/functions";
import type { NotificationRow } from "@/lib/types";
import { Shield, Chat, Sparkle } from "@/components/icons";

function kindIcon(kind: string) {
  if (kind.includes("verif")) return Shield;
  if (kind.includes("chat") || kind.includes("message")) return Chat;
  return Sparkle;
}

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

  // Incoming connection requests need inline Accept/Decline instead of a plain
  // open-and-mark-read link, so they get their own layout (no nested buttons).
  if (n.kind === "match_request" && n.related_id) {
    return <MatchRequestItem n={n} read={read} markRead={markRead} />;
  }

  const Icon = kindIcon(n.kind);
  const inner = (
    <div
      className="ts-card animate-ts-card-in flex items-start gap-3"
      style={{ background: read ? "var(--ts-surface-soft)" : "var(--ts-accent-soft)", borderColor: "var(--ts-border)" }}
    >
      <div className="grid h-9 w-9 flex-none place-items-center rounded-xl" style={{ background: "var(--ts-surface)", color: "var(--ts-accent-strong)" }}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-snug" style={{ color: "var(--ts-text-strong)" }}>{n.title}</p>
        {n.body && <p className="text-sm" style={{ color: "var(--ts-muted)" }}>{n.body}</p>}
        <p className="mt-1 text-[11px]" style={{ color: "var(--ts-faint)" }}>{new Date(n.created_at).toLocaleString("en-IN")}</p>
      </div>
      {!read && <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full" style={{ background: "var(--ts-accent)" }} aria-label="Unread" />}
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

function MatchRequestItem({
  n,
  read,
  markRead,
}: {
  n: NotificationRow;
  read: boolean;
  markRead: () => void;
}) {
  const router = useRouter();
  const [responded, setResponded] = useState<"accepted" | "declined" | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function respond(accept: boolean) {
    setPending(true);
    setError("");
    try {
      if (isNativeApp()) {
        await callFn(createClient(), "match-request-respond", { request_id: n.related_id, accept });
      } else {
        const res = await fetch(`/api/matches/request/${n.related_id}/respond`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accept }),
        });
        if (!res.ok) {
          throw new Error((await res.json().catch(() => ({})))?.error ?? "Couldn't respond.");
        }
      }
      setResponded(accept ? "accepted" : "declined");
      markRead();
      router.refresh();
    } catch (e) {
      setError((e as Error).message || "Couldn't respond.");
    } finally {
      setPending(false);
    }
  }

  const Icon = kindIcon(n.kind);
  return (
    <div
      className="ts-card animate-ts-card-in flex items-start gap-3"
      style={{ background: read ? "var(--ts-surface-soft)" : "var(--ts-accent-soft)", borderColor: "var(--ts-border)" }}
    >
      <div className="grid h-9 w-9 flex-none place-items-center rounded-xl" style={{ background: "var(--ts-surface)", color: "var(--ts-accent-strong)" }}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-snug" style={{ color: "var(--ts-text-strong)" }}>{n.title}</p>
        {n.body && <p className="text-sm" style={{ color: "var(--ts-muted)" }}>{n.body}</p>}
        <p className="mt-1 text-[11px]" style={{ color: "var(--ts-faint)" }}>{new Date(n.created_at).toLocaleString("en-IN")}</p>

        {responded ? (
          <p className="mt-2 text-sm font-semibold" style={{ color: "var(--ts-muted)" }}>
            {responded === "accepted" ? "You accepted this request." : "You declined this request."}
          </p>
        ) : (
          <div className="mt-2 flex gap-2">
            <button type="button" className="ts-btn-primary px-4 py-2 text-xs" onClick={() => respond(true)} disabled={pending}>
              {pending ? "Saving…" : "Accept"}
            </button>
            <button type="button" className="ts-btn-secondary px-4 py-2 text-xs" onClick={() => respond(false)} disabled={pending}>
              Decline
            </button>
          </div>
        )}
        {error && <p className="mt-2 text-sm" style={{ color: "var(--ts-danger)" }}>{error}</p>}
      </div>
      {!read && <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full" style={{ background: "var(--ts-accent)" }} aria-label="Unread" />}
    </div>
  );
}
