import type { MatchMemberView } from "@/lib/matches";

const loc = (m: MatchMemberView) =>
  [m.current_district, m.current_state].filter(Boolean).join(", ") || "Unknown";

/**
 * Renders the swap as a flow of current postings. For a chain the last member
 * loops back to the first (cyclic). "You" highlights the current user.
 */
export function SwapRoute({ members, type }: { members: MatchMemberView[]; type: "direct" | "chain" }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {members.map((m, i) => (
        <span key={m.id} className="flex items-center gap-2">
          <span
            className={`rounded-md px-2 py-1 ${m.isSelf ? "bg-brand-100 font-medium text-brand-800" : "bg-slate-100 text-slate-700"}`}
          >
            {m.isSelf ? "You" : `Member ${i + 1}`}: {loc(m)}
          </span>
          {i < members.length - 1 && <span className="text-slate-400">→</span>}
        </span>
      ))}
      {type === "chain" && <span className="text-slate-400">↩︎ back to start</span>}
    </div>
  );
}
