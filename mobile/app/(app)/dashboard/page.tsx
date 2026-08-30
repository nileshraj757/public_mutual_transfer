"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getUserMatches, type MatchView } from "@/lib/matches";
import { isPremiumLockedClient } from "@/lib/billing-client";
import { MatchCard } from "@/components/match-card";
import { RecomputeButton } from "@/components/recompute-button";
import { PremiumTeaser } from "@/components/premium-teaser";
import { EmptyState } from "@/components/illustrations";
import { useAuth } from "../../providers";
import { useToast } from "../../_components/toast";
import { Splash } from "../../_components/splash";

export default function DashboardPage() {
  const { supabase, profile } = useAuth();
  const toast = useToast();
  const [matches, setMatches] = useState<MatchView[] | null>(null);
  const [locked, setLocked] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    const [m, isLocked] = await Promise.all([getUserMatches(supabase, profile.id), isPremiumLockedClient(supabase, profile.id)]);
    setMatches(m);
    setLocked(isLocked);
  }, [supabase, profile]);

  useEffect(() => {
    load();
  }, [load]);

  if (!profile || matches === null) return <Splash />;

  const direct = matches.filter((m) => m.type === "direct" && m.status !== "cancelled");
  const chains = matches.filter((m) => m.type === "chain" && m.status !== "cancelled");
  const firstName = profile.full_name?.split(" ")[0] ?? "there";

  return (
    <div>
      <div
        className="sticky top-0 z-10 -mx-5 mb-4 flex items-center justify-between border-b px-5 py-4 backdrop-blur-xl [padding-top:calc(env(safe-area-inset-top)+1rem)]"
        style={{ background: "var(--ts-sticky-bg)", borderColor: "var(--ts-border)" }}
      >
        <div>
          <p className="text-xs" style={{ color: "var(--ts-muted)" }}>Welcome back</p>
          <p className="font-display text-xl font-bold tracking-[-0.3px]" style={{ color: "var(--ts-text-strong)" }}>{firstName}</p>
        </div>
        <RecomputeButton variant="icon" onDone={(msg) => { load(); if (msg) toast.show(msg); }} />
      </div>

      <div className="mb-5 rounded-2xl border px-3.5 py-3 text-[11px] leading-relaxed" style={{ background: "var(--ts-warning-soft)", borderColor: "var(--ts-warning-border)", color: "var(--ts-text-strong)" }}>
        <strong>Disclaimer:</strong> This platform only facilitates discovery of mutual-transfer partners. The actual
        transfer depends entirely on the competent authority&apos;s approval.
      </div>

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

      <div className="mt-6 flex justify-center">
        <Link href="/browse" className="ts-btn-secondary px-5 py-2.5 text-xs">Search postings</Link>
      </div>
    </div>
  );
}

function MatchesPreview({ direct, chains }: { direct: MatchView[]; chains: MatchView[] }) {
  return (
    <div className="space-y-6">
      <Section title="Direct swaps">
        {direct.length ? (
          <div className="space-y-3">
            {direct.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        ) : (
          <EmptyHint text="No direct swaps yet. Add more preferred districts to widen your reach." />
        )}
      </Section>

      <Section title="Chain swaps">
        {chains.length ? (
          <div className="space-y-3">
            {chains.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        ) : (
          <EmptyHint text="No chains involving you right now. These appear automatically when a cycle of compatible employees forms." />
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-2.5 text-xs font-bold tracking-[0.6px]" style={{ color: "var(--ts-muted-2)" }}>
        {title.toUpperCase()}
      </p>
      {children}
    </section>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="ts-card flex flex-col items-center gap-2 py-8 text-center" style={{ borderStyle: "dashed" }}>
      <EmptyState className="h-14 w-14" />
      <p className="max-w-sm text-sm" style={{ color: "var(--ts-muted)" }}>{text}</p>
    </div>
  );
}
