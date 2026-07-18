"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RequireAdmin } from "../../_components/guards";

const tabs = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/verification", label: "Verification" },
  { href: "/admin/rules", label: "Rules engine" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/analytics", label: "Analytics" },
];

/** Admin shell — client-rendered mirror of the web app's
 *  src/app/(app)/admin/layout.tsx. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <RequireAdmin>
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-2xl font-semibold text-sand-900">Admin</h1>
          <p className="text-sm text-sand-600">Verify users, tune eligibility rules, moderate reports and view demand.</p>
        </div>
        <nav className="-mx-4 flex gap-1 overflow-x-auto border-b border-sand-200 px-4">
          {tabs.map((t) => {
            const active = pathname === t.href || pathname === `${t.href}/`;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`whitespace-nowrap rounded-t-md px-3 py-2 text-sm transition ${
                  active ? "bg-sand-100 font-medium text-sand-900" : "text-sand-600 hover:bg-sand-100"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
        <div>{children}</div>
      </div>
    </RequireAdmin>
  );
}
