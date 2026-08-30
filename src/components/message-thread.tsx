"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isNativeApp } from "@/lib/native";
import type { Message } from "@/lib/types";

interface MessageThreadProps {
  matchId: string;
  selfId: string;
  /** Map of profile id → short label (e.g. "You", "Member 2"). */
  labels: Record<string, string>;
}

/**
 * Simple in-app chat. Reads/sends via the user's RLS-scoped client (which only
 * permits members of a fully-consented match), and polls for new messages.
 */
export function MessageThread({ matchId, selfId, labels }: MessageThreadProps) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSending(true);
    setError("");
    try {
      if (isNativeApp()) {
        // Direct insert (RLS permits members of a fully-consented match).
        const { error } = await supabase
          .from("messages")
          .insert({ match_id: matchId, sender_profile_id: selfId, body: text });
        if (error) {
          setError(error.message);
          return;
        }
      } else {
        // Send through the rate-limited API route (reads still go direct via RLS).
        const res = await fetch(`/api/matches/${matchId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: text }),
        });
        if (!res.ok) {
          setError((await res.json().catch(() => ({})))?.error ?? "Couldn't send.");
          return;
        }
      }
      setBody("");
      load();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="ts-card">
      <p className="mb-3 text-xs font-bold tracking-[0.5px]" style={{ color: "var(--ts-muted)" }}>CHAT</p>
      <div className="mb-3 max-h-80 space-y-2 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="py-4 text-center text-sm" style={{ color: "var(--ts-faint)" }}>No messages yet. Say hello and coordinate your swap.</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_profile_id === selfId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm"
                  style={
                    mine
                      ? { background: "linear-gradient(135deg, var(--ts-accent), var(--ts-accent-strong))", color: "var(--ts-on-accent)" }
                      : { background: "var(--ts-surface)", color: "var(--ts-text-strong)" }
                  }
                >
                  {!mine && <p className="mb-0.5 text-[11px] font-semibold opacity-70">{labels[m.sender_profile_id] ?? "Member"}</p>}
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className="mt-0.5 text-[10px] opacity-60">
                    {new Date(m.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      {error && <p className="mb-2 text-sm" style={{ color: "var(--ts-danger)" }}>{error}</p>}
      <form onSubmit={send} className="flex gap-2">
        <input
          className="ts-input"
          placeholder="Message…"
          value={body}
          maxLength={4000}
          onChange={(e) => setBody(e.target.value)}
        />
        <button className="ts-btn-primary px-4" disabled={sending || !body.trim()}>Send</button>
      </form>
    </div>
  );
}
