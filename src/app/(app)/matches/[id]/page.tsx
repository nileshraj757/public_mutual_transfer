import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMatchById, type MatchMemberView } from "@/lib/matches";
import { isPremiumLocked } from "@/lib/billing";
import { parseRules } from "@/lib/matching/rules";
import type { RuleConfig } from "@/lib/types";
import { MatchStatusBadge, MatchTypeBadge, VerificationBadge } from "@/components/badges";
import { SwapRoute } from "@/components/swap-route";
import { ConsentPanel } from "@/components/consent-panel";
import { MessageThread } from "@/components/message-thread";
import { GenerateAgreementButton, ReportButton } from "@/components/agreement-and-report";

export const metadata = { title: "Match details — Mutual Transfer" };

interface RevealedContact {
  profile_id: string;
  full_name: string | null;
  contact_email: string | null;
  phone: string | null;
  current_office: string | null;
}

export default async function MatchDetailPage({ params }: { params: { id: string } }) {
  const profile = await requireProfile(`/matches/${params.id}`);
  const match = await getMatchById(profile.id, params.id);
  if (!match) notFound();

  const supabase = createClient();
  const { data: rulesRows } = await supabase.from("rules_config").select("*");
  const rules = parseRules((rulesRows ?? []) as RuleConfig[]);

  // Contact reveal is gated server-side by the reveal_contact() RPC.
  let contacts: Record<string, RevealedContact> = {};
  if (match.allConsented) {
    const { data } = await supabase.rpc("reveal_contact", { p_match_id: match.id });
    contacts = Object.fromEntries(((data ?? []) as RevealedContact[]).map((c) => [c.profile_id, c]));
  }

  const premiumLocked = match.allConsented ? await isPremiumLocked(profile.id) : false;

  const consentedCount = Object.values(match.consents).filter(Boolean).length;
  const labels: Record<string, string> = {};
  match.members.forEach((m, i) => (labels[m.id] = m.isSelf ? "You" : `Member ${i + 1}`));

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="text-sm text-brand-700 hover:underline">← Back to matches</Link>

      <div className="card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MatchTypeBadge type={match.type} size={match.members.length} />
            <MatchStatusBadge status={match.status} />
          </div>
          <span className="text-xs text-slate-400">Created {new Date(match.created_at).toLocaleDateString("en-IN")}</span>
        </div>
        <SwapRoute members={match.members} type={match.type} />
      </div>

      {/* Eligibility */}
      <div className="card">
        <h2 className="font-semibold text-slate-900">Eligibility</h2>
        <p className="mt-1 text-sm text-slate-600">
          This match satisfies all hard rules. Both sides&apos; preferred locations cover each other&apos;s current
          posting.
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {rules.hardKeys.map((k) => (
            <li key={k} className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
              <span>✓</span>
              <span className="capitalize">{k.replace("_", " ")} match</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          Soft factors below are shown for your judgement only — they do not block the match.
        </p>
      </div>

      {/* Members */}
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
              coolingOffMonths={rules.coolingOffMonths}
              showSeniority={rules.showSeniority}
            />
          );
        })}
      </div>

      {/* Consent gate */}
      <ConsentPanel
        matchId={match.id}
        selfConsented={match.selfConsented}
        allConsented={match.allConsented}
        consentedCount={consentedCount}
        total={match.members.length}
      />

      {/* Post-consent: messaging + agreement */}
      {match.allConsented && (
        <>
          <MessageThread matchId={match.id} selfId={profile.id} labels={labels} />
          <div className="card">
            <h3 className="font-semibold text-slate-900">Joint application</h3>
            <p className="mb-3 mt-1 text-sm text-slate-600">
              Generate a pre-filled joint mutual-transfer application with everyone&apos;s details. Submit it to your
              competent authority — approval rests entirely with them.
            </p>
            <GenerateAgreementButton matchId={match.id} locked={premiumLocked} />
          </div>
        </>
      )}

      <ReportButton matchId={match.id} members={match.members.map((m, i) => ({ id: m.id, label: m.isSelf ? "Myself (mistake)" : `Member ${i + 1}` }))} />
    </div>
  );
}

function MemberCard({
  member,
  index,
  movingTo,
  consented,
  contact,
  coolingOffMonths,
  showSeniority,
}: {
  member: MatchMemberView;
  index: number;
  movingTo: string;
  consented: boolean;
  contact?: RevealedContact;
  coolingOffMonths: number | null;
  showSeniority: boolean;
}) {
  const years = member.joining_date ? yearsSince(member.joining_date) : null;
  const inCoolOff =
    coolingOffMonths != null && member.last_transfer_date
      ? monthsSince(member.last_transfer_date) < coolingOffMonths
      : false;

  return (
    <div className="card">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">{member.isSelf ? "You" : `Member ${index + 1}`}</h3>
        <div className="flex items-center gap-2">
          <VerificationBadge status={member.verification_status} />
          {consented ? (
            <span className="badge bg-blue-100 text-blue-800">Interested</span>
          ) : (
            <span className="badge bg-slate-100 text-slate-600">No response</span>
          )}
        </div>
      </div>

      <dl className="space-y-1 text-sm text-slate-600">
        <KV k="Current posting" v={[member.current_district, member.current_state].filter(Boolean).join(", ")} />
        <KV k="Designation" v={member.designation} />
        <KV k="Pay level" v={member.pay_level} />
      </dl>

      <div className="mt-3 flex items-center gap-2 rounded-md bg-brand-50 px-3 py-2 text-sm">
        <span className="text-brand-600" aria-hidden>➜</span>
        <span className="text-slate-600">{member.isSelf ? "You move to" : "Moves to"}</span>
        <span className="font-semibold text-slate-900">{movingTo}</span>
      </div>

      {/* Soft factors */}
      <div className="mt-3 flex flex-wrap gap-1">
        {showSeniority && years != null && (
          <span className="badge bg-slate-100 text-slate-600">~{years} yrs service</span>
        )}
        {inCoolOff && <span className="badge bg-amber-100 text-amber-800">Within cooling-off</span>}
        {member.disciplinary_pending && <span className="badge bg-red-100 text-red-800">Disciplinary pending</span>}
      </div>

      {/* Revealed contact (only after everyone consents) */}
      {contact && !member.isSelf && (
        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
          <p className="font-medium text-green-900">{contact.full_name ?? "Contact"}</p>
          {contact.current_office && <p className="text-green-800">{contact.current_office}</p>}
          {contact.contact_email && (
            <p className="text-green-800">✉ <a className="underline" href={`mailto:${contact.contact_email}`}>{contact.contact_email}</a></p>
          )}
          {contact.phone && <p className="text-green-800">☎ {contact.phone}</p>}
        </div>
      )}
    </div>
  );
}

function KV({ k, v }: { k: string; v: string | null }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-slate-400">{k}</dt>
      <dd className="text-right text-slate-700">{v || "—"}</dd>
    </div>
  );
}

function yearsSince(date: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / (365.25 * 24 * 3600 * 1000)));
}
function monthsSince(date: string): number {
  return (Date.now() - new Date(date).getTime()) / (30.44 * 24 * 3600 * 1000);
}
