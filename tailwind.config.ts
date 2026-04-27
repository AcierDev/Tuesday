import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  safelist: [
    "bg-orange-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-green-700",
    "bg-green-900",
    "bg-red-900",
    "bg-red-500",
    "bg-green-600",
    "bg-yellow-500",
    "bg-yellow-900",
    "bg-orange-600",
    "bg-gray-400",
    "bg-lime-300",
    "text-gray-400",
    "text-orange-600",
    "text-lime-300",
    "text-blue-500",
    "text-green-500",
    "text-green-600",
    "text-yellow-500",
    "text-yellow-900",
    "text-red-500",
    "bg-green-500/10",
    "bg-green-900/20",
    "border-green-500/50",
    "border-green-400/30",
    "border-orange-600",
    "border-green-600",
    "border-lime-300",
    "text-yellow-300",
    "border-yellow-900",
    "border-yellow-300",
    "text-green-500",
    "text-green-400",
    "bg-blue-500/10",
    "bg-blue-900/20",
    "border-blue-500/50",
    "border-blue-400/30",
    "text-blue-500",
    "text-blue-400",
    "border-green-600",
    "border-yellow-500",
    "border-orange-600",
    "border-red-500",
    "border-lime-300",
  ],
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./typings/**/*.{js,ts,jsx,tsx,mdx}",
    // Required: lib/stats-shared.tsx renders chart classes (fill-slate-400,
    // text-white, bg-white/10, etc.) that would otherwise be purged.
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    // Required: getDueBadge() in utils/functions.tsx renders Tailwind
    // classes (bg-red-500, hover:bg-yellow-500, min-w-[2.25rem], etc.)
    // that would otherwise be purged in production.
    "./utils/**/*.{js,ts,jsx,tsx,mdx}",
    // Required: parseMinecraftColors.tsx at the repo root renders the
    // (N/M) fraction badge (bg-violet-500, etc.) which would otherwise
    // be purged.
    "./parseMinecraftColors.tsx",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      // Spacing scale tokens — name what existing values mean so future
      // work picks the right one instead of guessing px-4 vs px-8.
      // These map onto Tailwind's existing scale, so swapping does not
      // change rendered output.
      spacing: {
        "page-x": "1.5rem",     // px-6  — outer page horizontal padding
        "page-y": "2rem",       // py-8  — outer page vertical padding (default)
        "page-y-tight": "0.75rem", // py-3  — outer page vertical padding (dense pages like planner)
        "section-y": "1.5rem",  // py-6  — between major sections
        "stack-md": "1rem",     // gap-4 — default vertical gap between elements
        "stack-sm": "0.5rem",   // gap-2 — tight vertical gap
        "stack-lg": "1.5rem",   // gap-6 — wide vertical gap
      },
      boxShadow: {
        glass:
          "0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.5)",
        "glass-dark":
          "0 1px 2px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
        "table-header":
          "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)",
        "table-header-dark":
          "0 4px 6px -1px rgba(255,255,255,0.1), 0 2px 4px -2px rgba(255,255,255,0.1)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
export default config;
