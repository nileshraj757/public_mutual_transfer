import type { MatchStatus, VerificationStatus } from "@/lib/types";
import { Shield, CheckCircle } from "./icons";

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const map: Record<VerificationStatus, string> = {
    verified: "bg-green-100 text-green-800",
    pending: "bg-amber-100 text-amber-800",
    rejected: "bg-red-100 text-red-800",
  };
  const label: Record<VerificationStatus, string> = {
    verified: "Verified",
    pending: "Unverified",
    rejected: "Rejected",
  };
  return (
    <span className={`badge ${map[status]}`}>
      <Shield className="h-3 w-3" />
      {label[status]}
    </span>
  );
}

export function MatchStatusBadge({ status }: { status: MatchStatus }) {
  const map: Record<MatchStatus, string> = {
    suggested: "bg-sand-100 text-sand-700",
    both_interested: "bg-blue-100 text-blue-800",
    contact_shared: "bg-indigo-100 text-indigo-800",
    agreement_generated: "bg-violet-100 text-violet-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };
  const label: Record<MatchStatus, string> = {
    suggested: "Suggested",
    both_interested: "Both interested",
    contact_shared: "Contact shared",
    agreement_generated: "Agreement ready",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return (
    <span className={`badge ${map[status]}`}>
      {status === "completed" && <CheckCircle className="h-3 w-3" />}
      {label[status]}
    </span>
  );
}

export function MatchTypeBadge({ type, size }: { type: "direct" | "chain"; size: number }) {
  return (
    <span className={`badge ${type === "direct" ? "bg-brand-100 text-brand-800" : "bg-fuchsia-100 text-fuchsia-800"}`}>
      {type === "direct" ? "Direct swap" : `${size}-way chain`}
    </span>
  );
}
