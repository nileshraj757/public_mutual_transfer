import type { MatchStatus, VerificationStatus } from "@/lib/types";
import { Shield, CheckCircle } from "./icons";

const tsToneStyle: Record<"accent" | "warning" | "danger" | "neutral", React.CSSProperties> = {
  accent: { background: "var(--ts-accent-soft)", color: "var(--ts-accent-strong)" },
  warning: { background: "var(--ts-warning-soft)", color: "var(--ts-warning-strong)" },
  danger: { background: "var(--ts-danger-soft)", color: "var(--ts-danger)" },
  neutral: { background: "var(--ts-surface)", color: "var(--ts-muted)" },
};

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const tone: Record<VerificationStatus, keyof typeof tsToneStyle> = {
    verified: "accent",
    pending: "warning",
    rejected: "danger",
  };
  const label: Record<VerificationStatus, string> = {
    verified: "Verified",
    pending: "Unverified",
    rejected: "Rejected",
  };
  return (
    <span className="ts-badge" style={tsToneStyle[tone[status]]}>
      <Shield className="h-3 w-3" />
      {label[status]}
    </span>
  );
}

export function MatchStatusBadge({ status }: { status: MatchStatus }) {
  const tone: Record<MatchStatus, keyof typeof tsToneStyle> = {
    suggested: "neutral",
    both_interested: "accent",
    contact_shared: "accent",
    agreement_generated: "warning",
    completed: "accent",
    cancelled: "danger",
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
    <span className="ts-badge" style={tsToneStyle[tone[status]]}>
      {status === "completed" && <CheckCircle className="h-3 w-3" />}
      {label[status]}
    </span>
  );
}

export function MatchTypeBadge({ type, size }: { type: "direct" | "chain"; size: number }) {
  return (
    <span className="ts-badge" style={tsToneStyle[type === "direct" ? "accent" : "warning"]}>
      {type === "direct" ? "Direct swap" : `${size}-way chain`}
    </span>
  );
}
