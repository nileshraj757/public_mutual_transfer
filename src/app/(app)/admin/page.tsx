import { createClient } from "@/lib/supabase/server";
import { triggerRecomputeAll } from "./actions";

export default async function AdminOverviewPage() {
  const supabase = createClient();

  const [pending, reports, matches, profiles] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("matches").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
  ]);

  const stats = [
    { label: "Total profiles", value: profiles.count ?? 0 },
    { label: "Pending verification", value: pending.count ?? 0 },
    { label: "Cached matches", value: matches.count ?? 0 },
    { label: "Open reports", value: reports.count ?? 0 },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="text-sm text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Recompute all matches</h2>
          <p className="text-sm text-slate-600">Rebuilds the full match graph (direct + chains) for every active profile.</p>
        </div>
        <form action={triggerRecomputeAll}>
          <button className="btn-primary" type="submit">Recompute now</button>
        </form>
      </div>
    </div>
  );
}
