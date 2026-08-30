import type { SVGProps } from "react";

/**
 * Minimal hand-drawn icon set for the app — stroke-based, rounded caps, 1.75px
 * weight, sized via the consumer's className (defaults to 1em so icons scale
 * with surrounding text). Keeps the app free of an icon-font/library dependency.
 */
type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

/** The app's mark: two arrows chasing each other in a loop — a swap/exchange. */
export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect width="40" height="40" rx="12" fill="#146152" />
      <path
        d="M11 16.5h13.5M21 12l4.5 4.5-4.5 4.5"
        stroke="#FAF7F0"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M29 23.5H15.5M19 28l-4.5-4.5L19 19"
        stroke="#F0A63C"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function Menu(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function XIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function Bell(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 10a6 6 0 1 1 12 0c0 3.2 1 5 1.6 5.8a.6.6 0 0 1-.5 1H4.9a.6.6 0 0 1-.5-1C5 15 6 13.2 6 10Z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function ChevronUp(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 15l6-6 6 6" />
    </svg>
  );
}

export function ChevronDown(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function ChevronRight(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function Mail(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
      <path d="M4.5 7l7.5 6 7.5-6" />
    </svg>
  );
}

export function Phone(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 4h3l1.5 4L8.5 9.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4 6.2 2 2 0 0 1 6 4Z" />
    </svg>
  );
}

export function Shield(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.5 5 6v5.5c0 4.5 3 7.7 7 9 4-1.3 7-4.5 7-9V6l-7-2.5Z" />
      <path d="M9 12l2 2 4-4.5" />
    </svg>
  );
}

export function MapPin(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 21s7-6.1 7-11.5a7 7 0 1 0-14 0C5 14.9 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.25" />
    </svg>
  );
}

export function ArrowRight(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 12h16M14 6l6 6-6 6" />
    </svg>
  );
}

export function ArrowUpRight(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}

export function Check(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 13l4.5 4.5L19 7" />
    </svg>
  );
}

export function CheckCircle(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.3l2.4 2.4L15.7 9" />
    </svg>
  );
}

export function Users(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19.5c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5" />
      <path d="M16 8.7a2.7 2.7 0 1 1 0-5.2" />
      <path d="M15 14.3c2.5.3 4.5 2.3 4.5 5.2" />
    </svg>
  );
}

export function Calendar(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="5.5" width="16" height="15" rx="2.5" />
      <path d="M4 10h16M8 3.5v3M16 3.5v3" />
    </svg>
  );
}

export function Settings(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2M12 18.5v2M20.5 12h-2M5.5 12h-2M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4M17.7 17.7l-1.4-1.4M7.7 7.7 6.3 6.3" />
    </svg>
  );
}

export function LogOut(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

export function Sparkle(props: IconProps) {
  return (
    <svg {...base(props)} fill="currentColor" stroke="none">
      <path d="M12 2c.6 3.6 2.4 5.4 6 6-3.6.6-5.4 2.4-6 6-.6-3.6-2.4-5.4-6-6 3.6-.6 5.4-2.4 6-6Z" />
      <path d="M19 15c.3 1.5 1 2.2 2.5 2.5-1.5.3-2.2 1-2.5 2.5-.3-1.5-1-2.2-2.5-2.5 1.5-.3 2.2-1 2.5-2.5Z" />
    </svg>
  );
}

export function Loader(props: IconProps) {
  return (
    <svg {...base(props)} className={`animate-spin ${props.className ?? ""}`}>
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}

export function Trash(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-9 0 1 12.5A2 2 0 0 0 9 21h6a2 2 0 0 0 2-1.5L18 7" />
    </svg>
  );
}

export function Flag(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 21V4" />
      <path d="M6 4.5c2-1.3 4-1.3 6 0s4 1.3 6 0v9c-2 1.3-4 1.3-6 0s-4-1.3-6 0Z" />
    </svg>
  );
}

export function Home(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 9.5V20h12V9.5" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

export function Search(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </svg>
  );
}

export function Send(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4.5 12 20 4l-4 16-4.5-6.5L4.5 12Z" />
      <path d="M11.5 13.5 20 4" />
    </svg>
  );
}

export function Plus(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function BarChart(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" />
    </svg>
  );
}

export function Download(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 4v12M7 11l5 5 5-5M5 20h14" />
    </svg>
  );
}

export function Chat(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function Refresh(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

export function Star(props: IconProps) {
  return (
    <svg {...base(props)} fill="currentColor" stroke="none">
      <path d="M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-3-5.3 3 1.1-6L3.4 9.4l6-.8L12 3Z" />
    </svg>
  );
}
