"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getMatchById, type MatchMemberView, type MatchView } from "@/lib/matches";
import { parseRules, type MatchRules } from "@/lib/matching/rules";
import { isPremiumLockedClient } from "@/lib/billing-client";
import type { RuleConfig } from "@/lib/types";
import { MatchStatusBadge, MatchTypeBadge, VerificationBadge } from "@/components/badges";
import { ConsentPanel } from "@/components/consent-panel";
import { MessageThread } from "@/components/message-thread";
import { GenerateAgreementButton, ReportButton } from "@/components/agreement-and-report";
import { CancelMatchButton } from "@/components/cancel-match-button";
import { BlockButton } from "@/components/block-button";
import { Mail, Phone, Flag } from "@/components/icons";
import { ScreenHeader } from "../../_components/screen-header";
import { HoldToReveal } from "../../_components/hold-to-reveal";
import { useAuth } from "../../providers";
import { Splash } from "../../_components/splash";

interface RevealedContact {
  profile_id: string;
  full_name: string | null;
  contact_email: string | null;
  phone: string | null;
  current_office: string | null;
}

export default function MatchPage() {
  return (
    <Suspense fallback={<Splash />}>
      <MatchInner />
    </Suspense>
  );
}

function MatchInner() {
  const { supabase, profile } = useAuth();
  const params = useSearchParams();
  const id = params.get("id") ?? "";

  const [match, setMatch] = useState<MatchView | null>(null);
  const [rules, setRules] = useState<MatchRules | null>(null);
  const [contacts, setContacts] = useState<Record<string, RevealedContact>>({});
  const [loaded, setLoaded] = useState(false);
  const [locked, setLocked] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [justRevealed, setJustRevealed] = useState(false);

  const load = useCallback(async () => {
    if (!profile || !id) return;
    const [m, { data: rulesRows }, isLocked] = await Promise.all([
      getMatchById(supabase, profile.id, id),
      supabase.from("rules_config").select("*"),
      isPremiumLockedClient(supabase, profile.id),
    ]);
    setMatch(m);
    setRules(parseRules((rulesRows ?? []) as RuleConfig[]));
    setLocked(isLocked);

    if (m?.allConsented) {
      const { data } = await supabase.rpc("reveal_contact", { p_match_id: m.id });
      setContacts(Object.fromEntries(((data ?? []) as RevealedContact[]).map((c) => [c.profile_id, c])));
    } else {
      setContacts({});
    }
    setLoaded(true);
  }, [supabase, profile, id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!profile || !loaded || !rules) return <Splash />;
  if (!match) {
    return (
      <div>
        <ScreenHeader title="Match" />
        <p className="ts-card text-sm" style={{ color: "var(--ts-muted)" }}>This match no longer exists.</p>
      </div>
    );
  }

  const consentedCount = Object.values(match.consents).filter(Boolean).length;
  const labels: Record<string, string> = {};
  match.members.forEach((m, i) => (labels[m.id] = m.isSelf ? "You" : `Member ${i + 1}`));
  const others = match.members.filter((m) => !m.isSelf);

  return (
    <div>
      <ScreenHeader
        title={match.type === "direct" ? "Direct swap" : `${match.members.length}-way chain`}
        right={
          <button
            type="button"
            aria-label="Report"
            onClick={() => setReportOpen((v) => !v)}
            className="grid h-9 w-9 flex-none place-items-center rounded-xl border transition active:scale-95"
            style={{ background: "var(--ts-surface)", borderColor: "var(--ts-border)", color: "var(--ts-muted)" }}
          >
            <Flag className="h-[15px] w-[15px]" />
          </button>
        }
      />

      {reportOpen && (
        <div className="mb-4 animate-ts-card-in rounded-2xl border p-3.5 text-sm" style={{ background: "var(--ts-danger-soft)", borderColor: "var(--ts-danger-border)", color: "var(--ts-text-strong)" }}>
          <p className="mb-2">Report this match to an admin for review?</p>
          <ReportButton matchId={match.id} members={match.members.map((m, i) => ({ id: m.id, label: m.isSelf ? "Myself (mistake)" : `Member ${i + 1}` }))} />
        </div>
      )}

      <RouteCard match={match} />

      <div className="ts-card mb-4">
        <h2 className="text-xs font-bold tracking-[0.5px]" style={{ color: "var(--ts-muted)" }}>ELIGIBILITY</h2>
        <p className="mt-1.5 text-sm" style={{ color: "var(--ts-muted)" }}>
          This match satisfies all hard rules. Both sides&apos; preferred locations cover each other&apos;s current posting.
        </p>
        <ul className="mt-3 space-y-1.5">
          {rules.hardKeys.map((k) => (
            <li key={k} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm" style={{ background: "var(--ts-accent-soft)", color: "var(--ts-accent-strong)" }}>
              <span>✓</span>
              <span className="capitalize">{k.replace("_", " ")} match</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-4 space-y-3">
        {match.members.map((m, i) => (
          <MemberCard
            key={m.id}
            member={m}
            index={i}
            movingTo={[match.members[(i + 1) % match.members.length].current_district, match.members[(i + 1) % match.members.length].current_state].filter(Boolean).join(", ") || "Unknown"}
            consented={match.consents[m.id]}
            coolingOffMonths={rules.coolingOffMonths}
            showSeniority={rules.showSeniority}
          />
        ))}
      </div>

      <div className="mb-4">
        <ConsentPanel
          matchId={match.id}
          selfConsented={match.selfConsented}
          allConsented={match.allConsented}
          consentedCount={consentedCount}
          total={match.members.length}
          onDone={load}
        />
      </div>

      {match.allConsented ? (
        <>
          <div className="ts-card relative mb-4 text-center">
            {justRevealed && (
              <div className="pointer-events-none absolute -inset-2 animate-ts-pop-ring rounded-[28px]" style={{ border: "2px solid var(--ts-accent)" }} />
            )}
            {revealed ? (
              <>
                <p className="mb-3 text-xs font-bold tracking-[0.5px]" style={{ color: "var(--ts-accent-strong)" }}>CONTACT REVEALED</p>
                <div className="flex flex-col gap-2 text-left">
                  {others.map((m) => {
                    const c = contacts[m.id];
                    if (!c) return null;
                    return (
                      <div key={m.id} className="space-y-1.5 rounded-xl p-3" style={{ background: "var(--ts-surface-soft)" }}>
                        <p className="text-xs font-semibold" style={{ color: "var(--ts-text-strong)" }}>{c.full_name ?? labels[m.id]}</p>
                        {c.phone && (
                          <p className="flex items-center gap-1.5 text-sm" style={{ color: "var(--ts-text-strong)" }}>
                            <Phone className="h-3.5 w-3.5 shrink-0" /> {c.phone}
                          </p>
                        )}
                        {c.contact_email && (
                          <p className="flex items-center gap-1.5 break-all text-sm" style={{ color: "var(--ts-text-strong)" }}>
                            <Mail className="h-3.5 w-3.5 shrink-0" /> {c.contact_email}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <p className="mb-4 text-xs font-bold tracking-[0.5px]" style={{ color: "var(--ts-muted)" }}>
                  •••• •••• •• &nbsp;·&nbsp; ••••@••••.gov.in
                </p>
                <HoldToReveal
                  onComplete={() => {
                    setRevealed(true);
                    setJustRevealed(true);
                    setTimeout(() => setJustRevealed(false), 700);
                  }}
                />
              </>
            )}
          </div>

          <div className="mb-4">
            <MessageThread matchId={match.id} selfId={profile.id} labels={labels} />
          </div>

          <div className="ts-card mb-4">
            <h3 className="text-xs font-bold tracking-[0.5px]" style={{ color: "var(--ts-muted)" }}>JOINT APPLICATION</h3>
            <p className="mb-3 mt-1.5 text-sm" style={{ color: "var(--ts-muted)" }}>
              Generate a pre-filled joint mutual-transfer application with everyone&apos;s details. Submit it to your
              competent authority — approval rests entirely with them.
            </p>
            <GenerateAgreementButton matchId={match.id} locked={locked} />
          </div>
        </>
      ) : (
        <div className="ts-card mb-4 text-center" style={{ background: "var(--ts-surface-soft)" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ color: "var(--ts-faint)", margin: "0 auto 10px" }} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          <p className="text-sm leading-relaxed" style={{ color: "var(--ts-muted)" }}>Chat and contact details unlock once every member consents.</p>
        </div>
      )}

      <div className="ts-card space-y-3">
        <h3 className="text-xs font-bold tracking-[0.5px]" style={{ color: "var(--ts-muted)" }}>SAFETY</h3>
        <div className="flex flex-wrap gap-2">
          <CancelMatchButton matchId={match.id} status={match.status} onDone={load} />
          <BlockButton members={others.map((m, i) => ({ id: m.id, label: `Member ${i + 1}` }))} onDone={load} />
        </div>
      </div>
    </div>
  );
}

function RouteCard({ match }: { match: MatchView }) {
  return (
    <div className="ts-card mb-4">
      <div className="mb-4 flex gap-1.5">
        <MatchTypeBadge type={match.type} size={match.members.length} />
        <MatchStatusBadge status={match.status} />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {match.members.map((m, i) => (
          <div key={m.id} className="flex items-center gap-1.5">
            <div className="text-center">
              <div
                className="mx-auto grid h-[46px] w-[46px] place-items-center rounded-2xl border text-sm font-bold"
                style={{ background: "var(--ts-surface)", borderColor: "var(--ts-border)", color: "var(--ts-text-strong)" }}
              >
                {m.isSelf ? "Y" : String(i + 1)}
              </div>
              <p className="mt-1.5 text-[11px] font-semibold" style={{ color: "var(--ts-muted)" }}>{m.isSelf ? "You" : `Member ${i + 1}`}</p>
              <p className="text-[10px]" style={{ color: "var(--ts-faint)" }}>{m.current_district ?? "—"}</p>
            </div>
            {i < match.members.length - 1 && (
              <svg width="22" height="12" viewBox="0 0 20 12" fill="none" aria-hidden>
                <path d="M0 6h16M11 1l5 5-5 5" stroke="var(--ts-border-strong)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MemberCard({
  member,
  index,
  movingTo,
  consented,
  coolingOffMonths,
  showSeniority,
}: {
  member: MatchMemberView;
  index: number;
  movingTo: string;
  consented: boolean;
  coolingOffMonths: number | null;
  showSeniority: boolean;
}) {
  const years = member.joining_date ? yearsSince(member.joining_date) : null;
  const inCoolOff =
    coolingOffMonths != null && member.last_transfer_date ? monthsSince(member.last_transfer_date) < coolingOffMonths : false;

  return (
    <div className="ts-card">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: "var(--ts-text-strong)" }}>{member.isSelf ? "You" : `Member ${index + 1}`}</h3>
        <div className="flex items-center gap-1.5">
          <VerificationBadge status={member.verification_status} />
          {consented ? (
            <span className="ts-badge" style={{ background: "var(--ts-accent-soft)", color: "var(--ts-accent-strong)" }}>Interested</span>
          ) : (
            <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--ts-faint)" }}>
              <span className="h-1.5 w-1.5 animate-ts-dot-pulse rounded-full" style={{ background: "var(--ts-warning)" }} />
              Waiting
            </span>
          )}
        </div>
      </div>

      <dl className="space-y-1 text-sm" style={{ color: "var(--ts-muted)" }}>
        <KV k="Current posting" v={[member.current_district, member.current_state].filter(Boolean).join(", ")} />
        <KV k="Court level" v={member.court_level} />
        <KV k="Cadre" v={member.cadre} />
        <KV k="Designation" v={member.designation} />
        <KV k="Grade pay" v={member.pay_level} />
      </dl>

      <div className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm" style={{ background: "var(--ts-accent-soft)" }}>
        <span style={{ color: "var(--ts-accent-strong)" }} aria-hidden>➜</span>
        <span style={{ color: "var(--ts-muted)" }}>{member.isSelf ? "You move to" : "Moves to"}</span>
        <span className="font-semibold" style={{ color: "var(--ts-text-strong)" }}>{movingTo}</span>
      </div>

      {(showSeniority && years != null) || inCoolOff || member.disciplinary_pending ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {showSeniority && years != null && (
            <span className="ts-badge" style={{ background: "var(--ts-surface)", color: "var(--ts-muted)" }}>~{years} yrs service</span>
          )}
          {inCoolOff && <span className="ts-badge" style={{ background: "var(--ts-warning-soft)", color: "var(--ts-warning-strong)" }}>Within cooling-off</span>}
          {member.disciplinary_pending && (
            <span className="ts-badge" style={{ background: "var(--ts-danger-soft)", color: "var(--ts-danger)" }}>Disciplinary pending</span>
          )}
        </div>
      ) : null}
    </div>
  );
}

function KV({ k, v }: { k: string; v: string | null }) {
  return (
    <div className="flex justify-between gap-2">
      <dt style={{ color: "var(--ts-faint)" }}>{k}</dt>
      <dd className="text-right" style={{ color: "var(--ts-text-strong)" }}>{v || "—"}</dd>
    </div>
  );
}

function yearsSince(date: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / (365.25 * 24 * 3600 * 1000)));
}
function monthsSince(date: string): number {
  return (Date.now() - new Date(date).getTime()) / (30.44 * 24 * 3600 * 1000);
}
