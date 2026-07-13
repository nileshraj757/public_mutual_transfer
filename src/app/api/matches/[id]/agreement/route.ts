import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { buildAgreementPdf, type AgreementMember } from "@/lib/pdf/agreement";
import { canUsePremium } from "@/lib/billing";

/** Generate the pre-filled joint mutual-transfer application PDF. Allowed only
 *  for members of a fully-consented match. */
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data: match } = await supabase
    .from("matches")
    .select("id, type, member_profile_ids, status")
    .eq("id", params.id)
    .maybeSingle();
  if (!match) return NextResponse.json({ error: "Match not found." }, { status: 404 });

  const { data: allConsented } = await supabase.rpc("match_all_consented", { p_match_id: params.id });
  if (!allConsented) {
    return NextResponse.json({ error: "All parties must consent before generating the application." }, { status: 403 });
  }

  // Premium gate (inert until Razorpay is configured — then it requires a sub).
  if (!(await canUsePremium(user.id))) {
    return NextResponse.json(
      { error: "Generating the joint application is a Premium feature.", upgrade: "/billing" },
      { status: 402 }
    );
  }

  // Caller is a verified member of a consented match — safe to assemble full
  // details (including names) for the official document.
  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, employee_id_masked, cadre, designation, pay_level, current_state, current_district, current_office")
    .in("id", match.member_profile_ids);

  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  const ordered = match.member_profile_ids.map((id: string) => byId.get(id)).filter(Boolean);

  const n = ordered.length;
  const members: AgreementMember[] = ordered.map((p: any, i: number) => {
    const next = ordered[(i + 1) % n] as any; // where this member is moving to
    return {
      full_name: p.full_name,
      employee_id_masked: p.employee_id_masked,
      cadre: p.cadre,
      designation: p.designation,
      pay_level: p.pay_level,
      current_state: p.current_state,
      current_district: p.current_district,
      current_office: p.current_office,
      desired_state: next?.current_state ?? null,
      desired_district: next?.current_district ?? null,
    };
  });

  const pdfBytes = await buildAgreementPdf({ type: match.type, members });

  // Advance status (best-effort) so the dashboard reflects progress.
  if (!["completed", "cancelled"].includes(match.status)) {
    await supabase.from("matches").update({ status: "agreement_generated" }).eq("id", params.id);
  }

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="mutual-transfer-application-${params.id.slice(0, 8)}.pdf"`,
    },
  });
}
