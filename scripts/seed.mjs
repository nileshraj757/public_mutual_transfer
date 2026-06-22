/**
 * Full data seeder for the Mutual Transfer platform.
 *
 *   node scripts/seed.mjs           (or: npm run seed)
 *
 * It is idempotent: re-running upserts locations/rules and recreates demo users.
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your env
 * (loaded from .env.local automatically below).
 *
 * What it does:
 *   1. Upserts all states+districts from data/india-states-districts.json.
 *   2. Upserts the default rules_config (also in supabase/seed.sql).
 *   3. Creates ~10 demo, email-verified users with profiles + ranked preferences,
 *      wired to demonstrate ONE direct match and ONE 3-way chain.
 *   4. Promotes admin@example.com to an admin.
 *
 * Demo accounts all use password "Passw0rd!" so you can sign in via the
 * password fallback during local testing (magic-link also works).
 */

import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// Minimal .env.local loader (no extra dependency).
async function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      const txt = await readFile(path.join(root, file), "utf8");
      for (const line of txt.split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && !process.env[m[1]]) {
          process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
        }
      }
    } catch {
      /* file optional */
    }
  }
}

await loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    "✗ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "  Copy .env.example → .env.local and fill them in first."
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Decode the JWT role claim without a library.
{
  try {
    const payload = JSON.parse(
      Buffer.from(serviceKey.split(".")[1], "base64url").toString()
    );
    if (payload.role !== "service_role") {
      console.warn(
        `⚠ SUPABASE_SERVICE_ROLE_KEY has role="${payload.role}" — expected "service_role".\n` +
        "  RLS will NOT be bypassed. Check your .env.local."
      );
    } else {
      console.log(`✓ Key role: ${payload.role}`);
    }
  } catch {
    console.warn("⚠ Could not decode SUPABASE_SERVICE_ROLE_KEY JWT.");
  }
}

const maskEmployeeId = (raw) =>
  raw.length <= 3 ? raw : raw.slice(0, 2) + "••••" + raw.slice(-2);
const hashEmployeeId = (raw) =>
  createHash("sha256").update(raw.trim().toLowerCase()).digest("hex");

async function seedLocations() {
  const json = JSON.parse(
    await readFile(path.join(root, "data", "india-states-districts.json"), "utf8")
  );
  const rows = [];
  for (const s of json.states) {
    for (const d of s.districts) rows.push({ state: s.state, district: d });
  }
  // Upsert in chunks to stay well within free-tier request sizes.
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await admin
      .from("locations")
      .upsert(chunk, { onConflict: "state,district", ignoreDuplicates: true });
    if (error) throw error;
  }
  console.log(`✓ Seeded ${rows.length} locations`);
}

async function seedRules() {
  const rules = [
    { key: "cadre", label: "Cadre / department / establishment must match", value: null, is_hard_constraint: true, active: true },
    { key: "designation", label: "Designation / post must match", value: null, is_hard_constraint: true, active: true },
    { key: "pay_level", label: "Pay level / grade pay / pay scale must match", value: null, is_hard_constraint: true, active: true },
    { key: "chain_max_length", label: "Maximum chain (cyclic swap) length", value: "5", is_hard_constraint: false, active: true },
    { key: "cooling_off_months", label: "Soft-flag cooling-off period since last transfer (months)", value: "12", is_hard_constraint: false, active: true },
    { key: "show_seniority", label: "Display seniority / remaining service as a soft factor", value: "true", is_hard_constraint: false, active: true },
  ];
  const { error } = await admin.from("rules_config").upsert(rules, { onConflict: "key" });
  if (error) throw error;
  console.log(`✓ Seeded ${rules.length} rules_config rows`);
}

