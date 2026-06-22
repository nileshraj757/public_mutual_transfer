import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { getUserMatches } from "@/lib/matches";
import { MatchCard } from "@/components/match-card";
import { RecomputeButton } from "@/components/recompute-button";
import { VerificationBadge } from "@/components/badges";

export const metadata = { title: "Your matches — Mutual Transfer" };

export default async function DashboardPage() {
  const profile = await requireProfile("/dashboard");
  const matches = await getUserMatches(profile.id);

  const direct = matches.filter((m) => m.type === "direct" && m.status !== "cancelled");
  const chains = matches.filter((m) => m.type === "chain" && m.status !== "cancelled");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome{profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
            {profile.current_district}, {profile.current_state} · {profile.designation}
            <VerificationBadge status={profile.verification_status} />
          </p>
        </div>
        <RecomputeButton />
      </div>

      <Section title="Direct matches" count={direct.length} hint="A two-person swap where each of you wants the other's location.">
        {direct.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {direct.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        ) : (
          <EmptyHint text="No direct swaps yet. Add more preferred districts to widen your reach, or check Browse for options." />
        )}
      </Section>

      <Section title="Chain matches" count={chains.length} hint="A multi-way cyclic swap (A→B→C→A) detected automatically.">
        {chains.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {chains.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        ) : (
          <EmptyHint text="No chains involving you right now. These appear automatically when a cycle of compatible employees forms." />
        )}
      </Section>

      <div className="card flex flex-wrap items-center justify-between gap-3 bg-brand-50">
        <div>
          <h3 className="font-semibold text-slate-900">Looking for more options?</h3>
          <p className="text-sm text-slate-600">Browse all relevant open requests, even without a perfect mutual match.</p>
        </div>
        <Link href="/browse" className="btn-primary">Browse available options</Link>
      </div>
    </div>
  );
}

function Section({ title, count, hint, children }: { title: string; count: number; hint: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-slate-900">
          {title} <span className="text-slate-400">({count})</span>
        </h2>
        <p className="text-sm text-slate-500">{hint}</p>
      </div>
      {children}
    </section>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">{text}</p>;
}
