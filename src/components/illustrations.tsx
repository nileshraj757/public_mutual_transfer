/** Small hand-built SVG illustrations — keeps the app free of stock art. */

export function HeroSwap({ className = "w-full h-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 300" className={className} role="img" aria-label="Two postings swapping places">
      <ellipse cx="240" cy="168" rx="205" ry="112" fill="#E9F1EA" />
      <g opacity="0.5">
        <path d="M70 220 h340" stroke="#CFDDD2" strokeWidth="1.5" />
        <path d="M100 245 h280" stroke="#CFDDD2" strokeWidth="1.5" />
      </g>

      {/* animated swap arcs: green (A→B) up top, amber (B→A) along the bottom */}
      <path d="M150 118 Q240 34 330 118" stroke="#146152" strokeWidth="3" strokeDasharray="3 11" strokeLinecap="round" fill="none" className="animate-mt-dash" />
      <path d="M150 182 Q240 262 330 182" stroke="#F0A63C" strokeWidth="3" strokeDasharray="3 11" strokeLinecap="round" fill="none" className="animate-mt-dash" />
      <path d="M316 104 l17 11 -13 15" stroke="#146152" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M164 196 l-17 -11 13 -15" stroke="#D98E1B" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      {/* posting A (green) */}
      <g className="animate-mt-float">
        <circle cx="96" cy="150" r="54" fill="#FFFFFF" stroke="#DCE8DE" strokeWidth="2" />
        <path d="M96 120a25 25 0 0 1 25 25c0 16-25 41-25 41s-25-25-25-41a25 25 0 0 1 25-25Z" fill="#146152" />
        <circle cx="96" cy="144" r="8.5" fill="#FAF7F0" />
        <rect x="66" y="210" width="60" height="22" rx="11" fill="#FFFFFF" stroke="#DCE8DE" />
        <text x="96" y="225" textAnchor="middle" fontFamily="var(--font-sans), sans-serif" fontSize="12" fontWeight="600" fill="#146152">Patna</text>
      </g>

      {/* posting B (amber) */}
      <g className="animate-mt-float" style={{ animationDelay: "1.2s" }}>
        <circle cx="384" cy="150" r="54" fill="#FFFFFF" stroke="#F4E3C4" strokeWidth="2" />
        <path d="M384 120a25 25 0 0 1 25 25c0 16-25 41-25 41s-25-25-25-41a25 25 0 0 1 25-25Z" fill="#F0A63C" />
        <circle cx="384" cy="144" r="8.5" fill="#FFFFFF" />
        <rect x="348" y="210" width="72" height="22" rx="11" fill="#FFFFFF" stroke="#F4E3C4" />
        <text x="384" y="225" textAnchor="middle" fontFamily="var(--font-sans), sans-serif" fontSize="12" fontWeight="600" fill="#B77716">Lucknow</text>
      </g>

      {/* sparkle accents */}
      <path d="M240 262c.5 3 2 4.5 5 5-3 .5-4.5 2-5 5-.5-3-2-4.5-5-5 3-.5 4.5-2 5-5Z" fill="#146152" />
      <path d="M430 62c.4 2.4 1.6 3.6 4 4-2.4.4-3.6 1.6-4 4-.4-2.4-1.6-3.6-4-4 2.4-.4 3.6-1.6 4-4Z" fill="#F0A63C" />
      <path d="M52 70c.4 2.4 1.6 3.6 4 4-2.4.4-3.6 1.6-4 4-.4-2.4-1.6-3.6-4-4 2.4-.4 3.6-1.6 4-4Z" fill="#F0A63C" />
    </svg>
  );
}

/** Friendly empty-state glyph — a dashed circle with a small compass/pin. */
export function EmptyState({ className = "h-16 w-16" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <circle cx="32" cy="32" r="26" fill="none" stroke="#E7E0D3" strokeWidth="2.5" strokeDasharray="1 8" strokeLinecap="round" />
      <path d="M32 20a10 10 0 0 1 10 10c0 6.5-10 16-10 16s-10-9.5-10-16a10 10 0 0 1 10-10Z" fill="#E3F0EA" stroke="#9DC3B2" strokeWidth="1.5" />
      <circle cx="32" cy="30" r="3.5" fill="#146152" />
    </svg>
  );
}

/** Envelope + sparkle spot used on the sign-in screen. */
export function MailSpot({ className = "h-24 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 96" className={className} aria-hidden>
      <ellipse cx="60" cy="52" rx="52" ry="34" fill="#E9F1EA" />
      <rect x="30" y="30" width="60" height="42" rx="9" fill="#FFFFFF" stroke="#BFD8CB" strokeWidth="2" />
      <path d="M33 35l27 20 27-20" stroke="#146152" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="90" cy="30" r="11" fill="#F0A63C" />
      <path d="M85.5 30l3.2 3.2 5.8-6" stroke="#FFFFFF" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 20c.4 2.4 1.6 3.6 4 4-2.4.4-3.6 1.6-4 4-.4-2.4-1.6-3.6-4-4 2.4-.4 3.6-1.6 4-4Z" fill="#F0A63C" />
      <path d="M104 74c.35 2 1.35 3 3.35 3.35-2 .35-3 1.35-3.35 3.35-.35-2-1.35-3-3.35-3.35 2-.35 3-1.35 3.35-3.35Z" fill="#146152" />
    </svg>
  );
}
