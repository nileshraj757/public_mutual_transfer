"use client";

import { useCallback, useEffect, useState } from "react";
import { VerificationBadge } from "@/components/badges";
import type { VerificationStatus } from "@/lib/types";
import { ScreenHeader } from "../../../_components/screen-header";
import { useAuth } from "../../../providers";
import { Splash } from "../../../_components/splash";

interface Row {
  id: string;
  full_name: string | null;
  employee_id_masked: string | null;
  designation: string | null;
  pay_level: string | null;
  current_state: string | null;
  current_district: string | null;
  contact_email: string | null;
  verification_status: VerificationStatus;
  created_at: string;
}

export default function VerificationQueuePage() {
  const { supabase } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select(
        "id, full_name, employee_id_masked, designation, pay_level, current_state, current_district, contact_email, verification_status, created_at"
      )
      .order("verification_status", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(200);
    setRows((data as Row[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  if (rows === null) return <Splash />;

  const pending = rows.filter((p) => p.verification_status === "pending");
  const rest = rows.filter((p) => p.verification_status !== "pending").slice(0, 50);

  return (
    <div>
      <ScreenHeader title="Verification queue" />
      <Queue title={`Pending (${pending.length})`} profiles={pending} onChange={load} />
      {rest.length > 0 && <Queue title="Recently reviewed" profiles={rest} onChange={load} />}
      {pending.length === 0 && (
        <p className="mt-1 py-8 text-center text-sm" style={{ color: "var(--ts-faint)" }}>No pending verifications.</p>
      )}
    </div>
  );
}

function Queue({ title, profiles, onChange }: { title: string; profiles: Row[]; onChange: () => void }) {
  if (profiles.length === 0) return null;
  return (
    <section className="mb-5">
      <p className="mb-2.5 text-xs font-bold tracking-[0.5px]" style={{ color: "var(--ts-muted)" }}>{title.toUpperCase()}</p>
      <div className="space-y-2.5">
        {profiles.map((p) => (
          <div key={p.id} className="ts-card animate-ts-card-in">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: "var(--ts-text-strong)" }}>
                  {p.full_name ?? "—"} <span className="text-xs font-normal" style={{ color: "var(--ts-faint)" }}>({p.employee_id_masked ?? "no ID"})</span>
                </p>
                <p className="mt-0.5 text-xs" style={{ color: "var(--ts-muted)" }}>
                  {p.designation} · {p.pay_level} · {p.current_district}, {p.current_state}
                </p>
              </div>
              <VerificationBadge status={p.verification_status} />
            </div>
            <div className="mt-3 flex gap-2 border-t pt-3" style={{ borderColor: "var(--ts-border)" }}>
              <Controls profileId={p.id} current={p.verification_status} onChange={onChange} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Controls({ profileId, current, onChange }: { profileId: string; current: VerificationStatus; onChange: () => void }) {
  const { supabase } = useAuth();
  const [busy, setBusy] = useState(false);

  async function set(status: VerificationStatus) {
    if (status === current) return;
    setBusy(true);
    await supabase.from("profiles").update({ verification_status: status }).eq("id", profileId);
    setBusy(false);
    onChange();
  }

  return (
    <>
      <button
        type="button"
        disabled={busy || current === "verified"}
        onClick={() => set("verified")}
        className="ts-btn flex-1 py-2 text-xs"
        style={{ background: "var(--ts-accent-soft)", border: "1px solid var(--ts-accent-border)", color: "var(--ts-accent-strong)" }}
      >
        Approve
      </button>
      <button
        type="button"
        disabled={busy || current === "rejected"}
        onClick={() => set("rejected")}
        className="ts-btn flex-1 py-2 text-xs"
        style={{ background: "var(--ts-danger-soft)", border: "1px solid var(--ts-danger-border)", color: "var(--ts-danger)" }}
      >
        Reject
      </button>
    </>
  );
}
