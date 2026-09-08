/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc7fb',
          400: '#36abf7',
          500: '#0c8fe9',
          600: '#0171c7',
          700: '#025aa2',
          800: '#064c85',
          900: '#0b406e',
          950: '#072849',
        },
        reach: {
          light: '#f3e8ff',
          DEFAULT: '#9333ea',
          dark: '#6b21a8'
        },
        target: {
          light: '#e0f2fe',
          DEFAULT: '#0284c7',
          dark: '#0369a1'
        },
        safe: {
          light: '#dcfce7',
          DEFAULT: '#16a34a',
          dark: '#15803d'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
