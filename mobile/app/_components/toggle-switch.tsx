"use client";

/** Green/gray sliding-thumb switch — push notifications, Hindi translate,
 *  admin rule toggles. */
export function ToggleSwitch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative h-[26px] w-11 flex-none rounded-full transition disabled:opacity-50"
      style={{ background: checked ? "var(--ts-accent)" : "var(--ts-border-strong)" }}
    >
      <span
        className="absolute top-[3px] h-5 w-5 rounded-full bg-white transition-transform duration-300 ease-[cubic-bezier(.34,1.56,.64,1)]"
        style={{ left: 3, transform: `translateX(${checked ? 18 : 0}px)` }}
      />
    </button>
  );
}
