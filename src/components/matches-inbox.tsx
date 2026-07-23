"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getUserMatches, type MatchMemberView, type MatchView } from "@/lib/matches";
import { MatchStatusBadge, MatchTypeBadge, VerificationBadge } from "@/components/badges";
import { SwapRoute } from "@/components/swap-route";
import { ConsentPanel } from "@/components/consent-panel";
import { MessageThread } from "@/components/message-thread";
import { GenerateAgreementButton } from "@/components/agreement-and-report";
import { EmptyState } from "@/components/illustrations";
import { Mail, Phone } from "@/components/icons";

interface RevealedContact {
  profile_id: string;
  full_name: string | null;
  contact_email: string | null;
  phone: string | null;
  current_office: string | null;
}

/** How many parties (beyond the viewer) have opted in — drives the colour code. */
type Interest = "mutual" | "other" | "self" | "none";

function interestOf(m: MatchView): Interest {
  if (m.allConsented) return "mutual";
  const othersIn = m.members.some((x) => !x.isSelf && m.consents[x.id]);
  if (othersIn) return "other";
  if (m.selfConsented) return "self";
  return "none";
}

/** Tailwind classes + label per interest level. `mutual` (everyone in) and
 *  `other` (the other side is interested) are the states worth acting on. */
const INTEREST_STYLE: Record<Interest, { dot: string; pill: string; label: string; card: string }> = {
  mutual: {
    dot: "bg-green-500",
    pill: "bg-green-100 text-green-800",
    label: "Mutual — chat unlocked",
    card: "border-l-4 border-l-green-500",
  },
  other: {
    dot: "bg-amber-500",
    pill: "bg-amber-100 text-amber-800",
    label: "Other party interested",
    card: "border-l-4 border-l-amber-500",
  },
  self: {
    dot: "bg-blue-500",
    pill: "bg-blue-100 text-blue-800",
    label: "You're interested",
    card: "border-l-4 border-l-blue-400",
  },
  none: {
    dot: "bg-sand-300",
    pill: "bg-sand-100 text-sand-600",
    label: "No response yet",
    card: "border-l-4 border-l-transparent",
  },
};

/**
 * Master–detail inbox: every match in a left rail, colour-coded by mutual
 * interest; selecting one shows its full details in the top-right panel with the
 * chat filling the space below. Shared by the web and mobile (Capacitor) apps —
 * it creates its own singleton Supabase client and only needs the viewer's id.
 */
