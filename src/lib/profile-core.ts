import type { SupabaseClient } from "@supabase/supabase-js";
import { OTHER } from "@/lib/judiciary";

/**
 * Browser-safe profile save logic shared by the web server action
 * (src/app/(app)/profile/actions.ts) and the standalone mobile app. Contains NO
 * node-only imports so it can be bundled into the static export. The caller
 * supplies a Supabase client (server cookie client or browser client) and
 * triggers recompute afterwards.
 */

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

/** SHA-256 hex via Web Crypto (available in browsers and Node 18.17+/20). */
export async function sha256Hex(raw: string): Promise<string> {
  const bytes = new TextEncoder().encode(raw.trim().toLowerCase());
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Human-readable mask shown to the owner/admin only, e.g. "JA••••27". */
export function maskEmployeeId(raw: string): string {
  const v = raw.trim();
  if (v.length <= 3) return "•".repeat(v.length);
  return v.slice(0, 2) + "••••" + v.slice(-2);
}

/**
 * Create or update the signed-in user's profile from the profile form's
 * FormData. Does the existence check, validation, employee-id hashing and
 * upsert. Recompute + cache revalidation are the caller's responsibility.
 */
export async function saveProfileForm(
  supabase: SupabaseClient,
  ctx: { userId: string; userEmail: string | null; autoVerified: boolean },
  formData: FormData
): Promise<ActionResult> {
  const fullName = str(formData.get("full_name"));
  const employeeId = str(formData.get("employee_id"));
  const courtLevel = str(formData.get("court_level"));
  const cadre = str(formData.get("cadre"));
  const designationChoice = str(formData.get("designation"));
  const designationOther = str(formData.get("designation_other"));
  const designation = designationChoice === OTHER ? designationOther : designationChoice;
  const payLevel = str(formData.get("pay_level"));
  const currentState = str(formData.get("state"));
  const currentDistrict = str(formData.get("district"));
  const currentOffice = str(formData.get("current_office"));
  const joiningDate = str(formData.get("joining_date"));
  const lastTransferDate = str(formData.get("last_transfer_date"));
  const phone = str(formData.get("phone"));
  const disciplinary = formData.get("disciplinary_pending") === "on";
  const consent = formData.get("consent_dpdp") === "on";

  if (!fullName || !courtLevel || !cadre || !designation || !payLevel || !currentState || !currentDistrict || !phone) {
    return { ok: false, error: "Please complete all required fields." };
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", ctx.userId)
    .maybeSingle();
  if (!existing && !consent) {
    return { ok: false, error: "You must consent to data processing to create a profile." };
  }

  const base = {
    id: ctx.userId,
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
    contact_email: ctx.userEmail,
  };

  const insertExtras = existing
    ? {}
    : {
        consent_dpdp: true,
        verification_status: ctx.autoVerified ? ("verified" as const) : ("pending" as const),
      };

  const employeeExtras = employeeId
    ? { employee_id_hash: await sha256Hex(employeeId), employee_id_masked: maskEmployeeId(employeeId) }
    : {};

  const { error } = await supabase.from("profiles").upsert({ ...base, ...insertExtras, ...employeeExtras });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
