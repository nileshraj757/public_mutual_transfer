/** Persistent, prominent disclaimer required by the product spec. */
export function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-900 ${className}`}
      role="note"
    >
      <strong>Disclaimer:</strong> This platform only facilitates discovery of
      mutual-transfer partners. The actual transfer depends entirely on the
      competent authority&apos;s approval.
    </div>
  );
}