export function MatchesInbox({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [matches, setMatches] = useState<MatchView[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const all = await getUserMatches(supabase, userId);
    // Sort most-actionable first: mutual, then other-interested, then the rest.
    const rank: Record<Interest, number> = { mutual: 0, other: 1, self: 2, none: 3 };
    all.sort((a, b) => rank[interestOf(a)] - rank[interestOf(b)] || +new Date(b.created_at) - +new Date(a.created_at));
    setMatches(all);
    // Preserve a still-valid selection; otherwise leave it (don't auto-open on
    // mobile, where that would hide the list).
    setSelectedId((cur) => (cur && all.some((m) => m.id === cur) ? cur : cur));
  }, [supabase, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = matches?.find((m) => m.id === selectedId) ?? null;

  if (matches === null) {
    return <div className="py-16 text-center text-sm text-sand-500">Loading…</div>;
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-display text-2xl font-semibold text-sand-900">Chats</h1>
        <p className="mt-1 text-sm text-sand-600">
          All your matches and their conversations in one place.{" "}
          <span className="text-green-700">Green</span> = mutual interest (chat unlocked),{" "}
          <span className="text-amber-700">amber</span> = the other side is interested.
        </p>
      </div>

      {matches.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-sand-300 bg-white px-4 py-12 text-center">
          <EmptyState className="h-14 w-14" />
          <p className="max-w-sm text-sm text-sand-500">
            No matches yet. Add more preferred districts in Preferences to widen your reach.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-[320px_1fr]">
          {/* Left rail — match list */}
          <aside className={selected ? "hidden md:block" : "block"}>
            <ul className="space-y-2 md:max-h-[calc(100vh-16rem)] md:overflow-y-auto md:pr-1">
              {matches.map((m) => (
                <MatchListItem
                  key={m.id}
                  match={m}
                  active={m.id === selectedId}
                  onSelect={() => setSelectedId(m.id)}
                />
              ))}
            </ul>
          </aside>

          {/* Right pane — details (top) + chat (below) */}
          <section className={selected ? "block" : "hidden md:block"}>
            {selected ? (
              <MatchDetailPane
                key={selected.id}
                match={selected}
                userId={userId}
                supabase={supabase}
                onBack={() => setSelectedId(null)}
                onChanged={load}
              />
            ) : (
              <div className="grid h-full min-h-[40vh] place-items-center rounded-2xl border border-dashed border-sand-300 bg-white text-center">
                <p className="max-w-xs px-4 text-sm text-sand-500">
                  Select a match on the left to see its details and start chatting.
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function MatchListItem({ match, active, onSelect }: { match: MatchView; active: boolean; onSelect: () => void }) {
  const interest = interestOf(match);
  const style = INTEREST_STYLE[interest];
  const other = match.members.find((m) => !m.isSelf);
  const consentedCount = Object.values(match.consents).filter(Boolean).length;

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`w-full rounded-xl bg-white p-3 text-left shadow-warm transition hover:shadow-warm-md ${style.card} ${
          active ? "ring-2 ring-brand-400" : ""
        }`}
      >
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} aria-hidden />
            <MatchTypeBadge type={match.type} size={match.members.length} />
          </div>
          <MatchStatusBadge status={match.status} />
        </div>

        <p className="truncate text-sm font-medium text-sand-900">
          {other?.current_district ? `${other.current_district}, ${other.current_state}` : "Match"}
        </p>
        <p className="truncate text-xs text-sand-500">
          {other?.designation ?? "—"} · {other?.pay_level ?? "—"}
        </p>

        <div className="mt-2 flex items-center justify-between gap-2">
          <span className={`badge ${style.pill}`}>{style.label}</span>
          <span className="text-[11px] text-sand-400">
            {consentedCount}/{match.members.length} in
          </span>
        </div>
      </button>
    </li>
  );
}

function MatchDetailPane({
  match,
  userId,
  supabase,
  onBack,
  onChanged,
}: {
  match: MatchView;
  userId: string;
  supabase: ReturnType<typeof createClient>;
  onBack: () => void;
  onChanged: () => void;
}) {
  const [contacts, setContacts] = useState<Record<string, RevealedContact>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      if (!match.allConsented) {
        if (active) setContacts({});
        return;
      }
      const { data } = await supabase.rpc("reveal_contact", { p_match_id: match.id });
      if (active) {
        setContacts(Object.fromEntries(((data ?? []) as RevealedContact[]).map((c) => [c.profile_id, c])));
      }
    })();
    return () => {
      active = false;
    };
  }, [supabase, match.id, match.allConsented]);

  const consentedCount = Object.values(match.consents).filter(Boolean).length;
  const labels: Record<string, string> = {};
  match.members.forEach((m, i) => (labels[m.id] = m.isSelf ? "You" : `Member ${i + 1}`));

  return (
    <div className="flex flex-col gap-4">
      {/* Top panel — match details (scrolls independently on wide screens) */}
      <div className="space-y-4 md:max-h-[52vh] md:overflow-y-auto md:pr-1">
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={onBack} className="text-sm text-brand-700 hover:underline md:hidden">
            ← All chats
          </button>
          <span className="ml-auto text-xs text-sand-400">
            Created {new Date(match.created_at).toLocaleDateString("en-IN")}
          </span>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center gap-2">
            <MatchTypeBadge type={match.type} size={match.members.length} />
            <MatchStatusBadge status={match.status} />
          </div>
          <SwapRoute members={match.members} type={match.type} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {match.members.map((m, i) => {
            const dest = match.members[(i + 1) % match.members.length];
            return (
              <MemberCard
                key={m.id}
                member={m}
                index={i}
                movingTo={[dest.current_district, dest.current_state].filter(Boolean).join(", ") || "Unknown"}
                consented={match.consents[m.id]}
                contact={contacts[m.id]}
              />
            );
          })}
        </div>

        <ConsentPanel
          matchId={match.id}
          selfConsented={match.selfConsented}
          allConsented={match.allConsented}
          consentedCount={consentedCount}
          total={match.members.length}
          onDone={onChanged}
        />

        {match.allConsented && (
          <div className="card">
            <h3 className="font-semibold text-sand-900">Joint application</h3>
            <p className="mb-3 mt-1 text-sm text-sand-600">
              Generate a pre-filled joint mutual-transfer application with everyone&apos;s details.
            </p>
            <GenerateAgreementButton matchId={match.id} />
          </div>
        )}
      </div>

      {/* Chat — the rest of the space */}
      {match.allConsented ? (
        <MessageThread matchId={match.id} selfId={userId} labels={labels} />
      ) : (
        <div className="card border-dashed text-center text-sm text-sand-500">
          <p className="font-medium text-sand-700">Chat unlocks on mutual consent</p>
          <p className="mt-1">
            Once <strong>all {match.members.length} parties</strong> mark themselves interested, contact details are
            shared and messaging opens here.
          </p>
        </div>
      )}
    </div>
  );
}

