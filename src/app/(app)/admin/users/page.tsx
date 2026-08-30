import { createClient } from "@/lib/supabase/server";
import { VerificationBadge } from "@/components/badges";

export default async function UsersDirectoryPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const supabase = createClient();
  const q = searchParams.q?.trim() ?? "";

  let query = supabase
    .from("profiles")
    .select(
      "id, full_name, employee_id_masked, cadre, designation, current_state, current_district, verification_status, is_active, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (q) {
    query = query.or(
      `full_name.ilike.%${q}%,contact_email.ilike.%${q}%,cadre.ilike.%${q}%,designation.ilike.%${q}%`
    );
  }

  const { data } = await query;
  const users = data ?? [];

  return (
    <div className="space-y-4">
      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, email, cadre, designation…"
          className="input max-w-sm"
        />
        <button className="btn-secondary" type="submit">Search</button>
      </form>

      <p className="text-sm text-sand-500">{users.length} result{users.length === 1 ? "" : "s"}</p>

      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-sand-900">
                {u.full_name ?? "—"} <span className="text-xs text-sand-400">({u.employee_id_masked ?? "no ID"})</span>
              </p>
              <p className="text-sm text-sand-600">
                {u.cadre ?? "—"} · {u.designation ?? "—"} · {[u.current_district, u.current_state].filter(Boolean).join(", ") || "—"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!u.is_active && <span className="badge bg-sand-100 text-sand-600">Paused</span>}
              <VerificationBadge status={u.verification_status} />
            </div>
          </div>
        ))}
        {users.length === 0 && <p className="card text-sm text-sand-500">No matching users.</p>}
      </div>
    </div>
  );
}
