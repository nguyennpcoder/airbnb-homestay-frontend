import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      'xs': '375px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      spacing: {
        // Custom spacing for sticky map offset (used as `top-34`)
        34: "8.5rem",
        // Mobile safe areas
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      colors: {
        airbnb: {
          red: "#FF385C",
          dark: "#222222",
          gray: "#717171",
          lightgray: "#F7F7F7",
        },
      },
      keyframes: {
        heartBeat: {
          '0%, 100%': { transform: 'scale(1)' },
          '25%': { transform: 'scale(1.3)' },
          '50%': { transform: 'scale(1.1)' },
          '75%': { transform: 'scale(1.25)' },
        },
        heartPulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.15)', opacity: '0.8' },
        },
        fadeInScale: {
          'from': { opacity: '0', transform: 'scale(0.8)' },
          'to': { opacity: '1', transform: 'scale(1)' },
        },
        slideInUp: {
          'from': { opacity: '0', transform: 'translateY(20px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        heartBeat: 'heartBeat 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        heartPulse: 'heartPulse 1s ease-in-out infinite',
        fadeInScale: 'fadeInScale 0.3s ease-out',
        slideInUp: 'slideInUp 0.4s ease-out',
      },
    },
  },
  plugins: [],
};
export default config;
