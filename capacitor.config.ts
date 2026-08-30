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
  appName: "TransferSetu",
  webDir: "mobile/out",
  server: {
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 500,
      backgroundColor: "#146152",
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    // Manual OTA web-bundle updates (Settings → "Check for updates" —
    // src/components/app-update-button.tsx). autoUpdate: false disables the
    // plugin's own background polling/apply — we drive download()/set()/reload()
    // ourselves so the user controls exactly when an update is fetched and
    // applied. Pinned to @capgo/capacitor-updater@6.14.9 (see package.json) —
    // versions from 6.14.10 on bundle androidx.work >= 2.10.0, which requires
    // compileSdk 35; this project is on compileSdk 34 / AGP 8.2.1.
    CapacitorUpdater: {
      autoUpdate: false,
      autoDeletePrevious: true,
    },
  },
};

export default config;
