"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hashEmployeeId, maskEmployeeId } from "@/lib/hash";
import { officialEmailDomains } from "@/lib/env";
import { recomputeForUser } from "@/lib/matching/recompute";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

/**
 * Create or update the signed-in user's profile. Used by both onboarding and the
 * profile editor. Recomputes matches afterwards (preferences may already exist).
 */
export async function saveProfile(formData: FormData): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const fullName = str(formData.get("full_name"));
  const employeeId = str(formData.get("employee_id"));
  const courtLevel = str(formData.get("court_level"));
  const cadre = str(formData.get("cadre")); // service/cadre category (canonical)
  // Designation comes from a dropdown filtered by court level + cadre; "Other"
  // reveals a free-text field whose value is submitted as designation_other.
  const designationChoice = str(formData.get("designation"));
  const designationOther = str(formData.get("designation_other"));
  const designation = designationChoice === "Other (specify)" ? designationOther : designationChoice;
  const payLevel = str(formData.get("pay_level"));
  const currentState = str(formData.get("state"));
  const currentDistrict = str(formData.get("district"));
  const currentOffice = str(formData.get("current_office"));
  const joiningDate = str(formData.get("joining_date"));
  const lastTransferDate = str(formData.get("last_transfer_date"));
  const phone = str(formData.get("phone"));
  const disciplinary = formData.get("disciplinary_pending") === "on";
  const consent = formData.get("consent_dpdp") === "on";

  if (!fullName || !courtLevel || !cadre || !designation || !payLevel || !currentState || !currentDistrict) {
    return { ok: false, error: "Please complete all required fields." };
  }

  // Does a profile already exist? (Onboarding requires the consent checkbox.)
  const { data: existing } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (!existing && !consent) {
    return { ok: false, error: "You must consent to data processing to create a profile." };
  }

  // Auto-verify by official email domain when configured; otherwise keep pending
  // for admin review (never downgrade an already-verified profile here).
  const domains = officialEmailDomains();
  const emailDomain = (user.email ?? "").split("@")[1]?.toLowerCase() ?? "";
  const autoVerified = domains.length > 0 && domains.includes(emailDomain);

  const base = {
    id: user.id,
    full_name: fullName,
    court_level: courtLevel,
    cadre,
    designation,
    pay_level: payLevel,
    current_state: currentState,
    current_district: currentDistrict,
    current_office: currentOffice || null,
    joining_date: joiningDate || null,
    last_transfer_date: lastTransferDate || null,
    phone: phone || null,
    disciplinary_pending: disciplinary,
    contact_email: user.email,
  };

  const insertExtras = existing
    ? {}
    : {
        consent_dpdp: true,
        verification_status: autoVerified ? ("verified" as const) : ("pending" as const),
      };

  const employeeExtras = employeeId
    ? { employee_id_hash: hashEmployeeId(employeeId), employee_id_masked: maskEmployeeId(employeeId) }
    : {};

  const { error } = await supabase.from("profiles").upsert({ ...base, ...insertExtras, ...employeeExtras });
  if (error) return { ok: false, error: error.message };

  // Refresh matches for this user (best effort).
  try {
    await recomputeForUser(user.id);
  } catch {
    /* recompute is best-effort; ignore */
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { ok: true };
}
