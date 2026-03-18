/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Ink & Steel design system
        ink: {
          950: '#0C0B09',
          900: '#12110F',
          800: '#1A1814',
          700: '#221F1A',
          600: '#2C2820',
          500: '#3A3528',
        },
        gold: {
          50:  '#FDF8EC',
          100: '#F7EBC8',
          200: '#EDD58A',
          300: '#E0BB5C',
          400: '#C9A84C',
          500: '#A8893A',
          600: '#856B2C',
          700: '#634F1E',
          800: '#3E3010',
          900: '#221A06',
        },
        parchment: {
          50:  '#FDFAF4',
          100: '#F5EFE0',
          200: '#E8E0D0',
          300: '#D4C9B4',
          400: '#B8A890',
          500: '#8C7D65',
        },
        ember: {
          DEFAULT: '#C0392B',
          light:   '#E74C3C',
          dark:    '#922B21',
        },
      },
      fontFamily: {
        display: ['"Crimson Pro"', 'Georgia', 'serif'],
        kanji:   ['"KQP"', '"Zen Kaku Gothic New"', 'sans-serif'],
        body:    ['"DM Sans"', 'sans-serif'],
        mono:    ['"IBM Plex Mono"', 'monospace'],
      },
      backgroundImage: {
        'paper': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4' fill='%2312110F'/%3E%3Crect width='1' height='1' fill='%231A1814' opacity='0.4'/%3E%3C/svg%3E\")",
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease forwards',
        'fade-in': 'fadeIn 0.3s ease forwards',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
