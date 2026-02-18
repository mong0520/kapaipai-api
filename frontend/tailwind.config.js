/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        vault: {
          950: "#06080d",
          900: "#0c1018",
          850: "#111722",
          800: "#171e2c",
          700: "#1e2840",
          600: "#2a3654",
          500: "#3d4f6e",
        },
        gold: {
          50: "#fefce8",
          100: "#fef5c3",
          200: "#fde98a",
          300: "#fcd647",
          400: "#f7c515",
          500: "#e7ad09",
          600: "#c78505",
          700: "#9f5f08",
          800: "#834b0f",
          900: "#703d13",
        },
        ember: {
          400: "#fb923c",
          500: "#f97316",
        },
      },
      fontFamily: {
        display: ['"Barlow Condensed"', "sans-serif"],
        body: ['"DM Sans"', "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out forwards",
        "slide-up": "slideUp 0.4s ease-out forwards",
        "pulse-gold": "pulseGold 2s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGold: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(247, 197, 21, 0.2)" },
          "50%": { boxShadow: "0 0 20px 4px rgba(247, 197, 21, 0.15)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
