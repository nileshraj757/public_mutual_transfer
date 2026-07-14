import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <p className="font-display text-5xl font-semibold text-brand-600">404</p>
        <h1 className="mt-2 font-display text-xl font-semibold text-sand-900">Page not found</h1>
        <p className="mt-1 text-sm text-sand-600">The page you&apos;re looking for doesn&apos;t exist or you may not have access.</p>
        <Link href="/" className="btn-primary mt-5">Go home</Link>
      </div>
    </div>
  );
}
