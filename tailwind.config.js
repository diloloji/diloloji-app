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
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Montserrat', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        night: {
          950: '#0a0e17',
          900: '#0d1117',
          800: '#151d2e',
        },
        accent: {
          DEFAULT: 'rgb(99 102 241)', // indigo-500, softer in dark
          soft: 'rgb(129 140 248)',   // indigo-400
          muted: 'rgba(99, 102, 241, 0.15)',
        },
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'glass': '0 4px 24px -1px rgba(0, 0, 0, 0.1), 0 2px 8px -2px rgba(0, 0, 0, 0.08)',
        'glass-dark': '0 4px 24px -1px rgba(0, 0, 0, 0.35), 0 2px 8px -2px rgba(0, 0, 0, 0.2)',
        'glow-soft': '0 0 40px -8px rgba(99, 102, 241, 0.25)',
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
        'combo-wiggle': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-2px)' },
          '75%': { transform: 'translateX(2px)' },
        },
        'icon-sway': {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        'icon-glow': {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 6px rgba(45, 212, 191, 0.4))' },
          '50%': { opacity: '0.95', filter: 'drop-shadow(0 0 12px rgba(45, 212, 191, 0.6))' },
        },
        'menu-in': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'float-symbol': {
          '0%, 100%': { transform: 'translateY(0) scale(1)', opacity: '0.15' },
          '50%': { transform: 'translateY(-8px) scale(1.05)', opacity: '0.35' },
        },
        'glow-green': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(34, 197, 94, 0.2), 0 0 40px rgba(34, 197, 94, 0.08)' },
          '50%': { boxShadow: '0 0 32px rgba(34, 197, 94, 0.35), 0 0 60px rgba(34, 197, 94, 0.12)' },
        },
        'glow-pink': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(236, 72, 153, 0.2), 0 0 40px rgba(236, 72, 153, 0.08)' },
          '50%': { boxShadow: '0 0 32px rgba(236, 72, 153, 0.35), 0 0 60px rgba(236, 72, 153, 0.12)' },
        },
        'mic-pulse': {
          '0%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.55)' },
          '70%': { boxShadow: '0 0 0 10px rgba(239, 68, 68, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0)' },
        },
      },
      animation: {
        'combo-in': 'combo-in 0.35s ease-out forwards',
        'menu-in': 'menu-in 0.2s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.25s ease-out forwards',
        shake: 'shake 0.2s ease-in-out 2',
        'combo-wiggle': 'combo-wiggle 0.4s ease-in-out infinite',
        'icon-sway': 'icon-sway 2s ease-in-out infinite',
        'icon-glow': 'icon-glow 2s ease-in-out infinite',
        'float-symbol': 'float-symbol 6s ease-in-out infinite',
        'glow-green': 'glow-green 3s ease-in-out infinite',
        'glow-pink': 'glow-pink 3s ease-in-out infinite',
        'mic-pulse': 'mic-pulse 1.4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      backgroundImage: {
        'gradient-landing': 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
      },
    },
  },
  plugins: [],
}
