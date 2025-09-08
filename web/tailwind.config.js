/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        catalog: {
          bg: '#f5f3ef',
          panel: '#ffffff',
          accent: '#00602e',
          accentDark: '#004d25',
          gold: '#c49a24',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        subtle: '0 1px 2px rgba(0,0,0,0.06)',
      },
      borderRadius: {
        sm: '3px'
      }
    },
  },
  plugins: [],
};
