/** @type {import('tailwindcss').Config} */
export default {
  content: ['./*.html', './src/**/*.js'],
  theme: {
    extend: {
      colors: {
        // Mismos tokens que el sistema de administración (SistemaWeb_CREAR)
        // para que ambos productos se sientan parte de la misma marca.
        primary: '#6D5AE6',
        'primary-dark': '#5647c8',
        'primary-light': '#EEE9FF',
        'primary-subtle': '#F8F9FC',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-md': '0 4px 12px 0 rgb(109 90 230 / 0.10)',
      },
      animation: {
        'fade-up': 'fadeUp 0.25s ease-out both',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
