/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ember-orange': '#ff6b35',
        'amber-glow': '#ffaa00',
        'dark-bg': '#1a1a1a',
        'text-light': '#e0e0e0',
      },
    },
  },
  plugins: [],
}