function MemberCard({
  member,
  index,
  movingTo,
  consented,
  contact,
}: {
  member: MatchMemberView;
  index: number;
  movingTo: string;
  consented: boolean;
  contact?: RevealedContact;
}) {
  return (
    <div className="card">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-sand-900">{member.isSelf ? "You" : `Member ${index + 1}`}</h3>
        <div className="flex items-center gap-2">
          <VerificationBadge status={member.verification_status} />
          {consented ? (
            <span className="badge bg-blue-100 text-blue-800">Interested</span>
          ) : (
            <span className="badge bg-sand-100 text-sand-600">No response</span>
          )}
        </div>
      </div>

      <dl className="space-y-1 text-sm text-sand-600">
        <KV k="Current posting" v={[member.current_district, member.current_state].filter(Boolean).join(", ")} />
        <KV k="Court level" v={member.court_level} />
        <KV k="Cadre" v={member.cadre} />
        <KV k="Designation" v={member.designation} />
        <KV k="Grade pay" v={member.pay_level} />
      </dl>

      <div className="mt-3 flex items-center gap-2 rounded-md bg-brand-50 px-3 py-2 text-sm">
        <span className="text-brand-600" aria-hidden>➜</span>
        <span className="text-sand-600">{member.isSelf ? "You move to" : "Moves to"}</span>
        <span className="font-semibold text-sand-900">{movingTo}</span>
      </div>

      {member.disciplinary_pending && (
        <div className="mt-3">
          <span className="badge bg-red-100 text-red-800">Disciplinary pending</span>
        </div>
      )}

      {contact && !member.isSelf && (
        <div className="mt-3 rounded-xl border border-green-200 bg-green-50 p-3 text-sm">
          <p className="font-medium text-green-900">{contact.full_name ?? "Contact"}</p>
          {contact.current_office && <p className="text-green-800">{contact.current_office}</p>}
          {contact.contact_email && (
            <p className="flex items-center gap-1.5 break-all text-green-800">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <a className="underline" href={`mailto:${contact.contact_email}`}>{contact.contact_email}</a>
            </p>
          )}
          {contact.phone && (
            <p className="flex items-center gap-1.5 text-green-800">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              {contact.phone}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function KV({ k, v }: { k: string; v: string | null }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-sand-400">{k}</dt>
      <dd className="text-right text-sand-700">{v || "—"}</dd>
    </div>
  );
}
