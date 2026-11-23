import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        opendyslexic: ["OpenDyslexic", "system-ui", "sans-serif"],
        sans: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      colors: {
        pastel: {
          cream: "#fdfbf7",
          yellow: "#fef9c3",
          blue: "#e0f2fe",
          peach: "#ffedd5",
          green: "#dcfce7",
          rose: "#ffe4e6",
          purple: "#f3e8ff",
        },
        highcontrast: {
          black: "#000000",
          white: "#ffffff",
          yellow: "#ffff00",
          cyan: "#00ffff",
          border: "#ffffff",
        },
      },
      lineHeight: {
        dyslexic: "2.0",
        relaxed: "1.75",
      },
      letterSpacing: {
        dyslexic: "0.12em",
        wide: "0.05em",
      },
    },
  },
  plugins: [],
};

export default config;
