"use client";

import { useEffect, useState } from "react";

/**
 * Animated launch splash for Transfer Setu.
 *
 * Shows a full-screen brand-green overlay on app open: two postings (A↔B) swap
 * places, their paths trace the two crossing arrows of the app mark, which locks
 * up with the wordmark — then the overlay fades out to reveal the app.
 *
 * Dependency-free (pure CSS + inline SVG). Reuses the app's --font-display /
 * --font-sans. No-op-friendly: unmounts itself when done, respects
 * prefers-reduced-motion, and plays at most once per session.
 *
 * On native (Capacitor) the OS splash (green #146152) shows first; when
 * NativeBridge calls SplashScreen.hide() this overlay is already mounted
 * underneath with the same green background, so the handoff is seamless.
 * Consider shortening `launchShowDuration` in capacitor.config.ts to ~500.
 */

const TOTAL_MS = 3500; // full sequence incl. fade-out
const SESSION_KEY = "ts_splash_played";

export function LaunchSplash() {
  const [phase, setPhase] = useState<"hidden" | "playing" | "gone">("hidden");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return; // already played this session
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* private mode — just play */
    }
    setPhase("playing");
    const t = setTimeout(() => setPhase("gone"), TOTAL_MS);
    return () => clearTimeout(t);
  }, []);

  if (phase !== "playing") return null;

  const W = "#FAF7F0"; // warm white arrow
  const A = "#F0A63C"; // amber arrow
  const SW = 33;

  return (
    <div aria-hidden className="ts-splash">
      <style>{CSS}</style>

      <div className="ts-mark">
        <svg viewBox="0 0 512 512" width="100%" height="100%" style={{ overflow: "visible" }}>
          {/* dashed connector between the two postings */}
          <line
            className="ts-connector"
            x1={141} y1={211} x2={371} y2={301}
            stroke="rgba(250,247,240,0.42)" strokeWidth={5} strokeLinecap="round"
            strokeDasharray="2 22"
          />

          {/* pulse rings on the two postings */}
          <circle className="ts-ring ts-ring-w" cx={141} cy={211} r={20} fill="none" stroke={W} strokeWidth={3} />
          <circle className="ts-ring ts-ring-a" cx={371} cy={301} r={20} fill="none" stroke={A} strokeWidth={3} />

          {/* shafts (draw during the swap) */}
          <path className="ts-shaft ts-shaft-w" d="M141 211 H314" fill="none" stroke={W} strokeWidth={SW} strokeLinecap="round" />
          <path className="ts-shaft ts-shaft-a" d="M371 301 H198" fill="none" stroke={A} strokeWidth={SW} strokeLinecap="round" />

          {/* arrowheads (settle in) */}
          <path className="ts-head ts-head-w" d="M269 154 L327 212 L269 270" fill="none" stroke={W} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
          <path className="ts-head ts-head-a" d="M243 358 L185 300 L243 242" fill="none" stroke={A} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />

          {/* traveling dots (the two people) */}
          <circle className="ts-dot ts-dot-w" cx={141} cy={211} r={15} fill={W} />
          <circle className="ts-dot ts-dot-a" cx={371} cy={301} r={15} fill={A} />
        </svg>
      </div>

      <div className="ts-word">Transfer Setu</div>
      <div className="ts-tag">Find your posting swap</div>
    </div>
  );
}

