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
      keyframes: {
        'spin-slow-down': {
          '0%': { 
            transform: 'rotate(0deg)',
            animationTimingFunction: 'ease-out'
          },
          '100%': { 
            transform: 'rotate(180deg)',
          },
        },
        'spin-speed-up': {
          '0%': { 
            transform: 'rotate(0deg)',
            animationTimingFunction: 'ease-in'
          },
          '100%': { 
            transform: 'rotate(720deg)', // Multiple rotations for "catching up"
          },
        },
        'pulse-glow': {
          '0%, 100%': {
            boxShadow: '0 0 15px rgba(245, 158, 11, 0.3)',
          },
          '50%': {
            boxShadow: '0 0 25px rgba(245, 158, 11, 0.5)',
          },
        },
        'warning-pulse': {
          '0%, 100%': {
            boxShadow: '0 0 15px rgba(239, 68, 68, 0.3)',
          },
          '50%': {
            boxShadow: '0 0 25px rgba(239, 68, 68, 0.6)',
          },
        },
      },
      animation: {
        'spin-slow-down': 'spin-slow-down 2.5s ease-out forwards',
        'spin-speed-up': 'spin-speed-up 2.5s ease-in forwards',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'warning-pulse': 'warning-pulse 0.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

