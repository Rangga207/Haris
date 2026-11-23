import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#1B365D",
          hover: "#142947",
          light: "#234677",
        },
        blue: {
          DEFAULT: "#005A9C",
          hover: "#00477D",
          light: "#0070C0",
        },
        sky: {
          DEFAULT: "#60C1E5",
          hover: "#45B4DC",
          light: "#82CDEB",
        },
        ice: {
          DEFAULT: "#A0E0EF",
          tint: "rgba(160, 224, 239, 0.35)",
        },
        canvas: "#F5F8FB",
        body: "#1F2937",
        muted: "#6B7280",
        borderline: "#E2E8F0",
        // Semantic status and priority colors
        semantic: {
          red: {
            DEFAULT: "#DC2626",
            light: "#FEE2E2",
            border: "#FCA5A5",
          },
          orange: {
            DEFAULT: "#EA580C",
            light: "#FFEDD5",
            border: "#FDBA74",
          },
          amber: {
            DEFAULT: "#D97706",
            light: "#FEF3C7",
            border: "#FCD34D",
          },
          green: {
            DEFAULT: "#16A34A",
            light: "#DCFCE7",
            border: "#86EFAC",
          },
          slate: {
            DEFAULT: "#64748B",
            light: "#F1F5F9",
            border: "#CBD5E1",
          },
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
