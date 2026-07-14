import Link from "next/link";
import { Disclaimer } from "@/components/disclaimer";
import { HeroSwap } from "@/components/illustrations";
import { ArrowRight, Shield, Users, Settings } from "@/components/icons";

const steps = [
  { t: "Create a verified profile", d: "Sign in with a free email link, add your cadre, designation, pay level and current posting." },
  { t: "Add where you want to go", d: "List your preferred states and districts in priority order." },
  { t: "Get matched", d: "We find direct swaps (A⇄B) and multi-way chains (A→B→C→A) where the rules allow it." },
  { t: "Consent & connect", d: "Both sides opt in before any contact is shared, then chat in-app." },
  { t: "Generate the application", d: "Download a pre-filled joint mutual-transfer application to submit to your authority." },
];

const features = [
  { title: "Privacy by design", body: "Your name, employee ID, email and phone are never shown publicly. Contact is revealed only after both sides consent — enforced at the database, not just the UI.", Icon: Shield },
  { title: "Three ways to match", body: "Direct swaps, automatically-detected multi-way chains, and a browsable list of all relevant open requests.", Icon: Users },
  { title: "Rules you control", body: "Eligibility (cadre, designation, pay level) is a configurable rules engine your administrator can adjust per department.", Icon: Settings },
];

export default function LandingPage() {
  return (
    <div>
      <section className="overflow-hidden bg-gradient-to-b from-brand-50 via-sand-50 to-sand-50">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-14 sm:py-20 lg:grid-cols-[1.1fr,0.9fr] lg:py-24">
          <div className="animate-fade-in-up">
            <span className="badge bg-brand-100 text-brand-800">For court &amp; judicial-department employees</span>
            <h1 className="mt-4 max-w-xl font-display text-4xl font-semibold tracking-tight text-sand-900 sm:text-5xl">
              Find a mutual transfer. <span className="text-brand-600">Swap your posting</span> with the right colleague.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-sand-600">
              Posted at Location A but want Location B? We help you discover an eligible employee at B who wants A — for
              direct swaps and multi-way chains — confirm you can legally swap, connect after mutual consent, and generate
              a joint application.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/sign-in" className="btn-primary px-5 py-2.5 text-base">
                Get started — it&apos;s free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/how-it-works" className="btn-secondary px-5 py-2.5 text-base">How it works</Link>
            </div>
            <div className="mt-8 max-w-xl">
              <Disclaimer />
            </div>
          </div>
          <div className="animate-pop-in [animation-delay:150ms]">
            <HeroSwap className="mx-auto w-full max-w-sm lg:max-w-none" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14">
        <h2 className="font-display text-2xl font-semibold text-sand-900">How it works</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((s, i) => (
            <li
              key={s.t}
              className="card animate-fade-in-up transition hover:-translate-y-0.5 hover:shadow-warm-md"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className="mb-2 grid h-9 w-9 place-items-center rounded-full bg-brand-600 font-display text-sm font-bold text-white shadow-warm">
                {i + 1}
              </div>
              <h3 className="font-semibold text-sand-900">{s.t}</h3>
              <p className="mt-1 text-sm text-sand-600">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-sand-200 bg-white">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 py-14 sm:grid-cols-3">
          {features.map(({ title, body, Icon }) => (
            <div key={title}>
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-semibold text-sand-900">{title}</h3>
              <p className="mt-2 text-sm text-sand-600">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
