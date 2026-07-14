import { createClient } from "@/lib/supabase/server";

interface Demand {
  key: string;
  state: string;
  district: string;
  demand: number; // how many people want to go here
  supply: number; // how many people currently posted here
}

export default async function AnalyticsPage() {
  const supabase = createClient();

  const [{ data: prefs }, { data: profiles }, completed, matchesByType] = await Promise.all([
    supabase.from("preferences").select("preferred_state, preferred_district"),
    supabase.from("profiles").select("current_state, current_district").eq("is_active", true),
    supabase.from("matches").select("id", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("matches").select("type"),
  ]);

  const demandMap = new Map<string, Demand>();
  const upsert = (state: string | null, district: string | null, field: "demand" | "supply") => {
    if (!state || !district) return;
    const key = `${state}||${district}`;
    const row = demandMap.get(key) ?? { key, state, district, demand: 0, supply: 0 };
    row[field] += 1;
    demandMap.set(key, row);
  };
  for (const p of prefs ?? []) upsert(p.preferred_state, p.preferred_district, "demand");
  for (const p of profiles ?? []) upsert(p.current_state, p.current_district, "supply");

  const rows = [...demandMap.values()];
  const topDemand = [...rows].sort((a, b) => b.demand - a.demand).slice(0, 15);
  const maxDemand = Math.max(1, ...topDemand.map((r) => r.demand));
  const unmet = [...rows]
    .map((r) => ({ ...r, gap: r.demand - r.supply }))
    .filter((r) => r.gap > 0)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 15);

  const directCount = (matchesByType.data ?? []).filter((m) => m.type === "direct").length;
  const chainCount = (matchesByType.data ?? []).filter((m) => m.type === "chain").length;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Completed swaps" value={completed.count ?? 0} />
        <Stat label="Direct matches" value={directCount} />
        <Stat label="Chain matches" value={chainCount} />
      </div>

      <section className="card">
        <h2 className="mb-3 font-semibold text-sand-900">Most-wanted districts (demand)</h2>
        {topDemand.length === 0 ? (
          <p className="text-sm text-sand-500">No preference data yet.</p>
        ) : (
          <ul className="space-y-2">
            {topDemand.map((r) => (
              <li key={r.key} className="text-sm">
                <div className="flex justify-between">
                  <span className="text-sand-700">{r.district}, {r.state}</span>
                  <span className="text-sand-500">{r.demand} want · {r.supply} here</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded bg-sand-100">
                  <div className="h-full rounded bg-brand-500" style={{ width: `${(r.demand / maxDemand) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="mb-3 font-semibold text-sand-900">Unmet-demand heatmap (demand &gt; supply)</h2>
        {unmet.length === 0 ? (
          <p className="text-sm text-sand-500">No unmet demand detected.</p>
        ) : (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="text-left text-sand-500">
                  <th className="py-1">District</th>
                  <th className="py-1 text-right">Want to move in</th>
                  <th className="py-1 text-right">Currently posted</th>
                  <th className="py-1 text-right">Gap</th>
                </tr>
              </thead>
              <tbody>
                {unmet.map((r) => (
                  <tr key={r.key} className="border-t border-sand-100">
                    <td className="py-1.5">{r.district}, {r.state}</td>
                    <td className="py-1.5 text-right">{r.demand}</td>
                    <td className="py-1.5 text-right">{r.supply}</td>
                    <td className="py-1.5 text-right">
                      <span className="badge bg-amber-100 text-amber-800">+{r.gap}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <p className="font-display text-2xl font-semibold text-sand-900">{value}</p>
      <p className="text-sm text-sand-500">{label}</p>
    </div>
  );
}
