/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#121110',      // Warm dark neutral
          card: '#1c1a18',    // Warm dark card
          border: '#2e2a27',  // Card border
          text: '#f2ece4',    // Warm light text
          muted: '#8c827a',   // Warm muted gray
          accent: '#d97706',  // Amber accent
          accentHover: '#b45309',
          accentLight: '#f59e0b',
        }
      },
      fontFamily: {
        sans: ['Outfit', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
