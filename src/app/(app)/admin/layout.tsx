import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

const tabs = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/verification", label: "Verification" },
  { href: "/admin/rules", label: "Rules engine" },
  { href: "/admin/districts", label: "Districts" },
  { href: "/admin/cadres", label: "Cadres" },
  { href: "/admin/designations", label: "Designations" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/analytics", label: "Analytics" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-sand-900">Admin</h1>
        <p className="text-sm text-sand-600">Verify users, tune eligibility rules, moderate reports and view demand.</p>
      </div>
      <nav className="flex flex-wrap gap-1 border-b border-sand-200">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className="rounded-t-md px-3 py-2 text-sm text-sand-600 hover:bg-sand-100">
            {t.label}
          </Link>
        ))}
      </nav>
      <div>{children}</div>
    </div>
  );
}
