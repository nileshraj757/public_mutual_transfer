import type { SupabaseClient } from "@supabase/supabase-js";
import type { MatchRow, MatchStatus } from "@/lib/types";

export interface MatchMemberView {
  id: string;
  court_level: string | null;
  cadre: string | null;
  designation: string | null;
  pay_level: string | null;
  current_state: string | null;
  current_district: string | null;
  current_office: string | null;
  verification_status: "pending" | "verified" | "rejected";
  disciplinary_pending: boolean;
  last_transfer_date: string | null;
  joining_date: string | null;
  preferred: { state: string; district: string; rank: number }[];
  isSelf: boolean;
}

export interface MatchView {
  id: string;
  type: "direct" | "chain";
  status: MatchStatus;
  created_at: string;
  /** Members ordered by the stored cycle order. */
  members: MatchMemberView[];
  /** Consent rows keyed by profile id. */
  consents: Record<string, boolean>;
  allConsented: boolean;
  selfConsented: boolean;
}

interface MemberProfileRow {
  id: string;
  court_level: string | null;
  cadre: string | null;
  designation: string | null;
  pay_level: string | null;
  current_state: string | null;
  current_district: string | null;
  current_office: string | null;
  verification_status: MatchMemberView["verification_status"];
  disciplinary_pending: boolean;
  last_transfer_date: string | null;
  joining_date: string | null;
}
interface MemberPrefRow {
  profile_id: string;
  preferred_state: string;
  preferred_district: string;
  rank: number;
}

/**
 * Build enriched match views for a user. Match rows are read with the user's RLS
 * (so only their matches return). Member display data is anonymized — name,
 * email and phone are never included here; those come only from reveal_contact().
 *
 * Pass the caller's Supabase client: the web app passes its cookie-bound server
 * client, the mobile app passes the browser (anon + RLS) client. Anonymized
 * co-member attributes come from the get_match_member_views() SECURITY DEFINER
 * RPC, so neither path needs the service-role key.
 */
export async function getUserMatches(
  supabase: SupabaseClient,
  userId: string
): Promise<MatchView[]> {
  const { data: rows } = await supabase
    .from("matches")
    .select("*")
    .contains("member_profile_ids", [userId])
    .order("created_at", { ascending: false });

  const matches = (rows ?? []) as MatchRow[];
  if (!matches.length) return [];

  // Anonymized member data (safe columns only) via the RLS-safe RPC, plus this
  // user's consent rows (readable under RLS).
  const [{ data: memberViews }, { data: consents }] = await Promise.all([
    supabase.rpc("get_match_member_views"),
    supabase
      .from("match_consents")
      .select("match_id, profile_id, consented")
      .in(
        "match_id",
        matches.map((m) => m.id)
      ),
  ]);

  const views = (memberViews ?? {}) as {
    profiles?: MemberProfileRow[];
    preferences?: MemberPrefRow[];
  };
  const profiles = views.profiles ?? [];
  const prefs = views.preferences ?? [];

  const prefByProfile = new Map<string, { state: string; district: string; rank: number }[]>();
  for (const p of prefs ?? []) {
    const list = prefByProfile.get(p.profile_id) ?? [];
    list.push({ state: p.preferred_state, district: p.preferred_district, rank: p.rank });
    prefByProfile.set(p.profile_id, list);
  }
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const consentByMatch = new Map<string, Map<string, boolean>>();
  for (const c of consents ?? []) {
    const m = consentByMatch.get(c.match_id) ?? new Map();
    m.set(c.profile_id, c.consented);
    consentByMatch.set(c.match_id, m);
  }

  return matches.map((m) => {
    const cmap = consentByMatch.get(m.id) ?? new Map<string, boolean>();
    const members: MatchMemberView[] = m.member_profile_ids.map((id) => {
      const p = profileById.get(id);
      return {
        id,
        court_level: p?.court_level ?? null,
        cadre: p?.cadre ?? null,
        designation: p?.designation ?? null,
        pay_level: p?.pay_level ?? null,
        current_state: p?.current_state ?? null,
        current_district: p?.current_district ?? null,
        current_office: p?.current_office ?? null,
        verification_status: (p?.verification_status ?? "pending") as MatchMemberView["verification_status"],
        disciplinary_pending: p?.disciplinary_pending ?? false,
        last_transfer_date: p?.last_transfer_date ?? null,
        joining_date: p?.joining_date ?? null,
        preferred: (prefByProfile.get(id) ?? []).sort((a, b) => a.rank - b.rank),
        isSelf: id === userId,
      };
    });

    const consentsObj: Record<string, boolean> = {};
    for (const id of m.member_profile_ids) consentsObj[id] = cmap.get(id) ?? false;
    const allConsented = m.member_profile_ids.every((id) => consentsObj[id]);

    return {
      id: m.id,
      type: m.type,
      status: m.status,
      created_at: m.created_at,
      members,
      consents: consentsObj,
      allConsented,
      selfConsented: consentsObj[userId] ?? false,
    };
  });
}

export async function getMatchById(
  supabase: SupabaseClient,
  userId: string,
  matchId: string
): Promise<MatchView | null> {
  const all = await getUserMatches(supabase, userId);
  return all.find((m) => m.id === matchId) ?? null;
}
