"use client";

import { RequireAdmin } from "../../_components/guards";

/** Admin shell: just the guard. Each admin screen (hub, verification, rules,
 *  reports, analytics) renders its own <ScreenHeader> — there's no persistent
 *  admin-only nav chrome in the glass redesign, matching the brief's 2×2 hub
 *  + individual back-navigable screens. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RequireAdmin>{children}</RequireAdmin>;
}
