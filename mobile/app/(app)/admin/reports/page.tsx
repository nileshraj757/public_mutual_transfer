"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReportStatus } from "@/lib/types";
import { useAuth } from "../../../providers";
import { Splash } from "../../../_components/splash";

const STATUSES: ReportStatus[] = ["open", "reviewing", "resolved", "dismissed"];

interface Report {
  id: string;
  reason: string;
  status: ReportStatus;
  created_at: string;
  reporter_profile_id: string | null;
  reported_profile_id: string | null;
  match_id: string | null;
}

export default function ReportsPage() {
  const { supabase } = useAuth();
  const [reports, setReports] = useState<Report[] | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("reports")
      .select("id, reason, status, created_at, reporter_profile_id, reported_profile_id, match_id")
      .order("created_at", { ascending: false })
      .limit(200);
    setReports((data as Report[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  if (reports === null) return <Splash />;

  return (
    <div className="space-y-3">
      {reports.length === 0 ? (
        <p className="card text-sm text-sand-500">No reports. 🎉</p>
      ) : (
        reports.map((r) => <ReportCard key={r.id} report={r} onChange={load} />)
      )}
    </div>
  );
}

function ReportCard({ report, onChange }: { report: Report; onChange: () => void }) {
  const { supabase } = useAuth();
  const [status, setStatus] = useState<ReportStatus>(report.status);
  const [busy, setBusy] = useState(false);

  async function update() {
    setBusy(true);
    await supabase.from("reports").update({ status }).eq("id", report.id);
    setBusy(false);
    onChange();
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-sand-800">{report.reason}</p>
          <p className="mt-1 text-xs text-sand-400">
            {new Date(report.created_at).toLocaleString("en-IN")} · reporter {short(report.reporter_profile_id)} · against{" "}
            {short(report.reported_profile_id)} {report.match_id ? `· match ${short(report.match_id)}` : ""}
          </p>
        </div>
        <span className="badge bg-sand-100 text-sand-700 capitalize">{report.status}</span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ReportStatus)}
          className="input max-w-[180px] py-1.5 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button className="btn-secondary px-3 py-1.5 text-sm" type="button" onClick={update} disabled={busy}>
          Update
        </button>
      </div>
    </div>
  );
}

function short(id: string | null) {
  return id ? id.slice(0, 8) : "—";
}
