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
        noc: {
          bg: '#080E19',
          sidebar: '#091525',
          surface: '#0D192B',
          surfaceAlt: '#111E30',
          card: '#13243A',
          border: '#203750',
          cyan: '#22D3EE',
          blue: '#287EFF',
          green: '#00D69A',
          amber: '#F5B82E',
          red: '#FF475F',
          text: '#EAF3FF',
          secondary: '#91A7C0',
          muted: '#647C96',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Fira Code', 'monospace'],
      }
    },
  },
  plugins: [],
}
