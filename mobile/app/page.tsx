"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./providers";
import { Splash } from "./_components/splash";

/** Entry route: send the user into the app or to sign-in based on their session.
 *  Replaces the web middleware's root routing. */
export default function IndexPage() {
  const { loading, session, profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session) router.replace("/sign-in");
    else if (!profile) router.replace("/onboarding");
    else router.replace("/dashboard");
  }, [loading, session, profile, router]);

  return <Splash />;
}
