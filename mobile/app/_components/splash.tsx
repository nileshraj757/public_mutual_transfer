import { Logo } from "@/components/icons";

/** Full-screen loading state shown while auth/profile resolve. */
export function Splash({ label = "Loading…" }: { label?: string }) {
  return (
    <main className="grid min-h-screen place-items-center p-8 text-center">
      <div className="animate-pop-in">
        <Logo className="mx-auto h-12 w-12" />
        <p className="mt-3 text-sm text-sand-600">{label}</p>
      </div>
    </main>
  );
}
