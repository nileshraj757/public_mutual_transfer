// Shared domain types. Kept framework-agnostic so the matching engine can be
// unit-tested without Next.js or Supabase.

export type VerificationStatus = "pending" | "verified" | "rejected";
export type MatchType = "direct" | "chain";
export type MatchStatus =
  | "suggested"
  | "both_interested"
  | "contact_shared"
  | "agreement_generated"
  | "completed"
  | "cancelled";
export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";
export type SubscriptionStatus =
  | "created"
  | "authenticated"
  | "active"
  | "pending"
  | "halted"
  | "cancelled"
  | "completed"
  | "expired"
  | "paused";

export interface Subscription {
  id: string;
  profile_id: string;
  razorpay_subscription_id: string | null;
  razorpay_customer_id: string | null;
  plan_id: string | null;
  status: SubscriptionStatus;
  short_url: string | null;
  current_start: string | null;
  current_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  employee_id_hash: string | null;
  employee_id_masked: string | null;
  cadre: string | null;
  designation: string | null;
  pay_level: string | null;
  current_state: string | null;
  current_district: string | null;
  current_office: string | null;
  joining_date: string | null;
  last_transfer_date: string | null;
  disciplinary_pending: boolean;
  verification_status: VerificationStatus;
  contact_email: string | null;
  phone: string | null;
  is_admin: boolean;
  is_active: boolean;
  consent_dpdp: boolean;
  created_at: string;
  updated_at: string;
}

export interface Preference {
  id: string;
  profile_id: string;
  preferred_state: string;
  preferred_district: string;
  rank: number;
  created_at: string;
}

export interface RuleConfig {
  id: string;
  key: string;
  label: string;
  value: string | null;
  is_hard_constraint: boolean;
  active: boolean;
}

export interface MatchRow {
  id: string;
  type: MatchType;
  member_profile_ids: string[];
  signature: string;
  status: MatchStatus;
  created_at: string;
  updated_at: string;
}

export interface MatchConsent {
  match_id: string;
  profile_id: string;
  consented: boolean;
  consented_at: string | null;
}

export interface Message {
  id: string;
  match_id: string;
  sender_profile_id: string;
  body: string;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  profile_id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface BrowseProfile {
  profile_id: string;
  cadre: string | null;
  designation: string | null;
  pay_level: string | null;
  current_state: string | null;
  current_district: string | null;
  verification_status: VerificationStatus;
  preferred: { state: string; district: string; rank: number }[];
}

// ── Matching engine I/O ───────────────────────────────────────────────────────

/** Compact shape the matching engine operates on (a slice of Profile + prefs). */
export interface MatchCandidate {
  id: string;
  cadre: string | null;
  designation: string | null;
  pay_level: string | null;
  current_state: string | null;
  current_district: string | null;
  /** Ordered preferred (state, district) locations. */
  preferences: { state: string; district: string }[];
  is_active: boolean;
}

/** A discovered match (direct = 2 ids, chain = N ids in cycle order). */
export interface DiscoveredMatch {
  type: MatchType;
  memberIds: string[];
  signature: string;
}
