import { createClient } from "@/lib/supabase/server";
import { VerificationBadge } from "@/components/badges";
import { VerificationControls } from "./controls";

export default async function VerificationQueuePage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, employee_id_masked, cadre, designation, pay_level, current_state, current_district, contact_email, verification_status, created_at")
    .order("verification_status", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(200);

  const profiles = data ?? [];
  const pending = profiles.filter((p) => p.verification_status === "pending");
  const rest = profiles.filter((p) => p.verification_status !== "pending");

  return (
    <div className="space-y-6">
      <Queue title={`Pending (${pending.length})`} profiles={pending} />
      <Queue title="Recently reviewed" profiles={rest.slice(0, 50)} />
    </div>
  );
}

function Queue({ title, profiles }: { title: string; profiles: any[] }) {
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
                <VerificationControls profileId={p.id} current={p.verification_status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
