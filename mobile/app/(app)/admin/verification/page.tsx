"use client";

import { useCallback, useEffect, useState } from "react";
import { VerificationBadge } from "@/components/badges";
import type { VerificationStatus } from "@/lib/types";
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
    <div className="space-y-6">
      <Queue title={`Pending (${pending.length})`} profiles={pending} onChange={load} />
      <Queue title="Recently reviewed" profiles={rest} onChange={load} />
    </div>
  );
}

function Queue({ title, profiles, onChange }: { title: string; profiles: Row[]; onChange: () => void }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-sand-900">{title}</h2>
      {profiles.length === 0 ? (
        <p className="card text-sm text-sand-500">Nothing here.</p>
      ) : (
        <div className="space-y-2">
          {profiles.map((p) => (
            <div key={p.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-sand-900">
                  {p.full_name ?? "—"} <span className="text-xs text-sand-400">({p.employee_id_masked ?? "no ID"})</span>
                </p>
                <p className="text-sm text-sand-600">
                  {p.designation} · {p.pay_level} · {p.current_district}, {p.current_state}
                </p>
                <p className="break-words text-xs text-sand-400">{p.contact_email}</p>
              </div>
              <div className="flex items-center gap-3">
                <VerificationBadge status={p.verification_status} />
                <Controls profileId={p.id} current={p.verification_status} onChange={onChange} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Controls({
  profileId,
  current,
  onChange,
}: {
  profileId: string;
  current: VerificationStatus;
  onChange: () => void;
}) {
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
    <div className="flex gap-2">
      <button
        className="btn-secondary px-3 py-1.5 text-sm"
        type="button"
        disabled={busy || current === "verified"}
        onClick={() => set("verified")}
      >
        Verify
      </button>
      <button
        className="btn-danger px-3 py-1.5 text-sm"
        type="button"
        disabled={busy || current === "rejected"}
        onClick={() => set("rejected")}
      >
        Reject
      </button>
    </div>
  );
}
