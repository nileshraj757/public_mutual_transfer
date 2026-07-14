import { requireProfile } from "@/lib/auth";
import { getUserMatches } from "@/lib/matches";
import { MatchCard } from "@/components/match-card";
import { RecomputeButton } from "@/components/recompute-button";
import { VerificationBadge } from "@/components/badges";
import { EmptyState } from "@/components/illustrations";

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
          <h1 className="font-display text-2xl font-semibold text-sand-900">Namaste{profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-sand-600">
            {profile.current_district}, {profile.current_state} · {profile.designation}
            <VerificationBadge status={profile.verification_status} />
          </p>
        </div>
        <RecomputeButton />
      </div>

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
