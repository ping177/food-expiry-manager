/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#243028',
        cream: '#f7f4eb',
        leaf: '#377d5b',
        mint: '#dcecdf',
        amber: '#c57a20',
        danger: '#b94d45',
      },
      boxShadow: {
        card: '0 12px 32px rgba(45, 63, 51, 0.09)',
      },
    },
  },
  plugins: [],
}

