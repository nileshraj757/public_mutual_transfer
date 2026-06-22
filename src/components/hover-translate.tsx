"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Hover-to-Hindi translation.
 *
 * Hovering any text element shows its Hindi translation in a tooltip. Uses the
 * free, key-less MyMemory API (en→hi), with in-memory + localStorage caching so
 * repeat hovers and return visits don't re-hit the network (keeping us within
 * the free daily quota). A small corner toggle enables/disables the feature.
 *
 * Optional: set NEXT_PUBLIC_MYMEMORY_EMAIL to raise MyMemory's free daily limit.
 */

const HOVER_DELAY_MS = 320;
const MAX_CHARS = 1200; // don't translate giant blobs
const CHUNK_SIZE = 460; // MyMemory free: ~500 bytes per query
const CACHE_KEY = "hoverTranslate.cache.v1";
const ENABLED_KEY = "hoverTranslate.enabled";
const CACHE_MAX = 800;

// Block-ish text containers we translate as a whole (sentence/paragraph level).
const BLOCK_TAGS = new Set([
  "P", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "TD", "TH", "DT", "DD",
  "BLOCKQUOTE", "FIGCAPTION", "LABEL", "BUTTON", "A", "SUMMARY", "CAPTION", "LEGEND",
]);
// Inline tags that, if hovered directly with no block ancestor, we still translate.
const INLINE_TAGS = new Set(["SPAN", "STRONG", "EM", "B", "I", "CODE", "SMALL", "ABBR", "MARK"]);

const memCache = new Map<string, string>();

function hasLetters(s: string) {
  return /[A-Za-z]/.test(s);
}

/** Split text into <=CHUNK_SIZE pieces on sentence/word boundaries. */
function chunkText(text: string): string[] {
  if (text.length <= CHUNK_SIZE) return [text];
  const parts = text.match(/[^.!?।]+[.!?।]?\s*/g) ?? [text];
  const chunks: string[] = [];
  let cur = "";
  for (const p of parts) {
    if ((cur + p).length > CHUNK_SIZE && cur) {
      chunks.push(cur);
      cur = "";
    }
    if (p.length > CHUNK_SIZE) {
      // Hard-split an over-long sentence by words.
      for (const w of p.split(/\s+/)) {
        if ((cur + " " + w).length > CHUNK_SIZE && cur) {
          chunks.push(cur);
          cur = "";
        }
        cur = cur ? cur + " " + w : w;
      }
    } else {
      cur += p;
    }
  }
  if (cur.trim()) chunks.push(cur);
  return chunks;
}

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw) as Record<string, string>;
    for (const [k, v] of Object.entries(obj)) memCache.set(k, v);
  } catch {
    /* ignore */
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function persistCache() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      // Keep only the most recent CACHE_MAX entries.
      const entries = [...memCache.entries()].slice(-CACHE_MAX);
      localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
    } catch {
      /* quota / disabled storage — ignore */
    }
  }, 800);
}

