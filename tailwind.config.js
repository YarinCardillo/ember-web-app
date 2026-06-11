import tailwindcssAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Space Grotesk",
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        display: ["Space Grotesk", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        /* shadcn/ui semantic tokens (TE light theme) */
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        brand: {
          DEFAULT: "hsl(var(--brand) / <alpha-value>)",
          foreground: "hsl(var(--brand-foreground) / <alpha-value>)",
        },

        // Legacy colors (kept for compatibility)
        "ember-orange": "#ff6b35",
        "amber-glow": "#ffaa00",
        "dark-bg": "#1a1a1a",
        "text-light": "#e8dccc",

        // New premium palette
        "bg-primary": "#0A0A0B",
        "bg-secondary": "#111113",
        "bg-tertiary": "#18181B",
        "bg-hover": "#1F1F23",
        "accent-primary": "#F59E0B",
        "accent-bright": "#FBBF24",
        "text-primary": "#e8dccc",
        "text-secondary": "#A1A1AA",
        "text-tertiary": "#52525B",
        "text-warm": "#e8dccc",
        "meter-green": "#4ADE80",
        "meter-yellow": "#FACC15",
        "meter-red": "#F87171",
      },
      keyframes: {
        "spin-slow-down": {
          "0%": {
            transform: "rotate(0deg)",
            animationTimingFunction: "ease-out",
          },
          "100%": {
            transform: "rotate(180deg)",
          },
        },
        "spin-speed-up": {
          "0%": {
            transform: "rotate(0deg)",
            animationTimingFunction: "ease-in",
          },
          "100%": {
            transform: "rotate(720deg)", // Multiple rotations for "catching up"
          },
        },
        "pulse-glow": {
          "0%, 100%": {
            boxShadow: "0 0 15px rgba(245, 158, 11, 0.3)",
          },
          "50%": {
            boxShadow: "0 0 25px rgba(245, 158, 11, 0.5)",
          },
        },
        "warning-pulse": {
          "0%, 100%": {
            boxShadow: "0 0 15px rgba(239, 68, 68, 0.3)",
          },
          "50%": {
            boxShadow: "0 0 25px rgba(239, 68, 68, 0.6)",
          },
        },
      },
      animation: {
        "spin-slow-down": "spin-slow-down 2.5s ease-out forwards",
        "spin-speed-up": "spin-speed-up 2.5s ease-in forwards",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "warning-pulse": "warning-pulse 0.5s ease-in-out infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
