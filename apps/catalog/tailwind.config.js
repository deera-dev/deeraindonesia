export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
    "../../packages/shared/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        headline: ["Braise", "serif"],
        script: ["Hallrack", "cursive"],
        editorial: ["TheFabricant", "sans-serif"],
      },
      colors: {
        brand: {
          green: "#2e412d",
          "green-light": "#3a5238",
          gold: "#cab170",
          "gold-dim": "#a8925a",
        },
      },
    },
  },
  plugins: [],
};
