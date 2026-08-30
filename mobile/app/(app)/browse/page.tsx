"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BrowseFilters } from "@/components/browse-filters";
import { RequestConnectButton } from "@/components/request-connect-button";
import { ReportProfileButton } from "@/components/agreement-and-report";
import { VerificationBadge } from "@/components/badges";
import { Chip } from "../../_components/chip";
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
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

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

  const visible = verifiedOnly ? results.filter((r) => r.verification_status === "verified") : results;
  const activeFilterCount = ["state", "district", "designation", "pay_level", "cadre"].filter((k) => params.get(k)).length;

  return (
    <div>
      <div
        className="sticky top-0 z-10 -mx-5 mb-4 border-b px-5 py-4 backdrop-blur-xl [padding-top:calc(env(safe-area-inset-top)+1rem)]"
        style={{ background: "var(--ts-sticky-bg)", borderColor: "var(--ts-border)" }}
      >
        <p className="mb-3 font-display text-xl font-bold tracking-[-0.3px]" style={{ color: "var(--ts-text-strong)" }}>Browse</p>
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          <Chip label="Verified only" active={verifiedOnly} onClick={() => setVerifiedOnly((v) => !v)} />
          <Chip label={activeFilterCount ? `Filters (${activeFilterCount})` : "Filters"} active={showFilters || activeFilterCount > 0} onClick={() => setShowFilters((s) => !s)} />
        </div>
      </div>

      <p className="mb-4 text-xs leading-relaxed" style={{ color: "var(--ts-faint)" }}>
        Anonymized open requests. Names, employee IDs, emails and phone numbers are never shown here — contact is
        shared only inside a mutual match after both sides consent.
      </p>

      {showFilters && (
        <div className="mb-4 animate-ts-card-in">
          <BrowseFilters />
        </div>
      )}

      {error ? (
        <p className="ts-card text-sm" style={{ color: "var(--ts-danger)" }}>Couldn&apos;t load options: {error}</p>
      ) : loading ? (
        <p className="ts-card text-sm" style={{ color: "var(--ts-muted)" }}>Loading…</p>
      ) : visible.length === 0 ? (
        <p className="ts-card text-sm" style={{ color: "var(--ts-muted)" }}>No matching options. Try widening your filters.</p>
      ) : (
        <div className="space-y-3">
          {visible.map((r) => (
            <div key={r.profile_id} className="ts-card animate-ts-card-in">
              <div className="mb-2 flex items-start justify-between gap-2">
                <span className="text-sm font-semibold" style={{ color: "var(--ts-text-strong)" }}>{r.designation ?? "—"}</span>
                <VerificationBadge status={r.verification_status} />
              </div>
              <p className="mb-2.5 text-[11px]" style={{ color: "var(--ts-muted)" }}>
                {r.cadre ?? "—"} · Pay Level {r.pay_level ?? "—"}
              </p>
              <div className="flex items-center gap-2 text-xs" style={{ color: "var(--ts-muted)" }}>
                <span>{r.current_district}, {r.current_state}</span>
                <svg width="14" height="10" viewBox="0 0 20 12" fill="none" aria-hidden>
                  <path d="M0 6h16M11 1l5 5-5 5" stroke="var(--ts-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ color: "var(--ts-accent-strong)" }}>
                  {r.preferred.length ? r.preferred.slice(0, 3).map((p) => p.district).join(", ") : "Not specified"}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3" style={{ borderColor: "var(--ts-border)" }}>
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

function Pager({ page, hasMore, params }: { page: number; hasMore: boolean; params: URLSearchParams }) {
  const build = (p: number) => {
    const sp = new URLSearchParams(params.toString());
    sp.set("page", String(p));
    return `/browse?${sp.toString()}`;
  };
  return (
    <div className="mt-4 flex items-center justify-between">
      <Link href={build(Math.max(1, page - 1))} className={`ts-btn-secondary px-4 py-2 text-xs ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}>← Previous</Link>
      <span className="text-xs" style={{ color: "var(--ts-faint)" }}>Page {page}</span>
      <Link href={build(page + 1)} className={`ts-btn-secondary px-4 py-2 text-xs ${hasMore ? "" : "pointer-events-none opacity-40"}`}>Next →</Link>
    </div>
  );
}
