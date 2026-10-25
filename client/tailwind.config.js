/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Sora', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: { 950: '#070509', 900: '#0b0a10', 800: '#121018', 700: '#1a1723' },
        blood: { 400: '#ff5d73', 500: '#ff3355', 600: '#e11d48', 700: '#be123c' },
      },
      boxShadow: {
        glow: '0 0 24px rgba(255,51,85,0.35)',
        'glow-lg': '0 0 60px rgba(255,51,85,0.25)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        float: 'float 7s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-14px)' },
        },
      },
    },
  },
  plugins: [],
};
