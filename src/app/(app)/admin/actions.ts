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

export async function addDistrict(formData: FormData) {
  const supabase = await assertAdmin();
  const state = (formData.get("state") as string).trim();
  const district = (formData.get("district") as string).trim();
  if (!state || !district) return;
  await supabase.from("locations").upsert({ state, district }, { onConflict: "state,district" });
  revalidatePath("/admin/districts");
}

export async function deleteDistrict(formData: FormData) {
  const supabase = await assertAdmin();
  const id = formData.get("id") as string;
  await supabase.from("locations").delete().eq("id", id);
  revalidatePath("/admin/districts");
}

export async function addCadre(formData: FormData) {
  const supabase = await assertAdmin();
  const label = (formData.get("label") as string).trim();
  if (!label) return;
  await supabase.from("cadres").upsert({ label }, { onConflict: "label" });
  revalidatePath("/admin/cadres");
}

export async function deleteCadre(formData: FormData) {
  const supabase = await assertAdmin();
  const id = formData.get("id") as string;
  await supabase.from("cadres").delete().eq("id", id);
  revalidatePath("/admin/cadres");
}

export async function addDesignation(formData: FormData) {
  const supabase = await assertAdmin();
  const label = (formData.get("label") as string).trim();
  if (!label) return;
  await supabase.from("designations").upsert({ label }, { onConflict: "label" });
  revalidatePath("/admin/designations");
}

export async function deleteDesignation(formData: FormData) {
  const supabase = await assertAdmin();
  const id = formData.get("id") as string;
  await supabase.from("designations").delete().eq("id", id);
  revalidatePath("/admin/designations");
}
