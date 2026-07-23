import { requireProfile, requireUser } from "@/lib/auth";
import { ProfilePanel } from "@/components/profile-panel";
import { saveProfile } from "./actions";

export const metadata = { title: "Your profile — Transfer Setu" };

export default async function ProfilePage() {
  const profile = await requireProfile("/profile");
  const user = await requireUser("/profile");

  return <ProfilePanel profile={profile} email={user.email} onSubmit={saveProfile} />;
}
