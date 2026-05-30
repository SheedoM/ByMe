/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans:  ['DM Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink:     '#1A1917',
        paper:   '#F8F7F3',
        surface: '#EEECEA',
        muted:   '#7A7870',
        border:  '#D9D7D1',
        amber: {
          DEFAULT: '#C47B35',
          light:   '#F5E8D5',
          dark:    '#A36128',
        },
        emerald: {
          soft: '#D4EDDA',
          deep: '#2D6A4F',
        },
      },
      animation: {
        'fade-in':    'fadeIn 0.4s ease-out',
        'slide-up':   'slideUp 0.5s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
