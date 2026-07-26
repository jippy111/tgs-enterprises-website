export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111111",
        stoneSoft: "#F6F0E8",
        sand: "#D8C7B0",
        latte: "#B99B7C",
        clay: "#8D6F5A",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Playfair Display", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 20px 50px rgba(17, 17, 17, 0.08)",
      },
    },
  },
  plugins: [],
};
