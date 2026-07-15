"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "./sign-out-button";
import { Menu, XIcon, Bell, Settings } from "./icons";

interface MobileNavProps {
  links: { href: string; label: string }[];
  isAdmin?: boolean;
  unread?: number;
}

/**
 * Narrow-screen menu. Uses React state (not a CSS-only checkbox) so it can
 * auto-close after a selection: closing on pathname change covers navigations,
 * and the per-link onClick covers taps on the already-active route.
 */
export function MobileNav({ links, isAdmin, unread = 0 }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Any successful navigation changes the pathname → collapse the panel. This is
  // the primary close path for selections.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // For a tap on the already-active route (no pathname change), close too — but
  // DEFER it, so we never unmount the <Link> during its own click and cancel the
  // navigation for the other links.
  const close = () => setTimeout(() => setOpen(false), 0);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative grid h-11 w-11 place-items-center rounded-full text-sand-600 transition hover:bg-white"
      >
        {open ? <XIcon className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        {!open && unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-600" />}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full flex flex-col gap-0.5 border-t border-sand-200 bg-sand-50 px-2 py-2 shadow-warm-md">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={close} className="rounded-xl px-3 py-3 text-sand-700 transition hover:bg-white">
              {l.label}
            </Link>
          ))}
          <Link href="/notifications" onClick={close} className="flex items-center gap-2.5 rounded-xl px-3 py-3 text-sand-700 transition hover:bg-white">
            <Bell className="h-[18px] w-[18px]" />
            Alerts
            {unread > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
          {isAdmin && (
            <Link href="/admin" onClick={close} className="rounded-xl px-3 py-3 font-medium text-brand-700 transition hover:bg-brand-50">
              Admin
            </Link>
          )}
          <Link href="/settings" onClick={close} className="flex items-center gap-2.5 rounded-xl px-3 py-3 text-sand-700 transition hover:bg-white">
            <Settings className="h-[18px] w-[18px]" />
            Settings
          </Link>
          <SignOutButton className="btn-secondary mt-1 justify-center gap-2 py-3" />
        </div>
      )}
    </div>
  );
}
