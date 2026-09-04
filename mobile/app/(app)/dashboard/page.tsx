"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getUserMatches, type MatchView } from "@/lib/matches";
import { isPremiumLockedClient } from "@/lib/billing-client";
import { MatchCard } from "@/components/match-card";
import { RecomputeButton } from "@/components/recompute-button";
import { PremiumTeaser } from "@/components/premium-teaser";
import { EmptyState } from "@/components/illustrations";
import { VerificationBadge } from "@/components/badges";
import { ChevronRight } from "@/components/icons";
import { StatTile } from "../../_components/stat-tile";
import { useAuth } from "../../providers";
import { useToast } from "../../_components/toast";
import { Splash } from "../../_components/splash";

/**
 * Home tab (also the post-signup and every-login landing screen — see
 * postAuthDestination). A personal overview first: who you are, your key
 * numbers, then your matches. The match list itself is unchanged from before;
 * everything above "YOUR MATCHES" is new.
 */
export default function DashboardPage() {
  const { supabase, profile, unreadCount, realtimeVersion } = useAuth();
  const toast = useToast();
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
  }, [load, realtimeVersion]);

  if (!profile || matches === null) return <Splash />;

  const direct = matches.filter((m) => m.type === "direct" && m.status !== "cancelled");
  const chains = matches.filter((m) => m.type === "chain" && m.status !== "cancelled");
  const firstName = profile.full_name?.split(" ")[0] ?? "there";
  const initials =
    (profile.full_name ?? "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
  const summary = [profile.cadre, profile.designation].filter(Boolean).join(" · ");
  const posting = [profile.current_district, profile.current_state].filter(Boolean).join(", ");

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

      <Link href="/profile" className="ts-card mb-4 flex items-center gap-3 transition active:scale-[0.98]">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt="" className="h-12 w-12 flex-none rounded-full object-cover" />
        ) : (
          <div
            className="grid h-12 w-12 flex-none place-items-center rounded-full text-base font-bold"
            style={{ background: "linear-gradient(135deg, var(--ts-accent), var(--ts-warning))", color: "var(--ts-on-accent)" }}
          >
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-bold" style={{ color: "var(--ts-text-strong)" }}>{profile.full_name || "Your profile"}</p>
            <VerificationBadge status={profile.verification_status} />
          </div>
          {summary && <p className="mt-0.5 truncate text-xs" style={{ color: "var(--ts-muted)" }}>{summary}</p>}
          {posting && <p className="truncate text-xs" style={{ color: "var(--ts-faint)" }}>{posting}</p>}
        </div>
        <ChevronRight className="h-4 w-4 flex-none" style={{ color: "var(--ts-faint)" }} />
      </Link>

      <div className="mb-4 grid grid-cols-3 gap-2.5">
        <StatTile value={direct.length + chains.length} label="ACTIVE MATCHES" tone="accent" />
        <StatTile value={unreadCount} label="UNREAD ALERTS" tone={unreadCount > 0 ? "warning" : "default"} />
        <StatTile value={prefCount} label="DISTRICTS WANTED" />
      </div>

      <div className="mb-5 grid grid-cols-3 gap-2.5">
        <QuickAction href="/browse" label="Browse" />
        <QuickAction href="/preferences" label="Preferences" />
        <QuickAction href="/billing" label="Premium" />
      </div>

      <div className="mb-5 rounded-2xl border px-3.5 py-3 text-[11px] leading-relaxed" style={{ background: "var(--ts-warning-soft)", borderColor: "var(--ts-warning-border)", color: "var(--ts-text-strong)" }}>
        <strong>Disclaimer:</strong> This platform only facilitates discovery of mutual-transfer partners. The actual
        transfer depends entirely on the competent authority&apos;s approval.
      </div>

      <p className="mb-2.5 text-xs font-bold tracking-[0.6px]" style={{ color: "var(--ts-muted-2)" }}>YOUR MATCHES</p>

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

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border px-2 py-3 text-center text-xs font-semibold transition active:scale-95"
      style={{ background: "var(--ts-surface)", borderColor: "var(--ts-border)", color: "var(--ts-text-strong)" }}
    >
      {label}
    </Link>
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
