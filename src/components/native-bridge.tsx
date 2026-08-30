"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isNativeApp, registerPushNotifications } from "@/lib/native";

/**
 * Wires native-shell behaviours when running inside Capacitor (no-op on web):
 *  - hides the splash screen and styles the status bar,
 *  - completes magic-link / Google OAuth via deep link (exchanges the code and
 *    soft-navigates to the destination),
 *  - maps the Android hardware back button to in-app history,
 *  - registers for push notifications.
 */
export function NativeBridge() {
  const router = useRouter();

  useEffect(() => {
    if (!isNativeApp()) return;
    let cleanups: Array<() => void> = [];

    (async () => {
      const [{ App }, { StatusBar, Style }, { SplashScreen }] = await Promise.all([
        import("@capacitor/app"),
        import("@capacitor/status-bar"),
        import("@capacitor/splash-screen"),
      ]);

      try {
        await StatusBar.setStyle({ style: Style.Light });
      } catch {
        /* status bar unsupported on some platforms */
      }
      try {
        await SplashScreen.hide();
      } catch {
        /* ignore */
      }

      // Tell the OTA updater (app-update-button.tsx) this bundle loaded fine.
      // Required within its appReadyTimeout after an update is applied, or the
      // plugin assumes the update crashed and auto-rolls back to the last-good
      // bundle — this is the safety net for a bad OTA push.
      import("@capgo/capacitor-updater")
        .then(({ CapacitorUpdater }) => CapacitorUpdater.notifyAppReady())
        .catch(() => {
          /* plugin unavailable (older APK build without it) — nothing to do */
        });

      // Magic-link / Google OAuth deep link: mutualtransfer://auth/callback?code=...&next=...
      //
      // We exchange the code and soft-navigate HERE rather than hard-loading a
      // separate /auth/callback/ HTML page. Capacitor's static file server does
      // not reliably resolve nested index.html for a deep two-level path like
      // /auth/callback/ — it falls back to the root index.html, so that page
      // never ran and the app bounced back to /sign-in. Handling it inside the
      // already-running SPA (router.replace = soft navigation, no static file
      // lookup) sidesteps that entirely. The singleton Supabase client shared
      // with AppProviders holds the PKCE verifier and, once the session is set,
      // its onAuthStateChange fires so guards see the session immediately.
      const urlSub = await App.addListener("appUrlOpen", async ({ url }) => {
        // Dismiss the system browser tab used for Google sign-in now that
        // control is back in the app. No-op and harmless if none is open.
        import("@capacitor/browser")
          .then(({ Browser }) => Browser.close())
          .catch(() => {});
        try {
          const u = new URL(url);
          const code = u.searchParams.get("code");
          const next = u.searchParams.get("next") || "/dashboard";
          if (!code) {
            if (u.host === "auth" || u.pathname.includes("auth")) router.replace("/sign-in?error=auth");
            return;
          }

          const [{ createClient }, { postAuthDestination }] = await Promise.all([
            import("@/lib/supabase/client"),
            import("@/lib/post-auth-route"),
          ]);
          const supabase = createClient();
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            router.replace("/sign-in?error=auth");
            return;
          }
          const {
            data: { user },
          } = await supabase.auth.getUser();
          const dest = user ? await postAuthDestination(supabase, user.id, next) : "/sign-in?error=auth";
          router.replace(dest);
        } catch {
          router.replace("/sign-in?error=auth");
        }
      });
      cleanups.push(() => urlSub.remove());

      // Android hardware back button.
      const backSub = await App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack && window.history.length > 1) window.history.back();
        else App.exitApp();
      });
      cleanups.push(() => backSub.remove());

      registerPushNotifications();
    })();

    return () => {
      cleanups.forEach((fn) => fn());
      cleanups = [];
    };
  }, [router]);

  return null;
}
