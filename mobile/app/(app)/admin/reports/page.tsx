"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReportStatus } from "@/lib/types";
import { ScreenHeader } from "../../../_components/screen-header";
import { useAuth } from "../../../providers";
import { Splash } from "../../../_components/splash";

const STATUSES: ReportStatus[] = ["open", "reviewing", "resolved", "dismissed"];
const STATUS_STYLE: Record<ReportStatus, { bg: string; color: string }> = {
  open: { bg: "var(--ts-warning-soft)", color: "var(--ts-warning-strong)" },
  reviewing: { bg: "var(--ts-accent-soft)", color: "var(--ts-accent-strong)" },
  resolved: { bg: "var(--ts-accent-soft)", color: "var(--ts-accent-strong)" },
  dismissed: { bg: "var(--ts-surface)", color: "var(--ts-muted)" },
};

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
    <div>
      <ScreenHeader title="Reports" />
      {reports.length === 0 ? (
        <p className="ts-card text-sm" style={{ color: "var(--ts-muted)" }}>No reports.</p>
      ) : (
        <div className="space-y-2.5">
          {reports.map((r) => (
            <ReportCard key={r.id} report={r} onChange={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReportCard({ report, onChange }: { report: Report; onChange: () => void }) {
  const { supabase } = useAuth();
  const [status, setStatus] = useState<ReportStatus>(report.status);
  const [busy, setBusy] = useState(false);

  async function update(next: ReportStatus) {
    setBusy(true);
    setStatus(next);
    await supabase.from("reports").update({ status: next }).eq("id", report.id);
    setBusy(false);
    onChange();
  }

  return (
    <div className="ts-card animate-ts-card-in">
      <div className="flex items-start justify-between gap-2">
        <p className="flex-1 text-sm" style={{ color: "var(--ts-text-strong)" }}>{report.reason}</p>
        <span className="ts-badge flex-none" style={STATUS_STYLE[status]}>{status.toUpperCase()}</span>
      </div>
      <p className="mt-1 text-[11px]" style={{ color: "var(--ts-faint)" }}>
        {new Date(report.created_at).toLocaleString("en-IN")} · reporter {short(report.reporter_profile_id)} · against{" "}
        {short(report.reported_profile_id)} {report.match_id ? `· match ${short(report.match_id)}` : ""}
      </p>
      {status === "open" && (
        <button
          type="button"
          onClick={() => update("resolved")}
          disabled={busy}
          className="ts-btn mt-3 px-3.5 py-2 text-xs"
          style={{ background: "var(--ts-accent-soft)", border: "1px solid var(--ts-accent-border)", color: "var(--ts-accent-strong)" }}
        >
          Resolve
        </button>
      )}
      {status !== "open" && (
        <select
          value={status}
          onChange={(e) => update(e.target.value as ReportStatus)}
          disabled={busy}
          className="ts-input mt-3 w-auto py-1.5 text-xs"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      )}
    </div>
  );
}

function short(id: string | null) {
  return id ? id.slice(0, 8) : "—";
}
