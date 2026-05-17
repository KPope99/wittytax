/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Nigeria Green theme (flag: #008751)
        'primary': {
          50: '#f0faf4',
          100: '#d6f0e4',
          200: '#a8dfc7',
          300: '#6ec9a5',
          400: '#2daf7a',
          500: '#008751',
          600: '#006b40',
          700: '#005232',
          800: '#003823',
          900: '#002415',
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
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
