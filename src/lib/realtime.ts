import type { RealtimePostgresChangesPayload, SupabaseClient } from "@supabase/supabase-js";

export interface TableWatch {
  table: string;
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  /** Postgres-changes filter, e.g. `match_id=eq.<id>` — narrows volume, not a
   *  security boundary (RLS already scopes which rows the caller can see). */
  filter?: string;
}

/**
 * Subscribe to Postgres changes on one or more tables and invoke `onChange`
 * for every event. RLS on each table (matches/notifications/messages/
 * match_requests are all already scoped to the caller) determines which rows
 * are actually delivered, so no per-user filter is required here.
 *
 * Returns an unsubscribe function — call it from a `useEffect` cleanup.
 */
export function watchTables(
  supabase: SupabaseClient,
  watches: TableWatch[],
  onChange: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
): () => void {
  const channel = supabase.channel(`rt:${watches.map((w) => w.table).join(",")}:${Math.random().toString(36).slice(2)}`);
  for (const w of watches) {
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: w.table, ...(w.filter ? { filter: w.filter } : {}) },
      (payload) => {
        if (!w.event || w.event === "*" || payload.eventType === w.event) onChange(payload);
      }
    );
  }
  channel.subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
