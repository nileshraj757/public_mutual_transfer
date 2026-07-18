"use client";

import { useEffect } from "react";
import { isNativeApp, registerPushNotifications } from "@/lib/native";

/**
 * Wires native-shell behaviours when running inside Capacitor (no-op on web):
 *  - hides the splash screen and styles the status bar,
 *  - completes magic-link auth via deep link (forwards the code to /auth/callback),
 *  - maps the Android hardware back button to in-app history,
 *  - registers for push notifications.
 */
export function NativeBridge() {
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

      // Magic-link deep link: mutualtransfer://auth/callback?code=...&next=...
      const urlSub = await App.addListener("appUrlOpen", ({ url }) => {
        try {
          const u = new URL(url);
          const code = u.searchParams.get("code");
          const next = u.searchParams.get("next") || "/dashboard";
          if (code) {
            // Trailing slash: the static export serves /auth/callback/index.html.
            window.location.replace(
              `/auth/callback/?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`
            );
          } else if (u.host === "auth" || u.pathname.includes("auth")) {
            window.location.replace("/sign-in/?error=auth");
          }
        } catch {
          /* malformed deep link — ignore */
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
  }, []);

  return null;
}
