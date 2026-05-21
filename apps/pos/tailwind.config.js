/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
    "../../packages/shared/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        headline:  ["Braise", "serif"],
        script:    ["Hallrack", "cursive"],
        editorial: ["TheFabricant", "sans-serif"],
      },
      colors: {
        brand: {
          gold: "#cab170",
          "gold-dim": "#a8925a",
        },
      },
    },
  },
  plugins: [],
};
