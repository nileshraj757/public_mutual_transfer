import type { MatchMemberView } from "@/lib/matches";

const loc = (m: MatchMemberView) =>
  [m.current_district, m.current_state].filter(Boolean).join(", ") || "Unknown";

const labelOf = (m: MatchMemberView, i: number) => (m.isSelf ? "You" : `Member ${i + 1}`);

/**
 * Visual "who moves where" diagram.
 *
 * Members are stored in cycle order; each person moves INTO the next person's
 * current posting (the last loops back to the first). The arrow from a person's
 * card points at the seat they take.
 *
 * - `compact` (dashboard cards): one-line summary of the current user's move.
 * - full: an SVG diagram — a ring for chains, a two-way swap for direct — plus a
 *   plain-text legend for exactness, mobile, and screen readers.
 */
export function SwapRoute({
  members,
  type,
  compact = false,
}: {
  members: MatchMemberView[];
  type: "direct" | "chain";
  compact?: boolean;
}) {
  const n = members.length;
  const destOf = (i: number) => members[(i + 1) % n];

  if (compact) {
    const selfIdx = Math.max(0, members.findIndex((m) => m.isSelf));
    return (
      <div className="space-y-1 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md px-2 py-0.5 text-xs font-semibold" style={{ background: "var(--ts-accent)", color: "var(--ts-on-accent)" }}>
            You
          </span>
          <span style={{ color: "var(--ts-muted)" }}>{loc(members[selfIdx])}</span>
          <span aria-hidden style={{ color: "var(--ts-accent-strong)" }}>→</span>
          <span className="font-semibold" style={{ color: "var(--ts-text-strong)" }}>{loc(destOf(selfIdx))}</span>
        </div>
        <p className="text-xs" style={{ color: "var(--ts-faint)" }}>{type === "direct" ? "Two-way mutual swap" : `${n}-way chain swap`}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-sand-600">
        {type === "direct"
          ? "Two-way swap — each person moves into the other person's posting:"
          : `${n}-way chain — follow each arrow: everyone moves into the next person's seat, and the last loops back to the first.`}
      </p>

      {type === "direct" || n === 2 ? <SwapDiagram members={members} /> : <ChainDiagram members={members} />}

      <Legend members={members} />
    </div>
  );
}

// ── Plain-text legend (exact + accessible) ────────────────────────────────────

function Legend({ members }: { members: MatchMemberView[] }) {
  const n = members.length;
  return (
    <ol className="space-y-1.5">
      {members.map((m, i) => {
        const dest = members[(i + 1) % n];
        const destIdx = (i + 1) % n;
        return (
          <li key={m.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span
              className={`inline-flex w-16 shrink-0 justify-center rounded px-1.5 py-0.5 text-xs font-semibold ${
                m.isSelf ? "bg-brand-600 text-white" : "bg-sand-200 text-sand-700"
              }`}
            >
              {labelOf(m, i)}
            </span>
            <span className="text-sand-700">{loc(m)}</span>
            <span aria-hidden className="font-semibold text-brand-600">➜</span>
            <span className="font-semibold text-sand-900">{loc(dest)}</span>
            <span className="text-xs text-sand-400">
              ({dest.isSelf ? "your seat" : `${labelOf(dest, destIdx)}'s seat`})
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ── Geometry helpers ──────────────────────────────────────────────────────────

const CARD_W = 132;
const CARD_H = 58;
const EDGE_GAP = 9;

/** Point where a ray leaving a card centre (in direction d) crosses the card edge. */
function edgePoint(cx: number, cy: number, dx: number, dy: number): [number, number] {
  const tx = Math.abs(dx) < 1e-6 ? Infinity : CARD_W / 2 / Math.abs(dx);
  const ty = Math.abs(dy) < 1e-6 ? Infinity : CARD_H / 2 / Math.abs(dy);
  const t = Math.min(tx, ty) + EDGE_GAP;
  return [cx + dx * t, cy + dy * t];
}

function ArrowDefs() {
  return (
    <defs>
      <marker id="swap-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#146152" />
      </marker>
      <marker id="swap-arrow-amber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#D98E1B" />
      </marker>
    </defs>
  );
}

function NodeCard({ x, y, member, index }: { x: number; y: number; member: MatchMemberView; index: number }) {
  return (
    <foreignObject x={x - CARD_W / 2} y={y - CARD_H / 2} width={CARD_W} height={CARD_H}>
      <div
        className={`flex h-full w-full flex-col items-center justify-center rounded-lg border px-2 text-center shadow-sm ${
          member.isSelf ? "border-brand-400 bg-brand-50" : "border-sand-200 bg-white"
        }`}
      >
        <span
          className={`text-[11px] font-bold uppercase tracking-wide ${member.isSelf ? "text-brand-700" : "text-sand-500"}`}
        >
          {labelOf(member, index)}
        </span>
        <span className="line-clamp-2 text-[12px] font-medium leading-tight text-sand-800">{loc(member)}</span>
      </div>
    </foreignObject>
  );
}

// ── Chain (ring) diagram ──────────────────────────────────────────────────────

function ChainDiagram({ members }: { members: MatchMemberView[] }) {
  const n = members.length;
  const SIZE = 380;
  const C = SIZE / 2;
  const R = n <= 3 ? 112 : 128;

  const nodes = members.map((m, i) => {
    const ang = ((-90 + (i * 360) / n) * Math.PI) / 180;
    return { m, i, x: C + R * Math.cos(ang), y: C + R * Math.sin(ang) };
  });

  const edges = nodes.map((a, i) => {
    const b = nodes[(i + 1) % n];
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const [sx, sy] = edgePoint(a.x, a.y, dx, dy);
    const [ex, ey] = edgePoint(b.x, b.y, -dx, -dy);
    return { sx, sy, ex, ey, key: a.m.id };
  });

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="mx-auto h-auto w-full max-w-sm"
      role="img"
      aria-label={`${n}-way chain swap diagram`}
    >
      <ArrowDefs />

      {/* Edges (drawn first so cards sit on top of arrow tails). */}
      {edges.map((e) => (
        <line
          key={e.key}
          x1={e.sx}
          y1={e.sy}
          x2={e.ex}
          y2={e.ey}
          stroke="#146152"
          strokeWidth={2.5}
          strokeDasharray="3 8"
          strokeLinecap="round"
          markerEnd="url(#swap-arrow)"
          className="animate-mt-dash"
        />
      ))}

      {/* Centre label */}
      <circle cx={C} cy={C} r={30} fill="#E9F1EA" stroke="#BFD8CB" />
      <text x={C} y={C - 2} textAnchor="middle" fill="#0F4E42" fontSize="13" fontWeight="700">
        {n}-way
      </text>
      <text x={C} y={C + 13} textAnchor="middle" fill="#146152" fontSize="10">
        chain ↻
      </text>

      {/* Cards */}
      {nodes.map((node) => (
        <NodeCard key={node.m.id} x={node.x} y={node.y} member={node.m} index={node.i} />
      ))}
    </svg>
  );
}

// ── Direct (two-way) diagram ──────────────────────────────────────────────────

function SwapDiagram({ members }: { members: MatchMemberView[] }) {
  const [a, b] = members;
  const SIZE_W = 380;
  const SIZE_H = 196;
  const ay = SIZE_H / 2;
  const ax = 92;
  const bx = SIZE_W - 92;

  // Top arrow a → b, bottom arrow b → a, bowed away from centre line.
  const leftEdge = ax + CARD_W / 2 + EDGE_GAP;
  const rightEdge = bx - CARD_W / 2 - EDGE_GAP;
  const midX = (leftEdge + rightEdge) / 2;

  return (
    <svg
      viewBox={`0 0 ${SIZE_W} ${SIZE_H}`}
      className="mx-auto h-auto w-full max-w-md"
      role="img"
      aria-label="Two-way mutual swap diagram"
    >
      <ArrowDefs />

      {/* a → b (top, green) */}
      <path
        d={`M ${leftEdge} ${ay - 12} Q ${midX} ${ay - 56} ${rightEdge} ${ay - 12}`}
        fill="none"
        stroke="#146152"
        strokeWidth={2.5}
        strokeDasharray="3 8"
        strokeLinecap="round"
        markerEnd="url(#swap-arrow)"
        className="animate-mt-dash"
      />
      <text x={midX} y={ay - 44} textAnchor="middle" fill="#8A948F" fontSize="11">
        moves to
      </text>

      {/* b → a (bottom, amber) */}
      <path
        d={`M ${rightEdge} ${ay + 12} Q ${midX} ${ay + 56} ${leftEdge} ${ay + 12}`}
        fill="none"
        stroke="#D98E1B"
        strokeWidth={2.5}
        strokeDasharray="3 8"
        strokeLinecap="round"
        markerEnd="url(#swap-arrow-amber)"
        className="animate-mt-dash"
      />
      <text x={midX} y={ay + 50} textAnchor="middle" fill="#8A948F" fontSize="11">
        moves to
      </text>

      <NodeCard x={ax} y={ay} member={a} index={0} />
      <NodeCard x={bx} y={ay} member={b} index={1} />
    </svg>
  );
}
