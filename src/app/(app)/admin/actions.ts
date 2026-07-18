"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { recomputeAll } from "@/lib/matching/recompute";
import { isAdminEmail } from "@/lib/env";
import type { ReportStatus, VerificationStatus } from "@/lib/types";

async function assertAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  if (isAdminEmail(user.email)) return supabase;
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!data?.is_admin) throw new Error("Forbidden");
  return supabase;
}

export async function setVerification(profileId: string, status: VerificationStatus) {
  const supabase = await assertAdmin();
  await supabase.from("profiles").update({ verification_status: status }).eq("id", profileId);
  revalidatePath("/admin/verification");
}

export async function upsertRule(formData: FormData) {
  const supabase = await assertAdmin();
  const id = (formData.get("id") as string) || null;
  const payload = {
    key: (formData.get("key") as string).trim(),
    label: (formData.get("label") as string).trim(),
    value: ((formData.get("value") as string) || "").trim() || null,
    is_hard_constraint: formData.get("is_hard_constraint") === "on",
    active: formData.get("active") === "on",
  };
  if (id) {
    await supabase.from("rules_config").update(payload).eq("id", id);
  } else {
    await supabase.from("rules_config").upsert(payload, { onConflict: "key" });
  }
  revalidatePath("/admin/rules");
}

export async function deleteRule(formData: FormData) {
  const supabase = await assertAdmin();
  const id = formData.get("id") as string;
  await supabase.from("rules_config").delete().eq("id", id);
  revalidatePath("/admin/rules");
}

export async function setReportStatus(formData: FormData) {
  const supabase = await assertAdmin();
  const id = formData.get("id") as string;
  const status = formData.get("status") as ReportStatus;
  await supabase.from("reports").update({ status }).eq("id", id);
  revalidatePath("/admin/reports");
}

export async function triggerRecomputeAll() {
  await assertAdmin();
  await recomputeAll();
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}
