/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep forest green brand palette (WittyTax x Bank of Industry look)
        'primary': {
          50: '#eef4f0',
          100: '#d7e6dc',
          200: '#afcdba',
          300: '#82b096',
          400: '#559072',
          500: '#396f54',
          600: '#2a5940',
          700: '#224a34',
          800: '#1c3b29',
          900: '#152e20',
        },
        'secondary': {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        // Gold accent used for headline highlights, primary CTAs and status pills
        'gold': {
          50: '#fbf3e4',
          100: '#f5e4c1',
          200: '#eccd90',
          300: '#dfb468',
          400: '#d3a04a',
          500: '#c2903f',
          600: '#a97f3f',
          700: '#8a6532',
          800: '#6b4d27',
          900: '#4d3719',
        },
        // Warm cream used for page backgrounds in place of plain white/gray
        'cream': {
          DEFAULT: '#f7f2e6',
          50: '#fbf8f1',
          100: '#f7f2e6',
          200: '#efe6d1',
        },
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'Cambria', 'serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
