import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
// Reuse the web app's global stylesheet verbatim (Tailwind directives + component
// classes). externalDir in next.config.mjs allows importing from ../src.
import "../../src/app/globals.css";
import { NativeBridge } from "@/components/native-bridge";
import { LaunchSplash } from "@/components/launch-splash";
import { HoverTranslate } from "@/components/hover-translate";
import { AppProviders } from "./providers";
import { AmbientBackground } from "./_components/ambient-background";

// Applies the saved/preferred theme to <html> before paint, so there's no
// flash of the wrong theme. Default is light (see Settings → Appearance for
// the toggle) — this only ever reads/writes the mobile app's own storage and
// its own <html> class, so it can't affect the web app.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var saved = localStorage.getItem("ts-theme");
    if (saved === "dark") document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

// The mobile "glass" redesign uses a single Inter face for both display and
// body text, loaded into the SAME --font-display/--font-sans variable names
// the shared globals.css keys off of. This only touches the mobile app's own
// <html> element — the web app loads Sora/Instrument Sans independently in
// src/app/layout.tsx — so web typography is unaffected.
const interDisplay = Inter({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});
const interSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TransferSetu",
  applicationName: "TransferSetu",
};

export const viewport: Viewport = {
  themeColor: "#146152",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${interDisplay.variable} ${interSans.variable}`} suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="ts-shell relative min-h-screen overflow-x-hidden" suppressHydrationWarning>
        <AmbientBackground />
        <LaunchSplash />
        <AppProviders>{children}</AppProviders>
        <HoverTranslate hideToggle />
        <NativeBridge />
      </body>
    </html>
  );
}
