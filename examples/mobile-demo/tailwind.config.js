/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontSize: {
        'micro': ['0.6875rem', { lineHeight: '1rem' }],        // ~9px at 13px root
        'caption': ['0.75rem', { lineHeight: '1.0625rem' }],   // ~10px
        'label': ['0.8125rem', { lineHeight: '1.1875rem' }],   // ~10.5px
        'title': ['1rem', { lineHeight: '1.375rem' }],         // 13px
        'display': ['1.1875rem', { lineHeight: '1.5rem' }],    // ~15.5px
      },
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        ops: {
          green: '#10b981',
          amber: '#f59e0b',
          red: '#ef4444',
          blue: '#3b82f6',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
