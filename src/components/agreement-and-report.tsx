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
      <div className="rounded-lg border border-sand-200 bg-sand-50 p-3 text-sm text-sand-600">
        The official joint-application PDF can be generated on the{" "}
        <span className="font-medium text-sand-800">Transfer Setu website</span> (sign in with the same account).
      </div>
    );
  }

  if (locked) {
    return (
      <div className="rounded-lg border border-brand-200 bg-brand-50 p-3">
        <p className="text-sm text-sand-700">
          Generating the official joint-application PDF is a <strong>Premium</strong> feature.
        </p>
        <Link href="/billing" className="btn-primary mt-2">Go Premium to generate</Link>
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
      <button className="btn-primary" onClick={download} disabled={busy}>
        {busy && <Loader className="h-4 w-4" />}
        {busy ? "Generating…" : isNativeApp() ? "Generate & share joint application (PDF)" : "Download joint application (PDF)"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
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

export function ReportButton({ matchId, members }: { matchId: string; members: { id: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const [reportedId, setReportedId] = useState(members[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function submit() {
    startTransition(async () => {
      if (isNativeApp()) {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("reports").insert({
            reporter_profile_id: user.id,
            reported_profile_id: reportedId,
            match_id: matchId,
            reason: reason.trim(),
          });
        }
      } else {
        await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ match_id: matchId, reported_profile_id: reportedId, reason }),
        });
      }
      setDone(true);
      setOpen(false);
    });
  }

  if (done) return <p className="text-xs text-green-600">Report submitted. Thank you.</p>;

  return (
    <div className="text-sm">
      {!open ? (
        <button className="-mx-3 flex min-h-11 items-center gap-1.5 px-3 py-2.5 text-xs text-sand-500 underline hover:text-red-600" onClick={() => setOpen(true)}>
          <Flag className="h-3.5 w-3.5" />
          Report this match / member
        </button>
      ) : (
        <div className="card mt-2 space-y-2">
          <select className="input" value={reportedId} onChange={(e) => setReportedId(e.target.value)}>
            {members.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <textarea className="input" rows={3} placeholder="Describe the issue…" value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex gap-2">
            <button className="btn-danger px-3 py-1.5 text-sm" onClick={submit} disabled={pending || !reason.trim()}>Submit report</button>
            <button className="btn-secondary px-3 py-1.5 text-sm" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
