import type { Config } from "tailwindcss";
import base from "../tailwind.config";

/**
 * Mobile build reuses the exact web theme (../tailwind.config.ts) but scans the
 * mobile app tree plus the shared components in ../src/components.
 */
const config: Config = {
  ...base,
  content: [
    "./app/**/*.{ts,tsx}",
    "../src/components/**/*.{ts,tsx}",
  ],
};

export default config;
