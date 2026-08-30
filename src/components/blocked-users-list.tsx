"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface BlockedRow {
  blocked_id: string;
  cadre: string | null;
  current_state: string | null;
  current_district: string | null;
}

/** Settings → Privacy. Reads the caller's own block list via the
 *  get_blocked_profile_views() RPC (a plain join would be blocked by
 *  profiles RLS, which only allows reading your own row). */
export function BlockedUsersList({ profileId }: { profileId: string }) {
  const [rows, setRows] = useState<BlockedRow[] | null>(null);

  async function load() {
    const { data } = await createClient().rpc("get_blocked_profile_views");
    setRows((data ?? []) as BlockedRow[]);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  async function unblock(blockedId: string) {
    setRows((r) => r?.filter((row) => row.blocked_id !== blockedId) ?? null);
    await createClient().from("blocked_profiles").delete().eq("blocker_id", profileId).eq("blocked_id", blockedId);
  }

  if (rows === null) return <p className="text-sm text-sand-500">Loading…</p>;
  if (rows.length === 0) return <p className="text-sm text-sand-500">You haven&apos;t blocked anyone.</p>;

  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li
          key={r.blocked_id}
          className="flex items-center justify-between gap-3 rounded-lg border border-sand-200 px-3 py-2 text-sm"
        >
          <span className="text-sand-700">
            {[r.current_district, r.current_state].filter(Boolean).join(", ") || "Unknown"}
            {r.cadre ? ` · ${r.cadre}` : ""}
          </span>
          <button type="button" className="btn-secondary px-3 py-1 text-xs" onClick={() => unblock(r.blocked_id)}>
            Unblock
          </button>
        </li>
      ))}
    </ul>
  );
}
