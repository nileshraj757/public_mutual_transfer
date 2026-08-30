"use client";

/** Two-option pill toggle with a sliding highlight (auth Sign in/Create
 *  account, Settings Dark/Light). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: [{ label: string; value: T }, { label: string; value: T }];
  value: T;
  onChange: (v: T) => void;
}) {
  const activeIndex = options.findIndex((o) => o.value === value);

  return (
    <div className="relative flex w-full rounded-2xl border p-1" style={{ background: "var(--ts-surface-soft)", borderColor: "var(--ts-border)" }}>
      <div
        className="absolute inset-y-1 w-[calc(50%-4px)] rounded-xl transition-transform duration-300 ease-[cubic-bezier(.34,1.56,.64,1)]"
        style={{
          left: 4,
          transform: `translateX(${activeIndex * 100}%)`,
          background: "var(--ts-accent-soft)",
          border: "1px solid var(--ts-accent-border)",
        }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className="relative z-10 flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition"
          style={{ color: o.value === value ? "var(--ts-text-strong)" : "var(--ts-muted)" }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