// Demo cast. Direct match: P1 (Patna→Gaya) ⇄ P2 (Gaya→Patna).
// 3-way chain: P3 (Lucknow→Kanpur Nagar) → P4 (Kanpur Nagar→Varanasi) →
//              P5 (Varanasi→Lucknow) → back to P3.
// All "Junior Assistant", cadre "Subordinate Courts Establishment", pay "Level-2"
// so the hard rules pass. Others add browse volume / near-misses.
const demoUsers = [
  { email: "alpha@example.com",   name: "Demo Alpha",   empId: "JA1001", state: "Bihar",         district: "Patna",        prefs: [["Bihar", "Gaya"]] },
  { email: "bravo@example.com",   name: "Demo Bravo",   empId: "JA1002", state: "Bihar",         district: "Gaya",         prefs: [["Bihar", "Patna"]] },
  { email: "charlie@example.com", name: "Demo Charlie", empId: "JA1003", state: "Uttar Pradesh", district: "Lucknow",      prefs: [["Uttar Pradesh", "Kanpur Nagar"]] },
  { email: "delta@example.com",   name: "Demo Delta",   empId: "JA1004", state: "Uttar Pradesh", district: "Kanpur Nagar", prefs: [["Uttar Pradesh", "Varanasi"]] },
  { email: "echo@example.com",    name: "Demo Echo",    empId: "JA1005", state: "Uttar Pradesh", district: "Varanasi",     prefs: [["Uttar Pradesh", "Lucknow"]] },
  // Browse-only extras (no perfect reciprocal yet).
  { email: "foxtrot@example.com", name: "Demo Foxtrot", empId: "JA1006", state: "Maharashtra",   district: "Pune",         prefs: [["Maharashtra", "Nagpur"], ["Maharashtra", "Nashik"]] },
  { email: "golf@example.com",    name: "Demo Golf",    empId: "JA1007", state: "Maharashtra",   district: "Mumbai City",  prefs: [["Maharashtra", "Pune"]] },
  { email: "hotel@example.com",   name: "Demo Hotel",   empId: "JA1008", state: "Karnataka",     district: "Mysuru",       prefs: [["Karnataka", "Bengaluru Urban"]] },
  { email: "india@example.com",   name: "Demo India",   empId: "JA1009", state: "Rajasthan",     district: "Kota",         prefs: [["Rajasthan", "Jaipur"]] },
  { email: "admin@example.com",   name: "Demo Admin",   empId: "AD0001", state: "Delhi",         district: "New Delhi",    prefs: [["Delhi", "South Delhi"]], admin: true },
];

async function findUserByEmail(email) {
  // Page through users (demo set is tiny, one page suffices).
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw error;
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
}

async function seedDemoUsers() {
  for (const u of demoUsers) {
    let user = await findUserByEmail(u.email);
    if (!user) {
      const { data, error } = await admin.auth.admin.createUser({
        email: u.email,
        password: "Passw0rd!",
        email_confirm: true,
      });
      if (error) throw error;
      user = data.user;
    }

    const profile = {
      id: user.id,
      full_name: u.name,
      employee_id_hash: hashEmployeeId(u.empId),
      employee_id_masked: maskEmployeeId(u.empId),
      cadre: "Subordinate Courts Establishment",
      designation: "Junior Assistant",
      pay_level: "Level-2",
      current_state: u.state,
      current_district: u.district,
      current_office: `${u.district} District Court`,
      joining_date: "2018-06-01",
      disciplinary_pending: false,
      verification_status: "verified",
      contact_email: u.email,
      phone: "+91-90000-0" + u.empId.slice(-4),
      is_admin: !!u.admin,
      is_active: true,
      consent_dpdp: true,
    };
    const { error: perr } = await admin.from("profiles").upsert(profile);
    if (perr) throw perr;

    // Reset + insert preferences.
    await admin.from("preferences").delete().eq("profile_id", user.id);
    const prefRows = u.prefs.map(([state, district], i) => ({
      profile_id: user.id,
      preferred_state: state,
      preferred_district: district,
      rank: i + 1,
    }));
    const { error: prefErr } = await admin.from("preferences").insert(prefRows);
    if (prefErr) throw prefErr;

    console.log(`✓ Demo user ${u.email}${u.admin ? " (admin)" : ""}`);
  }
}

try {
  await seedLocations();
  await seedRules();
  await seedDemoUsers();
  console.log(
    "\n✅ Seed complete.\n" +
      "   Sign in with any demo email (password: Passw0rd!) — e.g. alpha@example.com.\n" +
      "   admin@example.com has admin access. Then open /dashboard or trigger a recompute."
  );
} catch (e) {
  console.error("✗ Seed failed:", e.message || e);
  process.exit(1);
}
