"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { isNativeApp } from "@/lib/native";
import { createClient } from "@/lib/supabase/client";
import { Flag, Loader } from "@/components/icons";

export function GenerateAgreementButton({ matchId, locked = false }: { matchId: string; locked?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // PDF generation isn't ported to the mobile backend yet (see
  // supabase/functions/README.md) — direct users to the website for now.
  if (isNativeApp()) {
    return (
      <div className="ts-card text-sm" style={{ color: "var(--ts-muted)" }}>
        The official joint-application PDF can be generated on the{" "}
        <span className="font-semibold" style={{ color: "var(--ts-text-strong)" }}>TransferSetu website</span> (sign in with the same account).
      </div>
    );
  }

  if (locked) {
    return (
      <div className="ts-card" style={{ borderColor: "var(--ts-warning-border)" }}>
        <p className="text-sm" style={{ color: "var(--ts-muted)" }}>
          Generating the official joint-application PDF is a <strong style={{ color: "var(--ts-text-strong)" }}>Premium</strong> feature.
        </p>
        <Link href="/billing" className="ts-btn-primary mt-3 w-full">Go Premium to generate</Link>
      </div>
    );
  }

  async function download() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/matches/${matchId}/agreement`);
      if (!res.ok) {
        setError((await res.json().catch(() => ({})))?.error ?? "Couldn't generate the document.");
        return;
      }
      const blob = await res.blob();
      const filename = `mutual-transfer-application-${matchId.slice(0, 8)}.pdf`;

      if (isNativeApp()) {
        await saveAndShareNative(blob, filename);
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
      router.refresh();
    } catch (e) {
      setError((e as Error)?.message ?? "Couldn't save the document.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button className="ts-btn-secondary w-full" onClick={download} disabled={busy}>
        {busy && <Loader className="h-4 w-4" />}
        {busy ? "Generating…" : isNativeApp() ? "Generate & share joint application (PDF)" : "Download joint application (PDF)"}
      </button>
      {error && <p className="mt-2 text-sm" style={{ color: "var(--ts-danger)" }}>{error}</p>}
    </div>
  );
}

/** On Capacitor: write the PDF to the cache dir, then open the native share sheet. */
async function saveAndShareNative(blob: Blob, filename: string) {
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import("@capacitor/filesystem"),
    import("@capacitor/share"),
  ]);
  const base64 = await blobToBase64(blob);
  const written = await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Cache });
  await Share.share({ title: "Joint mutual-transfer application", url: written.uri });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const REPORT_REASONS = [
  "Fake employee",
  "Wrong information",
  "Misuse",
  "Harassment",
  "Fraud",
  "Other",
] as const;

async function submitReport(input: { matchId: string | null; reportedProfileId: string; reason: string }) {
  if (isNativeApp()) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("reports").insert({
        reporter_profile_id: user.id,
        reported_profile_id: input.reportedProfileId,
        match_id: input.matchId,
        reason: input.reason,
      });
    }
  } else {
    await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        match_id: input.matchId,
        reported_profile_id: input.reportedProfileId,
        reason: input.reason,
      }),
    });
  }
}

function ReasonPicker({ category, setCategory, detail, setDetail }: {
  category: string;
  setCategory: (v: string) => void;
  detail: string;
  setDetail: (v: string) => void;
}) {
  return (
    <>
      <select className="ts-input" value={category} onChange={(e) => setCategory(e.target.value)}>
        <option value="">Reason…</option>
        {REPORT_REASONS.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      {category === "Other" && (
        <textarea
          className="ts-input"
          rows={3}
          placeholder="Describe the issue…"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
        />
      )}
    </>
  );
}

export function ReportButton({ matchId, members }: { matchId: string; members: { id: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const [reportedId, setReportedId] = useState(members[0]?.id ?? "");
  const [category, setCategory] = useState("");
  const [detail, setDetail] = useState("");
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const reason = category === "Other" ? detail.trim() : category;

  function submit() {
    startTransition(async () => {
      await submitReport({ matchId, reportedProfileId: reportedId, reason });
      setDone(true);
      setOpen(false);
    });
  }

  if (done) return <p className="text-xs" style={{ color: "var(--ts-accent-strong)" }}>Report submitted. Thank you.</p>;

  return (
    <div className="text-sm">
      {!open ? (
        <button className="flex items-center gap-1.5 py-2 text-xs underline" style={{ color: "var(--ts-faint)" }} onClick={() => setOpen(true)}>
          <Flag className="h-3.5 w-3.5" />
          Report this match / member
        </button>
      ) : (
        <div className="ts-card mt-2 space-y-2">
          <select className="ts-input" value={reportedId} onChange={(e) => setReportedId(e.target.value)}>
            {members.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <ReasonPicker category={category} setCategory={setCategory} detail={detail} setDetail={setDetail} />
          <div className="flex gap-2">
            <button className="ts-btn-danger px-3 py-2 text-xs" onClick={submit} disabled={pending || !reason}>Submit report</button>
            <button className="ts-btn-secondary px-3 py-2 text-xs" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Report a profile encountered via Search, outside of any match (match_id: null
 *  — the existing reports table/RLS and /api/reports route already accept that). */
export function ReportProfileButton({ profileId }: { profileId: string }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [detail, setDetail] = useState("");
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const reason = category === "Other" ? detail.trim() : category;

  function submit() {
    startTransition(async () => {
      await submitReport({ matchId: null, reportedProfileId: profileId, reason });
      setDone(true);
      setOpen(false);
    });
  }

  if (done) return <p className="text-xs" style={{ color: "var(--ts-accent-strong)" }}>Report submitted. Thank you.</p>;

  return (
    <div className="text-sm">
      {!open ? (
        <button className="flex items-center gap-1 text-xs underline" style={{ color: "var(--ts-faint)" }} onClick={() => setOpen(true)}>
          <Flag className="h-3.5 w-3.5" />
          Report
        </button>
      ) : (
        <div className="ts-card mt-2 space-y-2">
          <ReasonPicker category={category} setCategory={setCategory} detail={detail} setDetail={setDetail} />
          <div className="flex gap-2">
            <button className="ts-btn-danger px-3 py-2 text-xs" onClick={submit} disabled={pending || !reason}>Submit report</button>
            <button className="ts-btn-secondary px-3 py-2 text-xs" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
