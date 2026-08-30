"use client";

import { Suspense, useEffect, useState } from "react";
import { PreferencesEditor } from "@/app/(app)/preferences/preferences-editor";
import { RelaxedRulesPanel } from "@/components/relaxed-rules-panel";
import { savePreferencesForm, type PrefInput } from "@/lib/preferences-core";
import { callFn } from "@/lib/functions";
import { ScreenHeader } from "../../_components/screen-header";
import { useAuth } from "../../providers";
import { Splash } from "../../_components/splash";

export default function PreferencesPage() {
  const { supabase, profile } = useAuth();
  const [initial, setInitial] = useState<PrefInput[] | null>(null);

  useEffect(() => {
    if (!profile) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("preferences")
        .select("preferred_state, preferred_district, rank")
        .eq("profile_id", profile.id)
        .order("rank");
      if (active) {
        setInitial((data ?? []).map((p) => ({ preferred_state: p.preferred_state, preferred_district: p.preferred_district })));
      }
    })();
    return () => {
      active = false;
    };
  }, [supabase, profile]);

  if (!profile || initial === null) return <Splash />;

  async function onSubmit(prefs: PrefInput[]) {
    const res = await savePreferencesForm(supabase, profile!.id, prefs);
    if (res.ok) {
      try {
        await callFn(supabase, "match-recompute");
      } catch {
        /* best-effort */
      }
    }
    return res;
  }

  return (
    <div>
      <ScreenHeader title="Preferences" />
      <p className="mb-4 text-sm leading-relaxed" style={{ color: "var(--ts-muted)" }}>
        Ranked districts you&apos;d swap into, in priority order.
      </p>
      <div className="mb-5">
        <RelaxedRulesPanel profileId={profile.id} initial={profile.relaxed_rules} />
      </div>
      <Suspense>
        <PreferencesEditor initial={initial} onSubmit={onSubmit} lockedUntil={profile.preferences_locked_until} />
      </Suspense>
    </div>
  );
}
