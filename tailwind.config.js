/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        "primary": "#51b800",
        "primary-dark": "#3e8d00",
        "primary-content": "#ffffff",
        "background-light": "#fbf9f4",
        "background-dark": "#1a1c18",
        "surface-light": "#ffffff",
        "surface-dark": "#252b21",
        "sage": "#433e3a",
        "sage-light": "#e9ece5",
        "soft-orange": "#f4a261",
        "text-main": "#35322f",
        "text-secondary": "#5c5854",
      },
      fontFamily: {
        "display": ["Plus Jakarta Sans", "sans-serif"],
      },
      borderRadius: {
        "DEFAULT": "0.5rem",
        "lg": "1rem",
        "xl": "1.5rem",
        "2xl": "2rem",
        "full": "9999px",
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
