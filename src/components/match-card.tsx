import Link from "next/link";
import type { MatchView } from "@/lib/matches";
import { MatchStatusBadge, MatchTypeBadge } from "@/components/badges";
import { SwapRoute } from "@/components/swap-route";

export function MatchCard({ match }: { match: MatchView }) {
  const others = match.members.filter((m) => !m.isSelf);
  const consentedCount = Object.values(match.consents).filter(Boolean).length;

  return (
    <Link href={`/matches/${match.id}`} className="card block transition hover:border-brand-300 hover:shadow">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MatchTypeBadge type={match.type} size={match.members.length} />
          <MatchStatusBadge status={match.status} />
        </div>
        <span className="text-xs text-slate-400">{new Date(match.created_at).toLocaleDateString("en-IN")}</span>
      </div>

      <SwapRoute members={match.members} type={match.type} />

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>
          {others[0]?.designation ?? "—"} · {others[0]?.pay_level ?? "—"}
        </span>
        <span>
          {match.allConsented ? (
            <span className="text-green-600">All parties consented</span>
          ) : (
            <>
              {consentedCount}/{match.members.length} interested
              {match.selfConsented ? "" : " · you haven't responded"}
            </>
          )}
        </span>
      </div>
    </Link>
  );
}
