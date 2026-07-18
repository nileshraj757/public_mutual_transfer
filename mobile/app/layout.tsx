import type { Metadata, Viewport } from "next";
import { Sora, Instrument_Sans } from "next/font/google";
// Reuse the web app's global stylesheet verbatim (Tailwind directives + component
// classes). externalDir in next.config.mjs allows importing from ../src.
import "../../src/app/globals.css";
import { NativeBridge } from "@/components/native-bridge";
import { AppProviders } from "./providers";

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
  title: "Transfer Setu",
  applicationName: "Transfer Setu",
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
        <AppProviders>{children}</AppProviders>
        <NativeBridge />
      </body>
    </html>
  );
}
