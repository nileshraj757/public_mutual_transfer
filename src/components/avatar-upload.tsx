"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader } from "@/components/icons";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

interface AvatarUploadProps {
  userId: string;
  /** Called with the new public URL once the upload + profile update succeed. */
  onUploaded: (url: string) => void;
  /** Small icon-only trigger vs. a labelled button. */
  variant?: "icon" | "button";
}

/**
 * Direct-to-Storage profile photo upload (bucket "avatars", see migration
 * 0009_prefs_lock_and_avatar.sql). Uploads to a fixed per-user path
 * ("<user id>/avatar.<ext>", upsert) so there's never more than one file to
 * clean up, then writes the public URL onto profiles.avatar_url. A timestamp
 * query param busts the browser/CDN cache for the fixed path.
 */
export function AvatarUpload({ userId, onUploaded, variant = "icon" }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image must be under 5MB.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${userId}/avatar.${ext}`;

      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
        upsert: true,
        contentType: file.type,
        cacheControl: "3600",
      });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${pub.publicUrl}?t=${Date.now()}`;

      const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
      if (dbErr) throw dbErr;

      onUploaded(url);
    } catch (e) {
      setError((e as Error).message || "Couldn't upload photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onChange} disabled={busy} />
      {variant === "icon" ? (
        <button
          type="button"
          aria-label="Change photo"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="grid h-7 w-7 place-items-center rounded-full border-2 shadow-md transition disabled:opacity-60"
          style={{ borderColor: "var(--ts-bg-outer, #fff)", background: "var(--ts-accent-strong)", color: "var(--ts-on-accent)" }}
        >
          {busy ? <Loader className="h-3.5 w-3.5" /> : <CameraIcon className="h-3.5 w-3.5" />}
        </button>
      ) : (
        <button type="button" className="ts-btn-secondary" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy && <Loader className="h-4 w-4" />}
          {busy ? "Uploading…" : "Change photo"}
        </button>
      )}
      {error && <span className="text-xs" style={{ color: "var(--ts-danger)" }}>{error}</span>}
    </span>
  );
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M4 8.5a2 2 0 0 1 2-2h1.2l.9-1.5a1.5 1.5 0 0 1 1.3-.75h4.2a1.5 1.5 0 0 1 1.3.75l.9 1.5H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9Z" />
      <circle cx="12" cy="13" r="3.25" />
    </svg>
  );
}
