import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        migros: '#f97316',
        a101: '#dc2626',
        bim: '#2563eb',
        sok: '#7c3aed',
        primary: '#e63946',
        'primary-dark': '#c1121f',
      },
    },
  },
  plugins: [],
}

export default config
