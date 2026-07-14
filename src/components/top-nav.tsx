import Link from "next/link";
import { SignOutButton } from "./sign-out-button";
import { Logo, Menu, Bell, Settings } from "./icons";

interface TopNavProps {
  signedIn: boolean;
  isAdmin?: boolean;
  unread?: number;
}

const links = [
  { href: "/dashboard", label: "Matches" },
  { href: "/preferences", label: "Preferences" },
  { href: "/profile", label: "Profile" },
];

export function TopNav({ signedIn, isAdmin, unread = 0 }: TopNavProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-sand-200 bg-sand-50/85 backdrop-blur [padding-top:env(safe-area-inset-top)]">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href={signedIn ? "/dashboard" : "/"} className="flex items-center gap-2.5 font-display font-semibold text-sand-900 transition hover:opacity-80">
          <Logo className="h-8 w-8" />
          <span className="hidden sm:inline">Mutual Transfer</span>
        </Link>

        {signedIn ? (
          <>
            {/* Tablet/desktop-width row (still touch-driven inside the app, so targets stay >=40px). */}
            <div className="hidden items-center gap-1 text-sm sm:flex">
              {links.map((l) => (
                <Link key={l.href} href={l.href} className="rounded-full px-3 py-2.5 text-sand-600 transition hover:bg-white hover:text-sand-900">
                  {l.label}
                </Link>
              ))}
              <Link href="/notifications" aria-label="Notifications" className="relative rounded-full p-2.5 text-sand-600 transition hover:bg-white hover:text-sand-900">
                <Bell className="h-[18px] w-[18px]" />
                {unread > 0 && (
                  <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
              {isAdmin && (
                <Link href="/admin" className="rounded-full px-3 py-2.5 font-medium text-brand-700 transition hover:bg-brand-50">
                  Admin
                </Link>
              )}
              <Link href="/settings" aria-label="Settings" className="rounded-full p-2.5 text-sand-600 transition hover:bg-white hover:text-sand-900">
                <Settings className="h-[18px] w-[18px]" />
              </Link>
              <SignOutButton className="btn-secondary ml-1 px-3 py-2" />
            </div>

            {/* Narrow-screen hamburger trigger (CSS-only toggle, no JS needed). */}
            <label
              htmlFor="nav-toggle"
              aria-label="Open menu"
              className="relative grid h-11 w-11 place-items-center rounded-full text-sand-600 transition hover:bg-white sm:hidden"
            >
              <Menu className="h-6 w-6" />
              {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-600" />}
            </label>
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <Link href="/how-it-works" className="rounded-full px-3 py-2.5 text-sand-600 transition hover:bg-white hover:text-sand-900">
              How it works
            </Link>
            <Link href="/sign-in" className="btn-primary px-4 py-2">
              Sign in
            </Link>
          </div>
        )}
      </nav>

      {signedIn && (
        <>
          <input type="checkbox" id="nav-toggle" className="peer hidden" />
          <div className="hidden flex-col gap-0.5 border-t border-sand-200 bg-sand-50 px-2 py-2 peer-checked:flex sm:hidden">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-xl px-3 py-3 text-sand-700 transition hover:bg-white">
                {l.label}
              </Link>
            ))}
            <Link href="/notifications" className="flex items-center gap-2.5 rounded-xl px-3 py-3 text-sand-700 transition hover:bg-white">
              <Bell className="h-[18px] w-[18px]" />
              Alerts
              {unread > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            {isAdmin && (
              <Link href="/admin" className="rounded-xl px-3 py-3 font-medium text-brand-700 transition hover:bg-brand-50">
                Admin
              </Link>
            )}
            <Link href="/settings" className="flex items-center gap-2.5 rounded-xl px-3 py-3 text-sand-700 transition hover:bg-white">
              <Settings className="h-[18px] w-[18px]" />
              Settings
            </Link>
            <SignOutButton className="btn-secondary mt-1 justify-center gap-2 py-3" />
          </div>
        </>
      )}
    </header>
  );
}
