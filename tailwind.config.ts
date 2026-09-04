import type { Config } from "tailwindcss";

// Content globs cover every directory the team writes UI in.
// Person B owns theme customisation (colors, fonts) — extend `theme` below.
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
