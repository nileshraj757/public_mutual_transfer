"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getUserMatches, type MatchView } from "@/lib/matches";
import { isPremiumLockedClient } from "@/lib/billing-client";
import { MatchCard } from "@/components/match-card";
import { RecomputeButton } from "@/components/recompute-button";
import { VerificationBadge } from "@/components/badges";
import { PremiumTeaser } from "@/components/premium-teaser";
import { EmptyState } from "@/components/illustrations";
import type { VerificationStatus } from "@/lib/types";
import { useAuth } from "../../providers";
import { Splash } from "../../_components/splash";

export default function DashboardPage() {
  const { supabase, profile } = useAuth();
  const [matches, setMatches] = useState<MatchView[] | null>(null);
  const [locked, setLocked] = useState(false);
  const [prefCount, setPrefCount] = useState(0);

  const load = useCallback(async () => {
    if (!profile) return;
    const [m, isLocked, prefs] = await Promise.all([
      getUserMatches(supabase, profile.id),
      isPremiumLockedClient(supabase, profile.id),
      supabase.from("preferences").select("id", { count: "exact", head: true }).eq("profile_id", profile.id),
    ]);
    setMatches(m);
    setLocked(isLocked);
    setPrefCount(prefs.count ?? 0);
  }, [supabase, profile]);

  useEffect(() => {
    load();
  }, [load]);

  if (!profile || matches === null) return <Splash />;

  const direct = matches.filter((m) => m.type === "direct" && m.status !== "cancelled");
  const chains = matches.filter((m) => m.type === "chain" && m.status !== "cancelled");

  return (
    <div className="space-y-8">
      <HomeHero
        name={profile.full_name}
        posting={`${profile.current_district ?? ""}, ${profile.current_state ?? ""}`}
        designation={profile.designation}
        verification={profile.verification_status}
        directCount={direct.length}
        chainCount={chains.length}
        prefCount={prefCount}
        locked={locked}
        onRecompute={load}
      />

      {locked ? (
        <PremiumTeaser
          headline={`${direct.length + chains.length} matches waiting`}
          blurb="Subscribe to see full match details, chat, and send connection requests."
        >
          <MatchesPreview direct={direct} chains={chains} />
        </PremiumTeaser>
      ) : (
        <MatchesPreview direct={direct} chains={chains} />
      )}
    </div>
  );
}

function HomeHero({
  name,
  posting,
  designation,
  verification,
  directCount,
  chainCount,
  prefCount,
  locked,
  onRecompute,
}: {
  name: string | null;
  posting: string;
  designation: string | null;
  verification: VerificationStatus;
  directCount: number;
  chainCount: number;
  prefCount: number;
  locked: boolean;
  onRecompute: () => void;
}) {
  return (
    <div className="card overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 text-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Namaste{name ? `, ${name.split(" ")[0]}` : ""}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-brand-50/90">
            {posting} · {designation ?? "—"}
            <VerificationBadge status={verification} />
          </p>
        </div>
        <RecomputeButton onDone={onRecompute} />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
        <StatTile value={directCount} label="Direct matches" />
        <StatTile value={chainCount} label="Chain matches" />
        <StatTile value={prefCount} label="Preferred districts" />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/browse" className="rounded-full bg-white/15 px-4 py-2 text-sm font-medium transition hover:bg-white/25">
          Search postings
        </Link>
        <Link href="/profile" className="rounded-full bg-white/15 px-4 py-2 text-sm font-medium transition hover:bg-white/25">
          Edit profile
        </Link>
        {locked && (
          <Link href="/billing" className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-sand-900 transition hover:bg-amber-300">
            Subscribe
          </Link>
        )}
      </div>
    </div>
  );
}

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl bg-white/10 px-3 py-2.5 text-center">
      <p className="font-display text-xl font-bold">{value}</p>
      <p className="text-[11px] leading-tight text-brand-50/80">{label}</p>
    </div>
  );
}

function MatchesPreview({ direct, chains }: { direct: MatchView[]; chains: MatchView[] }) {
  return (
    <div className="space-y-8">
      <Section title="Direct matches" count={direct.length} hint="A two-person swap where each of you wants the other's location.">
        {direct.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {direct.map((m, i) => (
              <div key={m.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                <MatchCard match={m} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyHint text="No direct swaps yet. Add more preferred districts to widen your reach and improve your chances of a match." />
        )}
      </Section>

      <Section title="Chain matches" count={chains.length} hint="A multi-way cyclic swap (A→B→C→A) detected automatically.">
        {chains.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {chains.map((m, i) => (
              <div key={m.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                <MatchCard match={m} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyHint text="No chains involving you right now. These appear automatically when a cycle of compatible employees forms." />
        )}
      </Section>
    </div>
  );
}

function Section({ title, count, hint, children }: { title: string; count: number; hint: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="font-display text-lg font-semibold text-sand-900">
          {title} <span className="font-sans text-sand-400">({count})</span>
        </h2>
        <p className="text-sm text-sand-500">{hint}</p>
      </div>
      {children}
    </section>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-sand-300 bg-white px-4 py-8 text-center">
      <EmptyState className="h-14 w-14" />
      <p className="max-w-sm text-sm text-sand-500">{text}</p>
    </div>
  );
}
