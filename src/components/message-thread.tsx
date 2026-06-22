"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
    // Send through the rate-limited API route (reads still go direct via RLS).
    const res = await fetch(`/api/matches/${matchId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    });
    setSending(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({})))?.error ?? "Couldn't send.");
    } else {
      setBody("");
      load();
    }
  }

  return (
    <div className="card">
      <h3 className="mb-3 font-semibold text-slate-900">Messages</h3>
      <div className="mb-3 max-h-80 space-y-2 overflow-y-auto rounded-lg bg-slate-50 p-3">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-slate-400">No messages yet. Say hello and coordinate your swap.</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_profile_id === selfId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-brand-600 text-white" : "bg-white text-slate-800 shadow-sm"}`}>
                  {!mine && <p className="mb-0.5 text-[11px] font-medium opacity-70">{labels[m.sender_profile_id] ?? "Member"}</p>}
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`mt-0.5 text-[10px] ${mine ? "text-brand-100" : "text-slate-400"}`}>
                    {new Date(m.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <form onSubmit={send} className="flex gap-2">
        <input
          className="input"
          placeholder="Type a message…"
          value={body}
          maxLength={4000}
          onChange={(e) => setBody(e.target.value)}
        />
        <button className="btn-primary" disabled={sending || !body.trim()}>Send</button>
      </form>
    </div>
  );
}
