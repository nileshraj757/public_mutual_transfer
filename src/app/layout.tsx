import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";
import { HoverTranslate } from "@/components/hover-translate";
import { NativeBridge } from "@/components/native-bridge";

export const metadata: Metadata = {
  title: "Mutual Transfer — find a posting swap",
  description:
    "A free facilitation platform that helps eligible court/judicial-department employees discover and arrange mutual transfers (posting swaps).",
  manifest: "/manifest.json",
  applicationName: "Mutual Transfer",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Mutual Transfer" },
};

export const viewport: Viewport = {
  themeColor: "#1e51eb",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <PwaRegister />
        <HoverTranslate />
        <NativeBridge />
      </body>
    </html>
  );
}
