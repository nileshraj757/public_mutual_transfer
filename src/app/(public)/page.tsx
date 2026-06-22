import Link from "next/link";
import { Disclaimer } from "@/components/disclaimer";

const steps = [
  { t: "Create a verified profile", d: "Sign in with a free email link, add your cadre, designation, pay level and current posting." },
  { t: "Add where you want to go", d: "List your preferred states and districts in priority order." },
  { t: "Get matched", d: "We find direct swaps (A⇄B) and multi-way chains (A→B→C→A) where the rules allow it." },
  { t: "Consent & connect", d: "Both sides opt in before any contact is shared, then chat in-app." },
  { t: "Generate the application", d: "Download a pre-filled joint mutual-transfer application to submit to your authority." },
];

export default function LandingPage() {
  return (
    <div>
      <section className="bg-gradient-to-b from-brand-50 to-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
          <span className="badge bg-brand-100 text-brand-800">For court &amp; judicial-department employees</span>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Find a mutual transfer. <span className="text-brand-700">Swap your posting</span> with the right colleague.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-600">
            Posted at Location A but want Location B? We help you discover an eligible employee at B who wants A — for
            direct swaps and multi-way chains — confirm you can legally swap, connect after mutual consent, and generate
            a joint application.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/sign-in" className="btn-primary px-5 py-2.5 text-base">Get started — it&apos;s free</Link>
            <Link href="/how-it-works" className="btn-secondary px-5 py-2.5 text-base">How it works</Link>
          </div>
          <div className="mt-8 max-w-2xl">
            <Disclaimer />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14">
        <h2 className="text-2xl font-semibold text-slate-900">How it works</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.t} className="card">
              <div className="mb-2 grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">
                {i + 1}
              </div>
              <h3 className="font-semibold text-slate-900">{s.t}</h3>
              <p className="mt-1 text-sm text-slate-600">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 py-14 sm:grid-cols-3">
          <Feature title="Privacy by design" body="Your name, employee ID, email and phone are never shown publicly. Contact is revealed only after both sides consent — enforced at the database, not just the UI." />
          <Feature title="Three ways to match" body="Direct swaps, automatically-detected multi-way chains, and a browsable list of all relevant open requests." />
          <Feature title="Rules you control" body="Eligibility (cadre, designation, pay level) is a configurable rules engine your administrator can adjust per department." />
        </div>
      </section>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{body}</p>
    </div>
  );
}
