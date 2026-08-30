import Link from "next/link";
import { Sparkle } from "@/components/icons";

interface PremiumTeaserProps {
  /** e.g. "3 matches waiting" — the hook that creates FOMO. */
  headline: string;
  blurb: string;
  /** Real content, rendered blurred/dimmed underneath the CTA card. */
  children?: React.ReactNode;
}

/**
 * Wraps a page's real content in a subtle blur with a "Subscribe to unlock"
 * card on top — used for the Matches/Chats/Alerts paywall so the app still
 * feels alive (you can see *something* is there) instead of a dead end.
 */
export function PremiumTeaser({ headline, blurb, children }: PremiumTeaserProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl">
      {children && (
        <div className="pointer-events-none select-none blur-sm" aria-hidden>
          {children}
        </div>
      )}
      <div
        className={
          children
            ? "absolute inset-0 flex items-center justify-center p-4"
            : "flex items-center justify-center p-8"
        }
        style={children ? { background: "color-mix(in srgb, var(--ts-bg-outer, #f3f1e9) 70%, transparent)" } : undefined}
      >
        <div className="ts-card max-w-sm text-center" style={{ borderColor: "var(--ts-warning-border)" }}>
          <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full" style={{ background: "var(--ts-warning-soft)", color: "var(--ts-warning-strong)" }}>
            <Sparkle className="h-5 w-5" />
          </div>
          <p className="font-display text-lg font-bold" style={{ color: "var(--ts-text-strong)" }}>{headline}</p>
          <p className="mt-1.5 text-sm" style={{ color: "var(--ts-muted)" }}>{blurb}</p>
          <Link href="/billing" className="ts-btn-primary mt-4 w-full">
            Subscribe to unlock
          </Link>
        </div>
      </div>
    </div>
  );
}
