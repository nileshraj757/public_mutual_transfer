import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BrowseFilters } from "@/components/browse-filters";
import { VerificationBadge } from "@/components/badges";
import type { BrowseProfile } from "@/lib/types";

export const metadata = { title: "Browse options — Mutual Transfer" };

const PAGE_SIZE = 24;

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: { state?: string; district?: string; designation?: string; pay_level?: string; page?: string };
}) {
  await requireProfile("/browse");
  const supabase = createClient();

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const { data, error } = await supabase.rpc("browse_profiles", {
    f_state: searchParams.state || null,
    f_district: searchParams.district || null,
    f_designation: searchParams.designation || null,
    f_pay_level: searchParams.pay_level || null,
    f_cadre: null,
    page_limit: PAGE_SIZE,
    page_offset: (page - 1) * PAGE_SIZE,
  });

  const results = (data ?? []) as BrowseProfile[];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-sand-900">Browse available options</h1>
        <p className="mt-1 text-sm text-sand-600">
          Anonymized open requests. Names, employee IDs, emails and phone numbers are never shown here — contact is
          shared only inside a mutual match after both sides consent.
        </p>
      </div>

      <Suspense>
        <BrowseFilters />
      </Suspense>

      {error ? (
        <p className="card text-sm text-red-600">Couldn&apos;t load options: {error.message}</p>
      ) : results.length === 0 ? (
        <p className="card text-sm text-sand-500">No matching options. Try widening your filters.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((r) => (
            <div key={r.profile_id} className="card">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-sand-900">
                  {r.current_district}, {r.current_state}
                </span>
                <VerificationBadge status={r.verification_status} />
              </div>
              <dl className="space-y-1 text-xs text-sand-600">
                <Row k="Designation" v={r.designation} />
                <Row k="Cadre" v={r.cadre} />
                <Row k="Pay level" v={r.pay_level} />
              </dl>
              <div className="mt-3">
                <p className="text-xs font-medium text-sand-500">Wants to move to:</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {r.preferred.length ? (
                    r.preferred.slice(0, 4).map((p) => (
                      <span key={`${p.state}-${p.district}`} className="badge bg-sand-100 text-sand-700">
                        {p.district}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-sand-400">Not specified</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pager page={page} hasMore={results.length === PAGE_SIZE} searchParams={searchParams} />
    </div>
  );
}

function Row({ k, v }: { k: string; v: string | null }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-sand-400">{k}</dt>
      <dd className="text-right text-sand-700">{v ?? "—"}</dd>
    </div>
  );
}

function Pager({
  page,
  hasMore,
  searchParams,
}: {
  page: number;
  hasMore: boolean;
  searchParams: Record<string, string | undefined>;
}) {
  const build = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (v && k !== "page") sp.set(k, v);
    sp.set("page", String(p));
    return `/browse?${sp.toString()}`;
  };
  return (
    <div className="flex items-center justify-between">
      <a href={build(Math.max(1, page - 1))} className={`btn-secondary ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}>← Previous</a>
      <span className="text-sm text-sand-500">Page {page}</span>
      <a href={build(page + 1)} className={`btn-secondary ${hasMore ? "" : "pointer-events-none opacity-40"}`}>Next →</a>
    </div>
  );
}
