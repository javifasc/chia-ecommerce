/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        // Usado por la barra de compra del detalle de producto.
        "xs": "380px",
      },
      colors: {
        "primary": "#51b800",
        // Oscurecido desde #3e8d00 para alcanzar contraste AA (4.9:1) sobre blanco.
        "primary-dark": "#35800a",
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
        // Radio editorial de las tarjetas grandes de la landing.
        "card": "2.5rem",
        "full": "9999px",
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
