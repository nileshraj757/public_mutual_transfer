import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PreferencesEditor } from "./preferences-editor";

export const metadata = { title: "Your preferences — Mutual Transfer" };

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
        <h1 className="text-2xl font-bold text-slate-900">Where do you want to go?</h1>
        <p className="mt-1 text-sm text-slate-600">
          List the districts you&apos;d accept a transfer to, most-wanted first. We match these against other employees&apos;
          current postings.
        </p>
      </div>
      <Suspense>
        <PreferencesEditor initial={initial} />
      </Suspense>
    </div>
  );
}
