"use client";

import { useEffect, useState } from "react";
import { isNativeApp } from "@/lib/native";
import { SUPABASE_URL } from "@/lib/env";

type Status =
  | "idle"
  | "checking"
  | "up-to-date"
  | "update-available"
  | "downloading"
  | "downloaded"
  | "error";

type PendingUpdate = { version: string; url: string };
type DownloadedBundle = { id: string; version: string };

const MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/app-updates/bundles/latest.json`;

/**
 * Settings → "Check for updates". Downloads and swaps the app's web bundle via
 * @capgo/capacitor-updater (self-hosted: scripts/publish-mobile-update.mjs
 * publishes bundles/latest.json + the zip to Supabase Storage). Native only —
 * on web the app is already always the latest deploy.
 *
 * Every step is a separate user action: checking never auto-downloads, and
 * downloading never auto-installs — install swaps the active bundle and
 * reloads the WebView, so it should only happen when the user asks for it.
 */
export function AppUpdateButton() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingUpdate | null>(null);
  const [downloaded, setDownloaded] = useState<DownloadedBundle | null>(null);

  useEffect(() => {
    if (!isNativeApp()) return;
    import("@capgo/capacitor-updater")
      .then(({ CapacitorUpdater }) => CapacitorUpdater.current())
      .then((res) => setCurrentVersion(res.bundle.version))
      .catch(() => {
        /* best-effort display only */
      });
  }, []);

  if (!isNativeApp()) return null;

  async function check() {
    setStatus("checking");
    setError("");
    try {
      const res = await fetch(MANIFEST_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("Couldn't reach the update server.");
      const { version, url } = (await res.json()) as { version: string; url: string };

      const { CapacitorUpdater } = await import("@capgo/capacitor-updater");
      const current = await CapacitorUpdater.current();
      if (current.bundle.version === version) {
        setStatus("up-to-date");
        return;
      }

      setPending({ version, url });
      setStatus("update-available");
    } catch (e) {
      setStatus("error");
      setError((e as Error).message || "Couldn't check for updates.");
    }
  }

  async function download() {
    if (!pending) return;
    setStatus("downloading");
    setError("");
    try {
      const { CapacitorUpdater } = await import("@capgo/capacitor-updater");
      const bundle = await CapacitorUpdater.download(pending);
      setDownloaded({ id: bundle.id, version: pending.version });
      setStatus("downloaded");
    } catch (e) {
      setStatus("error");
      setError((e as Error).message || "Couldn't download the update.");
    }
  }

  async function installNow() {
    if (!downloaded) return;
    const { CapacitorUpdater } = await import("@capgo/capacitor-updater");
    await CapacitorUpdater.set({ id: downloaded.id });
    await CapacitorUpdater.reload();
  }

  function later() {
    setStatus("idle");
  }

  return (
    <div className="space-y-3">
      {currentVersion && (
        <p className="text-sm" style={{ color: "var(--ts-muted)" }}>
          Current version: {currentVersion === "builtin" ? "Built-in" : currentVersion}
        </p>
      )}

      {status === "up-to-date" && <p className="text-sm" style={{ color: "var(--ts-muted)" }}>You&apos;re on the latest version.</p>}
      {status === "update-available" && (
        <p className="text-sm" style={{ color: "var(--ts-muted)" }}>Update {pending?.version} is available.</p>
      )}
      {status === "downloaded" && <p className="text-sm" style={{ color: "var(--ts-accent-strong)" }}>Update downloaded and ready to install.</p>}
      {error && <p className="text-sm" style={{ color: "var(--ts-danger)" }}>{error}</p>}

      {status === "update-available" ? (
        <div className="flex gap-2">
          <button type="button" className="ts-btn-primary" onClick={download}>
            Download update
          </button>
          <button type="button" className="ts-btn-secondary" onClick={later}>
            Later
          </button>
        </div>
      ) : status === "downloaded" ? (
        <div className="flex gap-2">
          <button type="button" className="ts-btn-primary" onClick={installNow}>
            Install now (restarts app)
          </button>
          <button type="button" className="ts-btn-secondary" onClick={later}>
            Later
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="ts-btn-secondary"
          onClick={check}
          disabled={status === "checking" || status === "downloading"}
        >
          {status === "checking" ? "Checking…" : status === "downloading" ? "Downloading…" : "Check for updates"}
        </button>
      )}
    </div>
  );
}
