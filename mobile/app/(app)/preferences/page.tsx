"use client";

import { Suspense, useEffect, useState } from "react";
import { PreferencesEditor } from "@/app/(app)/preferences/preferences-editor";
import { RelaxedRulesPanel } from "@/components/relaxed-rules-panel";
import { savePreferencesForm, type PrefInput } from "@/lib/preferences-core";
import { callFn } from "@/lib/functions";
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
        setInitial(
          (data ?? []).map((p) => ({
            preferred_state: p.preferred_state,
            preferred_district: p.preferred_district,
          }))
        );
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
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-sand-900">Where do you want to go?</h1>
        <p className="mt-1 text-sm text-sand-600">
          List the districts you&apos;d accept a transfer to, most-wanted first. We match these against other
          employees&apos; current postings.
        </p>
      </div>
      <div className="mb-6">
        <RelaxedRulesPanel profileId={profile.id} initial={profile.relaxed_rules} />
      </div>
      <Suspense>
        <PreferencesEditor initial={initial} onSubmit={onSubmit} lockedUntil={profile.preferences_locked_until} />
      </Suspense>
    </div>
  );
}
