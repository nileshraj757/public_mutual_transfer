import { createAdminClient } from "@/lib/supabase/server";

interface NotifyInput {
  profileId: string;
  kind: "new_match" | "consent" | "message" | "system" | "match_request";
  title: string;
  body?: string;
  link?: string;
  /** For actionable notifications (e.g. match_request) — the row they refer to. */
  relatedId?: string;
  /** If provided, also attempt a best-effort email (degrades gracefully). */
  email?: string | null;
}

/**
 * Create an in-app notification and, when configured, send a free-tier email.
 * Never throws on email failure — notifications are best-effort.
 */
export async function notify(input: NotifyInput): Promise<void> {
  const admin = createAdminClient();
  await admin.from("notifications").insert({
    profile_id: input.profileId,
    kind: input.kind,
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
    related_id: input.relatedId ?? null,
  });

  if (input.email) {
    await sendEmail(input.email, input.title, input.body ?? input.title).catch(() => {
      /* email is optional; in-app notification already persisted */
    });
  }
}

/**
 * Best-effort transactional email via Resend's free tier. If RESEND_API_KEY is
 * unset (the default $0 path), this is a no-op — the platform relies on in-app
 * notifications plus Supabase's built-in auth emails.
 */
export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFY_EMAIL_FROM;
  if (!apiKey || !from) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text }),
  });
}
