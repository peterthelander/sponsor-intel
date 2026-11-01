import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#101418",
        graphite: "#25303a",
        steel: "#5f6f7c",
        paper: "#f6f4ef",
        line: "#d9d3c8",
        pine: "#16423c",
        copper: "#b35d2a",
        ice: "#e8f1f2",
      },
      boxShadow: {
        "focus-panel": "0 24px 80px rgba(16, 20, 24, 0.13)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Georgia", "Times New Roman", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
