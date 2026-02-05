/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#050505', // Deep Black
          800: '#0a0a0a', // Card Black
          700: '#1a1a1a', // Borders
        },
        brand: {
          400: '#60a5fa',
          500: '#3b82f6', // Main Blue
          600: '#2563eb',
          900: '#1e3a8a',
        }
      }
    },
  },
  plugins: [],
}