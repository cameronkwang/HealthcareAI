/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
      },
      colors: {
        primary: {
          DEFAULT: '#2563eb',
          dark: '#1e3a8a',
        },
        secondary: {
          DEFAULT: '#3b82f6',
        },
        accent: '#38bdf8',
        background: '#f8fafc',
        text: '#1e293b',
      },
    },
  },
  darkMode: 'class',
  plugins: [],
}