async function translateChunk(text: string, signal: AbortSignal): Promise<string> {
  if (memCache.has(text)) return memCache.get(text)!;
  const email = process.env.NEXT_PUBLIC_MYMEMORY_EMAIL;
  const url =
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|hi` +
    (email ? `&de=${encodeURIComponent(email)}` : "");
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const translated: string = json?.responseData?.translatedText ?? "";
  if (!translated) throw new Error("No translation");
  memCache.set(text, translated);
  persistCache();
  return translated;
}

async function translate(text: string, signal: AbortSignal): Promise<string> {
  const key = text;
  if (memCache.has(key)) return memCache.get(key)!;
  const chunks = chunkText(text);
  const out: string[] = [];
  for (const c of chunks) out.push(await translateChunk(c, signal));
  const joined = out.join(" ");
  memCache.set(key, joined);
  persistCache();
  return joined;
}

/** From the hovered node, pick the best text element to translate. */
function pickTextElement(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;
  // Ignore our own UI and editable/controls.
  if (target.closest("[data-hovertx-ui]")) return null;
  if (target.closest("input, textarea, select, [contenteditable='true']")) return null;

  // Prefer the nearest block-level text container.
  let el: HTMLElement | null = target;
  while (el) {
    if (BLOCK_TAGS.has(el.tagName)) return el;
    el = el.parentElement;
  }
  // Otherwise accept a directly-hovered inline element with its own text.
  if (INLINE_TAGS.has(target.tagName)) return target;
  return null;
}

function elementText(el: HTMLElement): string {
  return (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
}

interface Tip {
  visible: boolean;
  loading: boolean;
  text: string;
  error: boolean;
  x: number;
  y: number;
}

export function HoverTranslate() {
  const [enabled, setEnabled] = useState(true);
  const [tip, setTip] = useState<Tip>({ visible: false, loading: false, text: "", error: false, x: 0, y: 0 });

  const enabledRef = useRef(enabled);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const currentEl = useRef<HTMLElement | null>(null);
  const tokenRef = useRef(0);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  // Restore preferences + cache once on mount.
  useEffect(() => {
    loadCache();
    try {
      const saved = localStorage.getItem(ENABLED_KEY);
      if (saved !== null) setEnabled(saved === "1");
    } catch {
      /* ignore */
    }
  }, []);

  function hide() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    abortRef.current?.abort();
    currentEl.current = null;
    setTip((t) => (t.visible ? { ...t, visible: false } : t));
  }

  useEffect(() => {
    function clampX(x: number) {
      const w = window.innerWidth;
      return Math.min(Math.max(12, x), w - 320);
    }
    function clampY(y: number) {
      const h = window.innerHeight;
      return Math.min(Math.max(12, y), h - 80);
    }

    function onMouseOver(e: MouseEvent) {
      if (!enabledRef.current) return;
      const el = pickTextElement(e.target);
      if (!el || el === currentEl.current) return;

      const text = elementText(el);
      if (!text || text.length > MAX_CHARS || !hasLetters(text)) {
        hide();
        return;
      }

      currentEl.current = el;
      if (hoverTimer.current) clearTimeout(hoverTimer.current);

      const x = clampX(e.clientX + 14);
      const y = clampY(e.clientY + 18);

      hoverTimer.current = setTimeout(async () => {
        const token = ++tokenRef.current;
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;

        const cached = memCache.get(text);
        if (cached) {
          setTip({ visible: true, loading: false, text: cached, error: false, x, y });
          return;
        }

        setTip({ visible: true, loading: true, text: "", error: false, x, y });
        try {
          const translated = await translate(text, ac.signal);
          if (token === tokenRef.current) {
            setTip({ visible: true, loading: false, text: translated, error: false, x, y });
          }
        } catch (err) {
          if ((err as Error)?.name === "AbortError") return;
          if (token === tokenRef.current) {
            setTip({ visible: true, loading: false, text: "अनुवाद उपलब्ध नहीं है", error: true, x, y });
          }
        }
      }, HOVER_DELAY_MS);
    }

    function onMouseOut(e: MouseEvent) {
      // Only hide when leaving the current element entirely.
      const related = e.relatedTarget as Node | null;
      if (currentEl.current && related && currentEl.current.contains(related)) return;
      hide();
    }

    function onScroll() {
      hide();
    }

    document.addEventListener("mouseover", onMouseOver);
    document.addEventListener("mouseout", onMouseOut);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("mouseout", onMouseOut);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, []);

  function toggle() {
    setEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(ENABLED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      if (!next) hide();
      return next;
    });
  }

  return (
    <>
      {tip.visible && (
        <div
          data-hovertx-ui
          role="tooltip"
          lang="hi"
          className="pointer-events-none fixed z-[100] max-w-xs rounded-lg bg-slate-900 px-3 py-2 text-sm text-white shadow-xl ring-1 ring-black/10"
          style={{ left: tip.x, top: tip.y }}
        >
          <span className="mb-0.5 block text-[10px] uppercase tracking-wide text-slate-400">हिन्दी अनुवाद</span>
          {tip.loading ? (
            <span className="flex items-center gap-2 text-slate-200">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-500 border-t-white" />
              अनुवाद हो रहा है…
            </span>
          ) : (
            <span className={tip.error ? "text-amber-300" : ""}>{tip.text}</span>
          )}
        </div>
      )}

      <button
        data-hovertx-ui
        type="button"
        onClick={toggle}
        title={enabled ? "Hindi hover-translate: ON (click to turn off)" : "Hindi hover-translate: OFF (click to turn on)"}
        aria-pressed={enabled}
        className={`fixed bottom-4 left-4 z-[100] flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold shadow-lg ring-1 transition ${
          enabled
            ? "bg-brand-600 text-white ring-brand-700 hover:bg-brand-700"
            : "bg-white text-slate-500 ring-slate-300 hover:bg-slate-50"
        }`}
      >
        <span aria-hidden className="text-base leading-none">अ</span>
        <span className="hidden sm:inline">{enabled ? "Hindi: On" : "Hindi: Off"}</span>
      </button>
    </>
  );
}