const CSS = `
.ts-splash{
  position:fixed; inset:0; z-index:9999;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  background:radial-gradient(125% 95% at 50% 40%, #1C7862 0%, #146152 46%, #0F4E42 100%);
  animation:ts-out .45s ease-in forwards; animation-delay:3.0s;
  will-change:opacity;
  -webkit-user-select:none; user-select:none; pointer-events:none;
}
.ts-mark{ width:min(46vw,230px); aspect-ratio:1; }

/* dots pop in, then travel to the arrow tips */
.ts-dot{ transform-box:fill-box; transform-origin:center;
  animation:ts-pop .5s cubic-bezier(.16,1,.3,1) both, ts-dotfade .25s ease-in forwards 1.85s; }
.ts-dot-w{ animation-name:ts-pop, ts-travel-w, ts-dotfade;
  animation-duration:.5s,.9s,.25s; animation-delay:.15s,.9s,1.85s;
  animation-timing-function:cubic-bezier(.16,1,.3,1),cubic-bezier(.65,0,.35,1),ease-in;
  animation-fill-mode:both,both,forwards; }
.ts-dot-a{ animation-name:ts-pop, ts-travel-a, ts-dotfade;
  animation-duration:.5s,.9s,.25s; animation-delay:.3s,.9s,1.85s;
  animation-timing-function:cubic-bezier(.16,1,.3,1),cubic-bezier(.65,0,.35,1),ease-in;
  animation-fill-mode:both,both,forwards; }

/* shafts draw left→right (white) / right→left (amber) during the swap */
.ts-shaft{ stroke-dasharray:180; stroke-dashoffset:180; }
.ts-shaft-w{ animation:ts-draw .9s cubic-bezier(.65,0,.35,1) forwards .9s; }
.ts-shaft-a{ animation:ts-draw .9s cubic-bezier(.65,0,.35,1) forwards .9s; }

/* heads scale in at the tips */
.ts-head{ opacity:0; transform-box:fill-box; }
.ts-head-w{ transform-origin:right center; animation:ts-headin .4s cubic-bezier(.16,1,.3,1) forwards 1.7s; }
.ts-head-a{ transform-origin:left center;  animation:ts-headin .4s cubic-bezier(.16,1,.3,1) forwards 1.7s; }

/* posting adornments fade out once the swap starts */
.ts-connector{ opacity:0; animation:ts-conn 3s linear forwards 0s; }
.ts-ring{ opacity:0; }
.ts-ring-w{ animation:ts-pulse 1.1s ease-out 2, ts-ringfade .3s ease-in forwards .9s; }
.ts-ring-a{ animation:ts-pulse 1.1s ease-out 2 .3s, ts-ringfade .3s ease-in forwards .9s; }

.ts-word{
  margin-top:6.5vh; font-family:var(--font-display),"Sora",system-ui,sans-serif;
  font-weight:800; font-size:clamp(30px,8vw,46px); letter-spacing:-.025em; color:#FAF7F0;
  opacity:0; animation:ts-rise .55s cubic-bezier(.16,1,.3,1) forwards 2.15s;
}
.ts-tag{
  margin-top:1.6vh; font-family:var(--font-sans),"Instrument Sans",system-ui,sans-serif;
  font-weight:500; font-size:clamp(15px,4.2vw,19px); color:rgba(231,224,211,.74);
  opacity:0; animation:ts-rise .55s cubic-bezier(.16,1,.3,1) forwards 2.4s;
}

@keyframes ts-pop{ from{transform:scale(0);opacity:0} to{transform:scale(1);opacity:1} }
@keyframes ts-travel-w{ from{transform:translateX(0)} to{transform:translateX(186px)} }
@keyframes ts-travel-a{ from{transform:translateX(0)} to{transform:translateX(-186px)} }
@keyframes ts-dotfade{ to{opacity:0} }
@keyframes ts-draw{ to{stroke-dashoffset:0} }
@keyframes ts-headin{ from{opacity:0;transform:scale(.4)} to{opacity:1;transform:scale(1)} }
@keyframes ts-conn{ 0%{opacity:0} 8%{opacity:1} 30%{opacity:1} 40%{opacity:0} 100%{opacity:0} }
@keyframes ts-pulse{ 0%{opacity:.5;r:20} 100%{opacity:0;r:58} }
@keyframes ts-ringfade{ to{opacity:0} }
@keyframes ts-rise{ from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
@keyframes ts-out{ to{opacity:0;visibility:hidden} }

/* Accessibility: no motion — show the settled lockup briefly, then fade. */
@media (prefers-reduced-motion:reduce){
  .ts-dot,.ts-connector,.ts-ring{ display:none; }
  .ts-shaft{ stroke-dashoffset:0; animation:none; }
  .ts-head{ opacity:1; transform:none; animation:none; }
  .ts-word,.ts-tag{ opacity:1; animation:none; }
}
`;

export default LaunchSplash;
