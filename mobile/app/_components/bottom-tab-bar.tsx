"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Bell, Users } from "@/components/icons";

const TABS = [
  { href: "/dashboard", label: "Matches", icon: Home },
  { href: "/browse", label: "Browse", icon: Search },
  { href: "/notifications", label: "Alerts", icon: Bell },
  { href: "/profile", label: "Profile", icon: Users },
] as const;

/** Native-style bottom tab bar with a sliding highlight pill. Fixed to the
 *  bottom of the viewport, glass background, safe-area aware. */
export function BottomTabBar({ unread = 0 }: { unread?: number }) {
  const pathname = usePathname();
  const activeIndex = Math.max(0, TABS.findIndex((t) => pathname === t.href || pathname.startsWith(t.href + "/")));

  return (
    <div
      className="fixed inset-x-3 bottom-3 z-30 rounded-[22px] border p-1.5 backdrop-blur-xl [padding-bottom:calc(env(safe-area-inset-bottom)+0.375rem)]"
      style={{
        background: "rgba(20,26,24,0.65)",
        borderColor: "var(--ts-border)",
        boxShadow: "0 14px 34px rgba(0,0,0,0.4)",
      }}
    >
      <div className="relative flex">
        <div
          className="absolute inset-y-0 w-1/4 px-1.5 transition-transform duration-[350ms] ease-[cubic-bezier(.34,1.56,.64,1)]"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
        >
          <div className="h-full w-full rounded-2xl" style={{ background: "var(--ts-accent-soft)", border: "1px solid var(--ts-accent-border)" }} />
        </div>
        {TABS.map((tab, i) => {
          const Icon = tab.icon;
          const active = i === activeIndex;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="relative flex flex-1 flex-col items-center gap-1 py-2.5"
              style={{ color: active ? "var(--ts-accent)" : "rgba(255,255,255,0.5)" }}
            >
              <span className="relative">
                <Icon className="h-[19px] w-[19px]" />
                {tab.href === "/notifications" && unread > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-[color:var(--ts-accent)] text-[8px] font-bold text-[color:var(--ts-on-accent)]">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-semibold">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
