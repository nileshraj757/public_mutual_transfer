import Link from "next/link";
import { Disclaimer } from "@/components/disclaimer";

export const metadata = { title: "How it works — Transfer Setu" };

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-sand-900">How it works</h1>
      <Disclaimer className="my-6" />

      <div className="prose prose-slate max-w-none space-y-6 text-sand-700">
        <Section title="1. Eligibility (the rules)">
          <p>
            A swap is valid only when both employees match on the <strong>hard</strong> rules — by default the same
            cadre/establishment, the same designation/post, and the same pay level. Your administrator configures these
            rules, so they can vary by state or department.
          </p>
          <p>
            We also <em>display</em> soft factors so you can judge for yourself: seniority and remaining service, any
            cooling-off period since your last transfer, and self-declared pending disciplinary status. These are shown,
            not used to block matches.
          </p>
        </Section>

        <Section title="2. Direct matches (A ⇄ B)">
          <p>
            A direct match means your current location is on the other person&apos;s preferred list, their current
            location is on yours, and the hard rules pass.
          </p>
        </Section>

        <Section title="3. Chain matches (A → B → C → A)">
          <p>
            When no direct swap exists, a cycle might: A wants B&apos;s location, B wants C&apos;s, and C wants A&apos;s.
            We detect these automatically up to a configurable length.
          </p>
        </Section>

        <Section title="4. Consent before contact">
          <p>
            Every party must click <strong>&quot;I&apos;m interested&quot;</strong> before any contact detail is shared.
            Only then do email/phone become visible and in-app messaging unlocks. This is enforced by database security
            rules, not just hidden in the interface.
          </p>
        </Section>

        <Section title="5. Joint application">
          <p>
            Once everyone consents, generate a pre-filled joint mutual-transfer application PDF with all parties&apos;
            details and the proposed swap. Download it and submit it to your competent authority for approval.
          </p>
        </Section>
      </div>

      <div className="mt-10">
        <Link href="/sign-in" className="btn-primary px-5 py-2.5">Get started</Link>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl font-semibold text-sand-900">{title}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}
