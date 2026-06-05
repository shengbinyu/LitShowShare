/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        navy: {
          50: '#e8e8f0',
          100: '#c5c5d9',
          200: '#9f9fbe',
          300: '#7979a3',
          400: '#5d5d8f',
          500: '#41417a',
          600: '#3a3a6e',
          700: '#31315f',
          800: '#282850',
          900: '#1a1a2e',
          950: '#111120',
        },
        gold: {
          50: '#faf6e9',
          100: '#f2e8c6',
          200: '#e9d9a0',
          300: '#dfc87a',
          400: '#d4b85e',
          500: '#c9a84c',
          600: '#b8933d',
          700: '#9a7a32',
          800: '#7d6229',
          900: '#604a1f',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['Source Sans 3', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
