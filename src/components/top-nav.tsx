import Link from "next/link";
import { SignOutButton } from "./sign-out-button";

interface TopNavProps {
  signedIn: boolean;
  isAdmin?: boolean;
  unread?: number;
}

const links = [
  { href: "/dashboard", label: "Matches" },
  { href: "/browse", label: "Browse" },
  { href: "/preferences", label: "Preferences" },
  { href: "/profile", label: "Profile" },
];

export function TopNav({ signedIn, isAdmin, unread = 0 }: TopNavProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur [padding-top:env(safe-area-inset-top)]">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href={signedIn ? "/dashboard" : "/"} className="flex items-center gap-2 font-semibold text-brand-700">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-600 text-sm text-white">MT</span>
          <span className="hidden sm:inline">Mutual Transfer</span>
        </Link>

        {signedIn ? (
          <>
            {/* Tablet/desktop-width row (still touch-driven inside the app, so targets stay >=40px). */}
            <div className="hidden items-center gap-1 text-sm sm:flex">
              {links.map((l) => (
                <Link key={l.href} href={l.href} className="rounded-md px-2.5 py-2.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                  {l.label}
                </Link>
              ))}
              <Link href="/notifications" className="relative rounded-md px-2.5 py-2.5 text-slate-600 hover:bg-slate-100">
                Alerts
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
              {isAdmin && (
                <Link href="/admin" className="rounded-md px-2.5 py-2.5 font-medium text-brand-700 hover:bg-brand-50">
                  Admin
                </Link>
              )}
              <Link href="/settings" className="rounded-md px-2.5 py-2.5 text-slate-600 hover:bg-slate-100">
                Settings
              </Link>
              <SignOutButton className="btn-secondary ml-1 px-3 py-2" />
            </div>

            {/* Narrow-screen hamburger trigger (CSS-only toggle, no JS needed). */}
            <label
              htmlFor="nav-toggle"
              aria-label="Open menu"
              className="relative grid h-11 w-11 place-items-center rounded-md text-slate-600 hover:bg-slate-100 sm:hidden"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-600" />}
            </label>
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <Link href="/how-it-works" className="rounded-md px-2.5 py-2.5 text-slate-600 hover:bg-slate-100">
              How it works
            </Link>
            <Link href="/sign-in" className="btn-primary px-3 py-2">
              Sign in
            </Link>
          </div>
        )}
      </nav>

      {signedIn && (
        <>
          <input type="checkbox" id="nav-toggle" className="peer hidden" />
          <div className="hidden flex-col gap-0.5 border-t border-slate-200 bg-white px-2 py-2 peer-checked:flex sm:hidden">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-md px-3 py-3 text-slate-700 hover:bg-slate-100">
                {l.label}
              </Link>
            ))}
            <Link href="/notifications" className="flex items-center justify-between rounded-md px-3 py-3 text-slate-700 hover:bg-slate-100">
              Alerts
              {unread > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            {isAdmin && (
              <Link href="/admin" className="rounded-md px-3 py-3 font-medium text-brand-700 hover:bg-brand-50">
                Admin
              </Link>
            )}
            <Link href="/settings" className="rounded-md px-3 py-3 text-slate-700 hover:bg-slate-100">
              Settings
            </Link>
            <SignOutButton className="btn-secondary mt-1 justify-center py-3" />
          </div>
        </>
      )}
    </header>
  );
}
