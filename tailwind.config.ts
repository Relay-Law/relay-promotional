import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["var(--font-onest)", "system-ui", "-apple-system", "sans-serif"],
        sans: ["var(--font-inter-tight)", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        bg: "var(--bg)",
        "bg-1": "var(--bg-1)",
        paper: "var(--paper)",
        "paper-2": "var(--paper-2)",
        "paper-ink": "var(--paper-ink)",
        ink: "var(--ink)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        gold: "var(--gold)",
        ok: "var(--ok)",
        coral: {
          DEFAULT: "var(--coral)",
          2: "var(--coral-2)",
          deep: "var(--coral-deep)",
          tint: "var(--coral-tint)",
          "tint-2": "var(--coral-tint-2)",
          glow: "var(--coral-glow)",
        },
        // text scale
        t1: "var(--text-1)",
        t2: "var(--text-2)",
        t3: "var(--text-3)",
        t4: "var(--text-4)",
        // hairlines
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
        "line-paper": "var(--line-paper)",
        "line-paper-2": "var(--line-paper-2)",
        "line-coral": "var(--line-coral)",
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        "float-a": {
          "0%, 100%": { transform: "rotate(-3.5deg) translateY(0)" },
          "50%": { transform: "rotate(-3.5deg) translateY(-6px)" },
        },
        "float-b": {
          "0%, 100%": { transform: "rotate(2.5deg) translateY(0)" },
          "50%": { transform: "rotate(2.5deg) translateY(-7px)" },
        },
        "float-c": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
      animation: {
        "pulse-dot": "pulse-dot 2.4s ease-in-out infinite",
        marquee: "marquee 42s linear infinite",
        "float-a": "float-a 7s ease-in-out infinite",
        "float-b": "float-b 8s ease-in-out infinite",
        "float-c": "float-c 9s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
