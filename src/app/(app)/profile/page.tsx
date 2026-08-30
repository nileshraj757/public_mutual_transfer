import { requireProfile, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProfilePanel } from "@/components/profile-panel";
import { saveProfile } from "./actions";
import { savePreferences } from "../preferences/actions";

export const metadata = { title: "Your profile — TransferSetu" };

export default async function ProfilePage() {
  const profile = await requireProfile("/profile");
  const user = await requireUser("/profile");
  const supabase = createClient();

  const { data } = await supabase
    .from("preferences")
    .select("preferred_state, preferred_district, rank")
    .eq("profile_id", profile.id)
    .order("rank");

  const preferences = (data ?? []).map((p) => ({
    preferred_state: p.preferred_state,
    preferred_district: p.preferred_district,
  }));

  return (
    <ProfilePanel
      profile={profile}
      email={user.email}
      onSubmit={saveProfile}
      preferences={preferences}
      onSubmitPreferences={savePreferences}
    />
  );
}
