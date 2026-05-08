import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.stories.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0A0E1A",
          900: "#101624",
          800: "#172033"
        },
        bg: {
          primary: "var(--bg-primary)",
          elevated: "var(--bg-elevated)",
          glass: "var(--bg-glass)"
        },
        brand: {
          primary: "var(--color-primary)",
          accent: "var(--color-accent)",
          purple: "var(--color-purple)"
        },
        signal: {
          success: "var(--color-success)",
          warning: "var(--color-warning)",
          danger: "var(--color-danger)"
        }
      },
      fontFamily: {
        display: ["var(--font-display)", "Orbitron", "Space Grotesk", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "Inter", "Noto Sans SC", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "Space Grotesk", "ui-monospace", "monospace"]
      },
      borderRadius: {
        control: "0.75rem",
        bubble: "0.75rem"
      },
      backgroundImage: {
        "user-message": "linear-gradient(135deg, #1A73E8 0%, #7C4DFF 100%)",
        "cosmic-grid":
          "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)"
      },
      boxShadow: {
        glow: "0 0 20px rgba(26, 115, 232, 0.35), 0 0 40px rgba(0, 229, 255, 0.12)",
        "glow-cyan": "0 0 24px rgba(0, 229, 255, 0.32)",
        "glow-purple": "0 0 24px rgba(124, 77, 255, 0.34)"
      },
      keyframes: {
        "pulse-aura": {
          "0%, 100%": { boxShadow: "0 0 18px rgba(0, 229, 255, 0.18)" },
          "50%": { boxShadow: "0 0 34px rgba(0, 229, 255, 0.42)" }
        },
        "cursor-blink": {
          "0%, 45%": { opacity: "1" },
          "46%, 100%": { opacity: "0" }
        },
        drift: {
          "0%": { transform: "translate3d(0, 0, 0)" },
          "100%": { transform: "translate3d(-2rem, -1.5rem, 0)" }
        }
      },
      animation: {
        "pulse-aura": "pulse-aura 2.4s ease-in-out infinite",
        "cursor-blink": "cursor-blink 1s steps(1) infinite",
        drift: "drift 12s ease-in-out infinite alternate"
      }
    }
  },
  plugins: []
};

export default config;
