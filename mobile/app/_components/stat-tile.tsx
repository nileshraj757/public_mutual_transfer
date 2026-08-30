export function StatTile({ value, label, tone = "default" }: { value: React.ReactNode; label: string; tone?: "default" | "accent" | "warning" }) {
  const color = tone === "accent" ? "var(--ts-accent)" : tone === "warning" ? "var(--ts-warning)" : "var(--ts-text-strong)";
  return (
    <div className="rounded-2xl border px-3 py-3.5 text-center backdrop-blur-xl" style={{ background: "var(--ts-surface)", borderColor: "var(--ts-border)" }}>
      <p className="font-display text-xl font-bold" style={{ color }}>
        {value}
      </p>
      <p className="mt-0.5 text-[11px] leading-tight" style={{ color: "var(--ts-muted)" }}>
        {label}
      </p>
    </div>
  );
}
