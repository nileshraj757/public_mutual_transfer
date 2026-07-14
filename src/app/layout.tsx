import type { Metadata, Viewport } from "next";
import { Sora, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";
import { HoverTranslate } from "@/components/hover-translate";
import { NativeBridge } from "@/components/native-bridge";
import { UpdateChecker } from "@/components/update-checker";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mutual Transfer — find a posting swap",
  description:
    "A free facilitation platform that helps eligible court/judicial-department employees discover and arrange mutual transfers (posting swaps).",
  manifest: "/manifest.json",
  applicationName: "Mutual Transfer",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Mutual Transfer" },
};

export const viewport: Viewport = {
  themeColor: "#146152",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${instrumentSans.variable}`}>
      <body>
        <UpdateChecker />
        {children}
        <PwaRegister />
        <HoverTranslate />
        <NativeBridge />
      </body>
    </html>
  );
}
