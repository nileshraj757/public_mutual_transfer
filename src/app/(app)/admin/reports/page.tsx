import { createClient } from "@/lib/supabase/server";
import { setReportStatus } from "../actions";
import type { ReportStatus } from "@/lib/types";

const STATUSES: ReportStatus[] = ["open", "reviewing", "resolved", "dismissed"];

export default async function ReportsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("reports")
    .select("id, reason, status, created_at, reporter_profile_id, reported_profile_id, match_id")
    .order("created_at", { ascending: false })
    .limit(200);

  const reports = data ?? [];

  return (
    <div className="space-y-3">
      {reports.length === 0 ? (
        <p className="card text-sm text-sand-500">No reports. 🎉</p>
      ) : (
        reports.map((r) => (
          <div key={r.id} className="card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-sand-800">{r.reason}</p>
                <p className="mt-1 text-xs text-sand-400">
                  {new Date(r.created_at).toLocaleString("en-IN")} · reporter {short(r.reporter_profile_id)} · against{" "}
                  {short(r.reported_profile_id)} {r.match_id ? `· match ${short(r.match_id)}` : ""}
                </p>
              </div>
              <span className="badge bg-sand-100 text-sand-700 capitalize">{r.status}</span>
            </div>
            <form action={setReportStatus} className="mt-3 flex items-center gap-2">
              <input type="hidden" name="id" value={r.id} />
              <select name="status" defaultValue={r.status} className="input max-w-[180px] py-1.5 text-sm">
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button className="btn-secondary px-3 py-1.5 text-sm" type="submit">Update</button>
            </form>
          </div>
        ))
      )}
    </div>
  );
}

function short(id: string | null) {
  return id ? id.slice(0, 8) : "—";
}
