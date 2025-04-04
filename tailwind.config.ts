import type { Config } from "tailwindcss";

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
    "text-orange-600",
    "text-lime-300",
    "text-blue-500",
    "text-green-500",
    "text-green-600",
    "text-yellow-500",
    "text-yellow-900",
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
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./typings/**/*.{js,ts,jsx,tsx,mdx}",
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
  plugins: [require("tailwindcss-animate")],
};
export default config;
