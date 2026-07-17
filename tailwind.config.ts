import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    screens: {
      xs: "475px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-space)", "system-ui", "sans-serif"],
        display: ["var(--font-syne)", "system-ui", "sans-serif"],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        cardForeground: "hsl(var(--card-foreground))",
        muted: "hsl(var(--muted))",
        mutedForeground: "hsl(var(--muted-foreground))",
        primary: "hsl(var(--primary))",
        primaryForeground: "hsl(var(--primary-foreground))",
        accent: "hsl(var(--accent))",
        accentForeground: "hsl(var(--accent-foreground))",
        border: "hsl(var(--border))",
        ring: "hsl(var(--ring))",
        glow: "hsl(var(--glow))",
        gold: {
          50: "hsl(var(--gold-50))",
          DEFAULT: "hsl(var(--gold-100))",
          deep: "hsl(var(--gold-200))",
          dim: "hsl(var(--gold-dim))",
        },
        emerald: {
          DEFAULT: "hsl(var(--emerald))",
          dim: "hsl(var(--emerald-dim))",
          muted: "hsl(var(--emerald-dim))",
        },
        violet: {
          DEFAULT: "hsl(var(--violet))",
          dim: "hsl(var(--violet-dim))",
          muted: "hsl(var(--violet-dim))",
        },
        surface: {
          0: "hsl(var(--surface-0))",
          1: "hsl(var(--surface-1))",
          2: "hsl(var(--surface-2))",
          3: "hsl(var(--surface-3))",
        },
        navy: "hsl(225 20% 12%)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        glass:
          "0 1px 0 rgba(255,255,255,0.04) inset, 0 20px 60px -12px rgba(0,0,0,0.5)",
        glow: "0 0 20px rgba(243, 186, 47, 0.12)",
        "glow-lg": "0 0 40px rgba(243, 186, 47, 0.15), 0 0 80px rgba(243, 186, 47, 0.06)",
        "card-hover":
          "0 20px 60px -12px rgba(0,0,0,0.6), 0 0 40px -8px rgba(243, 186, 47, 0.05)",
      },
      backgroundImage: {
        "radial-glow":
          "radial-gradient(ellipse at 25% 20%, rgba(243, 186, 47, 0.1), transparent 55%)",
        "panel-gradient":
          "linear-gradient(135deg, rgba(148, 163, 184, 0.04), rgba(15, 23, 42, 0.3))",
      },
      transitionTimingFunction: {
        "soft-spring": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        "gradient-shift": {
          "0%": { transform: "translate3d(0, 0, 0)", opacity: "0.5" },
          "50%": { transform: "translate3d(-4%, 3%, 0)", opacity: "0.7" },
          "100%": { transform: "translate3d(3%, -2%, 0)", opacity: "0.5" },
        },
        "aura-breathe": {
          "0%": { transform: "scale(1) translate3d(0, 0, 0)", opacity: "0.4" },
          "33%": { transform: "scale(1.03) translate3d(-2%, 1%, 0)", opacity: "0.55" },
          "66%": { transform: "scale(1.02) translate3d(2%, -1%, 0)", opacity: "0.5" },
          "100%": { transform: "scale(1) translate3d(0, 0, 0)", opacity: "0.4" },
        },
        "hero-glow": {
          "0%": { transform: "scale(1)", opacity: "0.2" },
          "50%": { transform: "scale(1.02)", opacity: "0.3" },
          "100%": { transform: "scale(1)", opacity: "0.2" },
        },
        "particle-float": {
          "0%": { transform: "translate3d(0, 0, 0)", opacity: "0.12" },
          "50%": { transform: "translate3d(2%, -8%, 0)", opacity: "0.25" },
          "100%": { transform: "translate3d(-2%, -16%, 0)", opacity: "0.12" },
        },
        "particle-drift": {
          "0%": { transform: "translate3d(0, 0, 0)", opacity: "0.1" },
          "50%": { transform: "translate3d(-3%, -10%, 0)", opacity: "0.22" },
          "100%": { transform: "translate3d(3%, -20%, 0)", opacity: "0.06" },
        },
        "orb-float-slow": {
          "0%": { transform: "translate3d(0, 0, 0)", opacity: "0.4" },
          "50%": { transform: "translate3d(3%, -4%, 0)", opacity: "0.6" },
          "100%": { transform: "translate3d(-2%, 2%, 0)", opacity: "0.4" },
        },
        "orb-float-slower": {
          "0%": { transform: "translate3d(0, 0, 0)", opacity: "0.3" },
          "50%": { transform: "translate3d(-4%, 3%, 0)", opacity: "0.5" },
          "100%": { transform: "translate3d(2%, -1%, 0)", opacity: "0.3" },
        },
        "orb-drift": {
          "0%": { transform: "translate3d(0, 0, 0)", opacity: "0.2" },
          "50%": { transform: "translate3d(5%, 1%, 0)", opacity: "0.35" },
          "100%": { transform: "translate3d(-3%, -2%, 0)", opacity: "0.2" },
        },
        "liquid-drift-1": {
          "0%": { transform: "translate3d(0, 0, 0) scale(1)", opacity: "0.1" },
          "33%": { transform: "translate3d(-3%, 2%, 0) scale(1.03)", opacity: "0.07" },
          "66%": { transform: "translate3d(1%, -1%, 0) scale(0.98)", opacity: "0.09" },
          "100%": { transform: "translate3d(0, 0, 0) scale(1)", opacity: "0.1" },
        },
        "liquid-drift-2": {
          "0%": { transform: "translate3d(0, 0, 0) scale(1)", opacity: "0.08" },
          "40%": { transform: "translate3d(2%, -3%, 0) scale(1.05)", opacity: "0.06" },
          "70%": { transform: "translate3d(-2%, 1%, 0) scale(0.96)", opacity: "0.08" },
          "100%": { transform: "translate3d(0, 0, 0) scale(1)", opacity: "0.08" },
        },
        "liquid-drift-3": {
          "0%": { transform: "translate3d(0, 0, 0) scale(1)", opacity: "0.07" },
          "35%": { transform: "translate3d(4%, 1%, 0) scale(1.04)", opacity: "0.05" },
          "65%": { transform: "translate3d(-1%, -2%, 0) scale(0.97)", opacity: "0.07" },
          "100%": { transform: "translate3d(0, 0, 0) scale(1)", opacity: "0.07" },
        },
        "liquid-drift-4": {
          "0%": { transform: "translate3d(0, 0, 0) scale(1)", opacity: "0.06" },
          "38%": { transform: "translate3d(-4%, -2%, 0) scale(1.05)", opacity: "0.04" },
          "68%": { transform: "translate3d(2%, 3%, 0) scale(0.97)", opacity: "0.06" },
          "100%": { transform: "translate3d(0, 0, 0) scale(1)", opacity: "0.06" },
        },
        "liquid-drift-5": {
          "0%": { transform: "translate3d(0, 0, 0) scale(1)", opacity: "0.09" },
          "36%": { transform: "translate3d(3%, -4%, 0) scale(1.03)", opacity: "0.06" },
          "72%": { transform: "translate3d(-2%, 1%, 0) scale(0.98)", opacity: "0.08" },
          "100%": { transform: "translate3d(0, 0, 0) scale(1)", opacity: "0.09" },
        },
        "gradient-pan": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "0.65", transform: "scale(1.03)" },
        },
        "capital-breathe": {
          "0%, 100%": { transform: "scale(1)", opacity: "0.6" },
          "50%": { transform: "scale(1.01)", opacity: "0.8" },
        },
        "halo-expand": {
          "0%, 100%": { transform: "scale(1)", opacity: "0.25" },
          "50%": { transform: "scale(1.06)", opacity: "0.4" },
        },
        "flow-glow": {
          "0%, 100%": { opacity: "0.5", transform: "scale(1)" },
          "50%": { opacity: "0.75", transform: "scale(1.01)" },
        },
        "slide-in-from-right": {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "slide-out-to-right": {
          "0%": { transform: "translateX(0)", opacity: "1" },
          "100%": { transform: "translateX(100%)", opacity: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(calc(-100% - var(--gap)))" },
        },
        "marquee-vertical": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(calc(-100% - var(--gap)))" },
        },
      },
      animation: {
        "gradient-shift": "gradient-shift 42s ease-in-out infinite",
        "gradient-pan": "gradient-pan 60s ease-in-out infinite",
        "aura-breathe": "aura-breathe 28s ease-in-out infinite",
        "hero-glow": "hero-glow 45s ease-in-out infinite",
        "particle-float": "particle-float 32s ease-in-out infinite",
        "particle-drift": "particle-drift 26s ease-in-out infinite",
        "orb-float-slow": "orb-float-slow 38s ease-in-out infinite",
        "orb-float-slower": "orb-float-slower 44s ease-in-out infinite",
        "orb-drift": "orb-drift 34s ease-in-out infinite",
        "liquid-drift-1": "liquid-drift-1 47s ease-in-out infinite",
        "liquid-drift-2": "liquid-drift-2 41s ease-in-out infinite",
        "liquid-drift-3": "liquid-drift-3 38s ease-in-out infinite",
        "liquid-drift-4": "liquid-drift-4 50s ease-in-out infinite",
        "liquid-drift-5": "liquid-drift-5 35s ease-in-out infinite",
        "pulse-glow": "pulse-glow 8s ease-in-out infinite",
        "flow-glow": "flow-glow 18s ease-in-out infinite",
        "capital-breathe": "capital-breathe 15s ease-in-out infinite",
        "halo-expand": "halo-expand 15s ease-in-out infinite",
        "slide-in-from-right": "slide-in-from-right 0.3s ease-out",
        "slide-out-to-right": "slide-out-to-right 0.2s ease-in",
        "fade-in": "fade-in 0.2s ease-out",
        "fade-out": "fade-out 0.15s ease-in",
        marquee: "marquee var(--duration) linear infinite",
        "marquee-vertical": "marquee-vertical var(--duration) linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
