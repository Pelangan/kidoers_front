/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(20 30% 98%)",
        foreground: "hsl(15 25% 15%)",
        primary: {
          DEFAULT: "hsl(12 85% 65%)",
          foreground: "hsl(0 0% 100%)",
        },
        secondary: {
          DEFAULT: "hsl(260 30% 92%)",
          foreground: "hsl(260 30% 25%)",
        },
        accent: {
          DEFAULT: "hsl(140 30% 90%)",
          foreground: "hsl(140 40% 25%)",
        },
        muted: {
          DEFAULT: "hsl(30 40% 95%)",
          foreground: "hsl(30 15% 45%)",
        },
        card: {
          DEFAULT: "hsl(25 40% 97%)",
          foreground: "hsl(15 25% 15%)",
        },
        border: "hsl(25 20% 88%)",
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
      },
      backgroundImage: {
        "gradient-warm": "linear-gradient(135deg, hsl(12 85% 65%), hsl(25 85% 70%))",
        "gradient-soft": "linear-gradient(180deg, hsl(260 30% 98%), hsl(140 30% 96%))",
        "gradient-card": "linear-gradient(145deg, hsl(25 40% 98%), hsl(30 40% 96%))",
      },
      boxShadow: {
        soft: "0 4px 20px hsla(12, 35%, 70%, 0.15)",
        card: "0 2px 12px hsla(12, 25%, 60%, 0.1)",
        button: "0 3px 15px hsla(12, 65%, 65%, 0.25)",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
        bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        DEFAULT: "0.5rem",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
