/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0b0c0e",
        panel: "#111317",
        line: "#23262c",
        ink: "#e9eaec",
        dim: "#9aa1ab",
        gold: "#d9a441",
        "gold-bright": "#e8bc63",
      },
      fontFamily: {
        sans: ["var(--font-archivo)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
