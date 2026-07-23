import Link from "next/link";
import { SignOutButton } from "./sign-out-button";
import { MobileNav } from "./mobile-nav";
import { Logo, Bell, Settings } from "./icons";

interface TopNavProps {
  signedIn: boolean;
  isAdmin?: boolean;
  unread?: number;
}

const links = [
  { href: "/dashboard", label: "Matches" },
  { href: "/inbox", label: "Chats" },
  { href: "/preferences", label: "Preferences" },
  { href: "/profile", label: "Profile" },
];

export function TopNav({ signedIn, isAdmin, unread = 0 }: TopNavProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-sand-200 bg-sand-50/85 backdrop-blur [padding-top:env(safe-area-inset-top)]">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href={signedIn ? "/dashboard" : "/"} className="flex items-center gap-2.5 font-display font-semibold text-sand-900 transition hover:opacity-80">
          <Logo className="h-8 w-8" />
          <span className="hidden sm:inline">Transfer Setu</span>
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

            {/* Narrow-screen menu (React-driven so it auto-closes on selection). */}
            <MobileNav links={links} isAdmin={isAdmin} unread={unread} />
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
    </header>
  );
}
