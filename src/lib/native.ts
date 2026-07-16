import { SITE_URL } from "./env";

/**
 * Native (Capacitor) helpers. Safe to import into client components and a no-op
 * on the web build.
 *
 * IMPORTANT: we deliberately do NOT statically `import "@capacitor/core"` here.
 * That package's module format trips Next.js's dev-mode RSC chunk loader and
 * also bloats the web bundle. Instead we read the `window.Capacitor` global that
 * the native WebView injects at runtime, and lazily `import()` plugins only when
 * actually running natively.
 */

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
}

function cap(): CapacitorGlobal | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
}

/** Custom URL scheme used for magic-link deep links into the native app. */
export const APP_SCHEME = process.env.NEXT_PUBLIC_APP_SCHEME || "mutualtransfer";

export function isNativeApp(): boolean {
  return cap()?.isNativePlatform?.() ?? false;
}

export function nativePlatform(): "ios" | "android" | "web" {
  return (cap()?.getPlatform?.() as "ios" | "android" | "web") ?? "web";
}

/**
 * Where Supabase should send the user after clicking a magic link.
 * - Web: back to the hosted /auth/callback route.
 * - Native: a deep link (handled by NativeBridge), which then forwards the code
 *   to the in-WebView /auth/callback so the session cookie is set.
 */
export function authRedirectUrl(next: string): string {
  const n = encodeURIComponent(next || "/dashboard");
  if (isNativeApp()) return `${APP_SCHEME}://auth/callback?next=${n}`;
  // Prefer the real page origin so a magic link always returns to wherever the
  // user actually signed in from (deployed site or localhost) rather than a
  // possibly-stale NEXT_PUBLIC_SITE_URL. Supabase must still allow-list it.
  const origin = typeof window !== "undefined" && window.location?.origin ? window.location.origin : SITE_URL;
  return `${origin}/auth/callback?next=${n}`;
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
