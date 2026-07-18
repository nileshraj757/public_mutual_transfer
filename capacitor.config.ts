import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor packages the STANDALONE app: the statically-exported client bundle in
 * `mobile/out` is shipped inside the APK/IPA and talks to Supabase (RLS) + the
 * Supabase Edge Functions over the network. No `server.url` — the UI is local, so
 * screens open instantly and offline, like a native app.
 *
 * Build + sync with:  npm run mobile:sync   (see package.json scripts)
 *
 * `androidScheme: "https"` gives the WebView a stable origin (https://localhost)
 * so the localStorage-backed Supabase session and PKCE verifier persist across
 * launches.
 */
const config: CapacitorConfig = {
  // Package ID intentionally unchanged — Android treats a different appId as a
  // different app entirely (breaks in-place upgrade of already-installed builds).
  appId: "in.mutualtransfer.app",
  appName: "Transfer Setu",
  webDir: "mobile/out",
  server: {
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#146152",
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
