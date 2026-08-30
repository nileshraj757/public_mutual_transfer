import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PreferencesEditor } from "./preferences-editor";
import { RelaxedRulesPanel } from "@/components/relaxed-rules-panel";
import { savePreferences } from "./actions";

export const metadata = { title: "Your preferences — TransferSetu" };

export default async function PreferencesPage() {
  const profile = await requireProfile("/preferences");
  const supabase = createClient();
  const { data } = await supabase
    .from("preferences")
    .select("preferred_state, preferred_district, rank")
    .eq("profile_id", profile.id)
    .order("rank");

  const initial = (data ?? []).map((p) => ({
    preferred_state: p.preferred_state,
    preferred_district: p.preferred_district,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-sand-900">Where do you want to go?</h1>
        <p className="mt-1 text-sm text-sand-600">
          List the districts you&apos;d accept a transfer to, most-wanted first. We match these against other employees&apos;
          current postings.
        </p>
      </div>
      <div className="mb-6">
        <RelaxedRulesPanel profileId={profile.id} initial={profile.relaxed_rules} />
      </div>
      <Suspense>
        <PreferencesEditor initial={initial} onSubmit={savePreferences} lockedUntil={profile.preferences_locked_until} />
      </Suspense>
    </div>
  );
}
