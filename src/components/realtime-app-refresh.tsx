"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { watchTables } from "@/lib/realtime";

/**
 * Mounted once in the (app) layout. `router.refresh()` re-runs every Server
 * Component in the current route tree, so this alone keeps the unread badge,
 * notifications feed, dashboard and match-detail pages live without the user
 * having to reload whenever they get a new alert, match, connection request,
 * or message. Debounced so a burst of changes only triggers one refresh.
 */
export function RealtimeAppRefresh() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    const refresh = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 400);
    };
    const unsubscribe = watchTables(
      supabase,
      [{ table: "notifications" }, { table: "matches" }, { table: "match_requests" }, { table: "messages" }],
      refresh
    );
    return () => {
      clearTimeout(timer.current);
      unsubscribe();
    };
  }, [router]);

  return null;
}
