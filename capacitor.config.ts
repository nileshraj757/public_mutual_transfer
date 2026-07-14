import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor wraps the deployed Next.js app in a native iOS/Android shell.
 *
 * Because this app is server-rendered (SSR + server actions + API routes), we do
 * NOT bundle a static export. Instead the WebView loads the live HTTPS site set
 * in `server.url` (your Vercel deployment). `webDir` only needs a tiny
 * placeholder for the CLI.
 *
 * Set CAP_SERVER_URL when syncing, e.g.
 *   CAP_SERVER_URL="https://your-app.vercel.app" npm run cap:sync
 * Leave it unset for local device testing against your dev machine
 * (e.g. http://192.168.1.x:3000).
 */
const serverUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: "in.mutualtransfer.app",
  appName: "Mutual Transfer",
  webDir: "mobile/www",
  server: serverUrl
    ? {
        url: serverUrl,
        cleartext: serverUrl.startsWith("http://"),
      }
    : undefined,
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
