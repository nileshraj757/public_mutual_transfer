export const metadata = { title: "Privacy Policy — Transfer Setu" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-sand-700">
      <h1 className="text-3xl font-bold text-sand-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-sand-500">
        Aligned with India&apos;s Digital Personal Data Protection Act, 2023 (DPDP).
      </p>

      <div className="mt-8 space-y-6">
        <Block title="Purpose limitation">
          We collect your profile and posting preferences for one purpose only: to help you discover eligible
          mutual-transfer partners and to generate a joint application. We do not sell or repurpose your data.
        </Block>
        <Block title="Explicit consent">
          You provide explicit consent at sign-up. You may withdraw it at any time by deleting your account, which
          permanently removes your data.
        </Block>
        <Block title="What others can see">
          Browsing employees see only non-identifying fields: cadre, designation, pay level, current district and
          preferred districts. Your <strong>name, employee ID, email and phone are never shown publicly</strong>. Contact
          details are revealed only after every party in a match has consented — and this is enforced by database-level
          Row Level Security, not merely the user interface.
        </Block>
        <Block title="Sensitive identifiers">
          Your employee ID is stored hashed/masked; the raw value is never persisted in a readable form or exposed.
        </Block>
        <Block title="Your rights (access, correction, erasure)">
          You can view and correct your data from your profile, and use{" "}
          <strong>Settings → Delete my account and data</strong> to erase it entirely, including your authentication
          record.
        </Block>
        <Block title="Data retention">
          Your data is retained only while your account is active. On deletion, profile, preferences, matches, messages,
          notifications and the login record are removed.
        </Block>
        <Block title="Security">
          Access is governed by Row Level Security policies. Authentication and messaging are rate-limited to deter
          scraping and abuse.
        </Block>
        <Block title="Disclaimer">
          This platform only facilitates discovery. It does not execute transfers; approval rests entirely with the
          competent authority.
        </Block>
        <Block title="Contact">
          For data requests or grievances, contact your platform administrator.
        </Block>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-sand-900">{title}</h2>
      <p className="mt-1">{children}</p>
    </section>
  );
}
