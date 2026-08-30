import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Forest green — the app's primary accent. Ramp is aligned so 600 is
        // the primary fill (#146152) and 700 its hover, matching every existing
        // `bg-brand-600 hover:bg-brand-700` usage without per-file edits.
        brand: {
          50: "#E9F3EE",
          100: "#D3E7DD",
          200: "#A9D0BF",
          300: "#7DB6A0",
          400: "#3E9077",
          500: "#1C7862",
          600: "#146152",
          700: "#0F4E42",
          800: "#0C3F36",
          900: "#08302A",
        },
        // Amber — the secondary accent (swap arrows, highlights, premium).
        secondary: {
          50: "#FEF7EA",
          100: "#FBEED6",
          200: "#F4E3C4",
          300: "#EBD6A6",
          400: "#F0A63C",
          500: "#D98E1B",
          600: "#B77716",
          700: "#8F5D12",
        },
        // Warm neutral canvas + ink, replacing cold slate everywhere.
        sand: {
          50: "#FBFAF7",
          100: "#F4F0E9",
          200: "#E7E0D3",
          300: "#D3C8B8",
          400: "#AF9F8B",
          500: "#8C7C68",
          600: "#64716C",
          700: "#52463A",
          800: "#372E25",
          900: "#1E2B28",
        },
      },
      fontFamily: {
        // Sora is a geometric sans used as the *display* face (headings, logo,
        // numeric badges); Instrument Sans carries body/UI text.
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        warm: "0 1px 2px 0 rgb(20 51 43 / 0.05), 0 1px 3px 0 rgb(20 51 43 / 0.07)",
        "warm-md": "0 4px 10px -2px rgb(20 51 43 / 0.10), 0 2px 6px -2px rgb(20 51 43 / 0.06)",
        "warm-lg": "0 12px 28px -6px rgb(20 51 43 / 0.18), 0 4px 10px -4px rgb(20 51 43 / 0.08)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.94)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        // Marching-ants along dashed swap routes.
        "mt-dash": {
          to: { strokeDashoffset: "-60" },
        },
        // Gentle bob for hero location cards.
        "mt-float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-7px)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-2deg)" },
          "50%": { transform: "rotate(2deg)" },
        },
        // ts-* — Transfer Setu mobile "glass" redesign keyframes. Additive:
        // named distinctly from the ones above so nothing existing changes.
        "ts-blob-drift": {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "50%": { transform: "translate(30px,-24px) scale(1.08)" },
        },
        "ts-blob-drift-2": {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "50%": { transform: "translate(-26px,22px) scale(1.05)" },
        },
        "ts-dot-pulse": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.35", transform: "scale(0.78)" },
        },
        "ts-card-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "ts-pop-ring": {
          "0%": { opacity: "1", transform: "scale(0.9)" },
          "100%": { opacity: "0", transform: "scale(1.15)" },
        },
        "ts-sweep": {
          "0%": { transform: "translateX(-130%) skewX(-12deg)" },
          "100%": { transform: "translateX(230%) skewX(-12deg)" },
        },
        "ts-toast-in": {
          from: { opacity: "0", transform: "translate(-50%,10px)" },
          to: { opacity: "1", transform: "translate(-50%,0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.5s cubic-bezier(0.16,1,0.3,1) both",
        "pop-in": "pop-in 0.35s cubic-bezier(0.16,1,0.3,1) both",
        "mt-dash": "mt-dash 3s linear infinite",
        "mt-float": "mt-float 5s ease-in-out infinite",
        wiggle: "wiggle 0.5s ease-in-out",
        "ts-blob-drift": "ts-blob-drift 14s ease-in-out infinite",
        "ts-blob-drift-2": "ts-blob-drift-2 17s ease-in-out infinite",
        "ts-dot-pulse": "ts-dot-pulse 1.6s ease-in-out infinite",
        "ts-card-in": "ts-card-in 0.4s ease-out both",
        "ts-pop-ring": "ts-pop-ring 0.6s ease-out",
        "ts-sweep": "ts-sweep 3.5s ease-in-out infinite",
        "ts-toast-in": "ts-toast-in 0.3s cubic-bezier(0.34,1.56,0.64,1)",
      },
    },
  },
  plugins: [],
};

export default config;
