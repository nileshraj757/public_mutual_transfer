"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BrowseFilters } from "@/components/browse-filters";
import { RequestConnectButton } from "@/components/request-connect-button";
import { ReportProfileButton } from "@/components/agreement-and-report";
import { VerificationBadge } from "@/components/badges";
import type { BrowseProfile } from "@/lib/types";
import { useAuth } from "../../providers";

const PAGE_SIZE = 24;

export default function BrowsePage() {
  return (
    <Suspense>
      <BrowseInner />
    </Suspense>
  );
}

function BrowseInner() {
  const { supabase } = useAuth();
  const params = useSearchParams();
  const [results, setResults] = useState<BrowseProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase.rpc("browse_profiles", {
        f_state: params.get("state") || null,
        f_district: params.get("district") || null,
        f_designation: params.get("designation") || null,
        f_pay_level: params.get("pay_level") || null,
        f_cadre: params.get("cadre") || null,
        page_limit: PAGE_SIZE,
        page_offset: (page - 1) * PAGE_SIZE,
      });
      if (!active) return;
      setError(error?.message ?? null);
      setResults((data ?? []) as BrowseProfile[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [supabase, params, page]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-sand-900">Browse available options</h1>
        <p className="mt-1 text-sm text-sand-600">
          Anonymized open requests. Names, employee IDs, emails and phone numbers are never shown here — contact is
          shared only inside a mutual match after both sides consent.
        </p>
      </div>

      <BrowseFilters />

      {error ? (
        <p className="card text-sm text-red-600">Couldn&apos;t load options: {error}</p>
      ) : loading ? (
        <p className="card text-sm text-sand-500">Loading…</p>
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
                <Row k="Grade pay" v={r.pay_level} />
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
              <div className="mt-3 flex items-center justify-between gap-2">
                <RequestConnectButton profileId={r.profile_id} />
                <ReportProfileButton profileId={r.profile_id} />
              </div>
            </div>
          ))}
        </div>
      )}

      <Pager page={page} hasMore={results.length === PAGE_SIZE} params={params} />
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

function Pager({ page, hasMore, params }: { page: number; hasMore: boolean; params: URLSearchParams }) {
  const build = (p: number) => {
    const sp = new URLSearchParams(params.toString());
    sp.set("page", String(p));
    return `/browse?${sp.toString()}`;
  };
  return (
    <div className="flex items-center justify-between">
      <Link href={build(Math.max(1, page - 1))} className={`btn-secondary ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}>← Previous</Link>
      <span className="text-sm text-sand-500">Page {page}</span>
      <Link href={build(page + 1)} className={`btn-secondary ${hasMore ? "" : "pointer-events-none opacity-40"}`}>Next →</Link>
    </div>
  );
}
