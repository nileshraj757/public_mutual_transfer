/**
 * Canonical Indian judiciary taxonomy used to make eligibility matching
 * reliable. Free-text designation ("Jr. Assistant" vs "Junior Asst." vs "JA")
 * never matches; these controlled lists give every user the same canonical
 * value so the engine's equality check on (court_level, cadre, designation,
 * pay_level) actually works.
 *
 * pay_level stores pre-7th-CPC Grade Pay amounts (GRADE_PAY_OPTIONS below) —
 * the classification most court/ministerial staff actually use day to day.
 *
 * Designation options are a function of court level + service/cadre category.
 * An "Other (specify)" escape hatch is offered for most cadres so nothing is
 * unfillable; those free-text values simply won't match until curated into the
 * lists. (The Stenographic cadre is the exception — its list is exhaustive.)
 */

export const OTHER = "Other (specify)";

/** #1 — court level / establishment type. Drives the designation list. */
export const COURT_LEVELS = [
  "District & Sessions Court",
  "Family Court",
  "Commercial Court",
  "Gram Nyayalaya",
] as const;

/** #6 — service / cadre category. The real cadre split. */
export const CADRE_CATEGORIES = [
  "Ministerial / Establishment staff",
  "Stenographic cadre",
  "Technical (IT / System Officer)",
  "Class IV / MTS",
] as const;

/** Pre-7th-CPC Grade Pay amounts (₹), stored in profiles.pay_level. */
const GRADE_PAY_AMOUNTS = [1800, 1900, 2000, 2400, 2800, 4200, 4600, 4800, 5400, 6600, 7600, 8700, 8900, 10000];
export const GRADE_PAY_OPTIONS = GRADE_PAY_AMOUNTS.map((n) => `₹${n.toLocaleString("en-IN")}`);

// ── Judicial Officer designations, per court level ────────────────────────────
const JUDICIAL_BY_LEVEL: Record<string, string[]> = {
  "Supreme Court of India": ["Chief Justice of India", "Judge, Supreme Court", "Ad hoc Judge (Art. 127)"],
  "High Court": ["Chief Justice", "Acting Chief Justice", "Judge (Permanent)", "Additional Judge (Art. 224)", "Ad hoc Judge (Art. 224A)"],
  "District & Sessions Court": [
    "Principal District & Sessions Judge",
    "District & Sessions Judge",
    "Additional District & Sessions Judge",
    "Chief Judicial Magistrate (CJM)",
    "Additional Chief Judicial Magistrate",
    "Registrar, District Court",
  ],
  "Civil Court (Sr. / Jr. Division)": [
    "Civil Judge (Senior Division)",
    "Civil Judge (Junior Division)",
    "Chief Judicial Magistrate (CJM)",
    "Judicial Magistrate First Class (JMFC)",
    "Munsiff",
    "Special Judicial Magistrate",
  ],
  "Family Court": ["Principal Judge, Family Court", "Judge, Family Court"],
  "Special / Designated Court": [
    "Special Judge — CBI",
    "Special Judge — NIA",
    "Special Judge — POCSO",
    "Special Judge — NDPS",
    "Special Judge — PMLA",
    "Special Judge — SC/ST (Prevention of Atrocities) Act",
    "Special Judge — MP/MLA Cases",
  ],
  "Commercial Court": ["Presiding Officer / Judge, Commercial Court"],
  "Labour Court / Industrial Tribunal": [
    "Presiding Officer, Labour Court",
    "Presiding Officer, Industrial Tribunal",
    "Presiding Officer, MACT",
  ],
  "Consumer Commission (State / District)": ["President", "Member"],
  Tribunal: ["Chairperson", "Vice-Chairperson", "Judicial Member", "Technical / Administrative Member", "Expert Member"],
  "Gram Nyayalaya": ["Nyayadhikari (Gram Nyayalaya)"],
  "Legal Services Authority": ["Member Secretary", "Secretary, DLSA", "Panel Advocate", "Para-Legal Volunteer"],
};

// ── Non-judicial staff cadres ─────────────────────────────────────────────────
const MINISTERIAL_DISTRICT = [
  "Sheristadar",
  "Head Clerk",
  "Reader / Bench Clerk",
  "Ahlmad",
  "Nazir",
  "Senior Assistant",
  "Assistant",
  "Junior Assistant",
  "Copyist",
  "Record Keeper",
  "Accountant",
  "Librarian",
];
const MINISTERIAL_HIGH_COURT = [
  "Registrar General",
  "Registrar",
  "Additional Registrar",
  "Joint Registrar",
  "Deputy Registrar",
  "Assistant Registrar",
  "Court Officer",
  "Court Master",
  "Reader",
  "Section Officer",
  "Superintendent",
  "Senior Assistant",
  "Assistant",
  "Junior Assistant",
];
const MINISTERIAL_SUPREME_COURT = [
  "Secretary General",
  "Registrar General",
  "Registrar",
  "Additional Registrar",
  "Joint Registrar",
  "Deputy Registrar",
  "Assistant Registrar",
  "Court Master",
  "Branch Officer",
  "Court Officer",
  "Section Officer",
  "Senior Personal Assistant",
  "Junior Court Assistant",
  "Chamber Attendant",
];
const STENO = ["Stenographer Grade I", "Stenographer Grade II", "Stenographer Grade III"];
const PROCESS = ["Nazir", "Bailiff", "Process Server", "Summon Server"];
const TECHNICAL = ["System Officer", "System Assistant", "IT Manager", "Technical Assistant"];
const CLASS_IV = ["Peon", "Chowkidar", "Sweeper", "Farash", "Mali", "Multi-Tasking Staff (MTS)"];

/**
 * Canonical designation options for a (court level, cadre category) pair.
 * Ends with OTHER so the field is never a dead end — except the Stenographic
 * cadre, whose curated Grade I/II/III list is exhaustive (no free-text entry).
 */
export function designationOptions(courtLevel: string, cadre: string): string[] {
  let base: string[];
  let allowOther = true;
  switch (cadre) {
    case "Judicial Officer":
      base = JUDICIAL_BY_LEVEL[courtLevel] ?? ["Presiding Officer / Judge"];
      break;
    case "Ministerial / Establishment staff":
      base =
        courtLevel === "Supreme Court of India"
          ? MINISTERIAL_SUPREME_COURT
          : courtLevel === "High Court"
            ? MINISTERIAL_HIGH_COURT
            : MINISTERIAL_DISTRICT;
      break;
    case "Stenographic cadre":
      base = STENO;
      allowOther = false;
      break;
    case "Process serving / Nazarat":
      base = PROCESS;
      break;
    case "Technical (IT / System Officer)":
      base = TECHNICAL;
      break;
    case "Class IV / MTS":
      base = CLASS_IV;
      break;
    default:
      base = [];
  }
  return allowOther ? [...base, OTHER] : base;
}
