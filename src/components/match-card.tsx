import Link from "next/link";
import type { MatchView } from "@/lib/matches";
import { MatchStatusBadge, MatchTypeBadge } from "@/components/badges";
import { SwapRoute } from "@/components/swap-route";
import { matchHref } from "@/lib/native";

export function MatchCard({ match }: { match: MatchView }) {
  const others = match.members.filter((m) => !m.isSelf);
  const consentedCount = Object.values(match.consents).filter(Boolean).length;
  // A cancelled match ("not interested"/declined post-acceptance) stays in the
  // list — it's not a block — but its details are gone and it needs a fresh
  // request to reconnect, not a consent status that no longer applies.
  const isEnded = match.status === "cancelled";

  return (
    <Link
      href={matchHref(match.id)}
      className="ts-card animate-ts-card-in block hover:-translate-y-0.5"
      style={{ borderColor: "var(--ts-border)" }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MatchTypeBadge type={match.type} size={match.members.length} />
          <MatchStatusBadge status={match.status} />
        </div>
        <span className="text-xs" style={{ color: "var(--ts-faint)" }}>
          {new Date(match.created_at).toLocaleDateString("en-IN")}
        </span>
      </div>

      <SwapRoute members={match.members} type={match.type} compact />

      <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs" style={{ borderColor: "var(--ts-border)", color: "var(--ts-muted)" }}>
        {isEnded ? (
          <span>This match ended — send a new request to reconnect.</span>
        ) : (
          <>
            <span>
              {others[0]?.designation ?? "—"} · {others[0]?.pay_level ?? "—"}
            </span>
            <span>
              {match.allConsented ? (
                <span style={{ color: "var(--ts-accent-strong)" }}>All parties consented</span>
              ) : (
                <>
                  {consentedCount}/{match.members.length} interested
                  {match.selfConsented ? "" : " · you haven't responded"}
                </>
              )}
            </span>
          </>
        )}
      </div>
    </Link>
  );
}
