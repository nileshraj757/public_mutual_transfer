"use client";

import { usePathname } from "next/navigation";
import { RequireProfile } from "../_components/guards";
import { BottomTabBar } from "../_components/bottom-tab-bar";
import { useAuth } from "../providers";

const TAB_ROUTES = ["/dashboard", "/browse", "/notifications", "/profile"];

/** Authenticated app shell: guard + content + the bottom tab bar (shown only
 *  on the four tab-root screens; every other screen renders its own
 *  <ScreenHeader> with a back chevron instead). */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireProfile>
      <Shell>{children}</Shell>
    </RequireProfile>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { unreadCount } = useAuth();
  const isTab = TAB_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));

  return (
    <div className="relative z-[1] min-h-screen">
      <main className={`mx-auto max-w-5xl px-5 ${isTab ? "pb-28" : "pb-10"}`}>{children}</main>
      {isTab && <BottomTabBar unread={unreadCount} />}
    </div>
  );
}
