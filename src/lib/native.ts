import { Capacitor } from "@capacitor/core";
import { SITE_URL } from "./env";

/**
 * Native (Capacitor) helpers. All are safe to import into client components and
 * no-op on the web build (Capacitor reports the "web" platform there).
 */

/** Custom URL scheme used for magic-link deep links into the native app. */
export const APP_SCHEME = process.env.NEXT_PUBLIC_APP_SCHEME || "mutualtransfer";

export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function nativePlatform(): "ios" | "android" | "web" {
  try {
    return Capacitor.getPlatform() as "ios" | "android" | "web";
  } catch {
    return "web";
  }
}

/**
 * Where Supabase should send the user after clicking a magic link.
 * - Web: back to the hosted /auth/callback route.
 * - Native: a deep link (handled by NativeBridge), which then forwards the code
 *   to the in-WebView /auth/callback so the session cookie is set.
 */
export function authRedirectUrl(next: string): string {
  const n = encodeURIComponent(next || "/dashboard");
  return isNativeApp() ? `${APP_SCHEME}://auth/callback?next=${n}` : `${SITE_URL}/auth/callback?next=${n}`;
}

/** Register for native push and persist the device token (best-effort). */
export async function registerPushNotifications(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== "granted") return;

    await PushNotifications.addListener("registration", async (token) => {
      try {
        await fetch("/api/account/push-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: token.value, platform: nativePlatform() }),
        });
      } catch {
        /* token sync is best-effort */
      }
    });

    await PushNotifications.register();
  } catch {
    /* push is optional; ignore on devices/builds without it */
  }
}
