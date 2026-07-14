import Link from "next/link";
import { TopNav } from "@/components/top-nav";
import { getUser } from "@/lib/auth";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav signedIn={Boolean(user)} />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-sand-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-6 text-sm text-sand-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Mutual Transfer (facilitation only — not the appointing authority).</p>
          <div className="flex gap-4">
            <Link href="/how-it-works" className="hover:text-sand-800">How it works</Link>
            <Link href="/privacy" className="hover:text-sand-800">Privacy</Link>
            <Link href="/sign-in" className="hover:text-sand-800">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
