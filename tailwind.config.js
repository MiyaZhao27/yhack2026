/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        paper: "#f8fafc",
        mint: "#d1fae5",
        coral: "#fed7d7",
        sky: "#dbeafe",
        gold: "#fef3c7",
      },
      boxShadow: {
        card: "0 24px 60px -30px rgba(15, 23, 42, 0.35)",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
