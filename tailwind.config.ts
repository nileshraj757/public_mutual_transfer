import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef5ff",
          100: "#d9e8ff",
          200: "#bcd6ff",
          300: "#8ebcff",
          400: "#5996ff",
          500: "#326ef6",
          600: "#1e51eb",
          700: "#173dd4",
          800: "#1934ac",
          900: "#1a3288",
        },
      },
    },
  },
  plugins: [],
};

export default config;
