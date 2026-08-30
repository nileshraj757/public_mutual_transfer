/** Filter chip — toggleable (Browse's "Verified only") or static display. */
export function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const interactive = Boolean(onClick);
  const style = active
    ? { background: "var(--ts-accent-soft)", borderColor: "var(--ts-accent-border)", color: "var(--ts-accent-strong)" }
    : { background: "var(--ts-surface)", borderColor: "var(--ts-border)", color: "var(--ts-muted)" };

  if (!interactive) {
    return (
      <span className="ts-chip border" style={style}>
        {label}
      </span>
    );
  }

  return (
    <button type="button" onClick={onClick} className="ts-chip border" style={style}>
      {label}
    </button>
  );
}
