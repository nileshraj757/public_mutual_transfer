/**
 * Two large blurred, slowly-drifting radial-gradient blobs behind the whole
 * app — purely decorative. Fixed + pointer-events-none so they never affect
 * layout or interaction; respects prefers-reduced-motion via the animation
 * rules already declared in globals.css.
 */
export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute -left-20 -top-16 h-64 w-64 animate-ts-blob-drift rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, var(--ts-blob-1), transparent 70%)` }}
      />
      <div
        className="absolute -right-16 bottom-16 h-56 w-56 animate-ts-blob-drift-2 rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, var(--ts-blob-2), transparent 70%)` }}
      />
    </div>
  );
}
