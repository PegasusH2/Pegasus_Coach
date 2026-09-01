/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0a0a0a',
          panel: '#141414',
          card: '#171717',
          hover: '#1f1f1f',
          border: '#262626',
        },
        pegasus: {
          red: '#e8383d',
          redDark: '#c72128',
          redSoft: 'rgba(232,56,61,0.12)',
        },
        text: {
          primary: '#f5f5f5',
          secondary: '#9a9a9a',
          muted: '#6b6b6b',
        },
        macro: {
          protein: '#e8383d',
          carbs: '#f0a53a',
          fat: '#e8b93a',
        },
        success: {
          DEFAULT: '#22c55e',
          soft: 'rgba(34,197,94,0.12)',
        },
      },
      borderRadius: {
        card: '16px',
        control: '10px',
      },
      fontFamily: {
        // Sin dependencias externas (la app funciona sin conexión): 'Inter' se usa si el
        // usuario ya la tiene instalada; si no, cae a la fuente nativa del sistema.
        sans: ['Inter', 'Segoe UI', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
