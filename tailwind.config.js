/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'combo-in': {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '50%': { transform: 'scale(1.08)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
        'icon-sway': {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        'icon-glow': {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 6px rgba(45, 212, 191, 0.4))' },
          '50%': { opacity: '0.95', filter: 'drop-shadow(0 0 12px rgba(45, 212, 191, 0.6))' },
        },
      },
      animation: {
        'combo-in': 'combo-in 0.35s ease-out forwards',
        shake: 'shake 0.2s ease-in-out 2',
        'icon-sway': 'icon-sway 2s ease-in-out infinite',
        'icon-glow': 'icon-glow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
