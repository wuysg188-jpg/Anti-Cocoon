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
        // Mapped to CSS variables in index.css for Light/Dark mode
        white: 'rgb(var(--tw-white) / <alpha-value>)',
        black: 'rgb(var(--tw-black) / <alpha-value>)',
        slate: {
          100: 'rgb(var(--tw-slate-100) / <alpha-value>)',
          200: 'rgb(var(--tw-slate-200) / <alpha-value>)',
          300: 'rgb(var(--tw-slate-300) / <alpha-value>)',
          400: 'rgb(var(--tw-slate-400) / <alpha-value>)',
          500: 'rgb(var(--tw-slate-500) / <alpha-value>)',
          600: 'rgb(var(--tw-slate-600) / <alpha-value>)',
          700: 'rgb(var(--tw-slate-700) / <alpha-value>)',
          800: 'rgb(var(--tw-slate-800) / <alpha-value>)',
          900: 'rgb(var(--tw-slate-900) / <alpha-value>)',
        },
        ink: {
          950: 'rgb(var(--tw-ink-950) / <alpha-value>)',
          900: 'rgb(var(--tw-ink-900) / <alpha-value>)',
          800: 'rgb(var(--tw-ink-800) / <alpha-value>)',
        },
        // Amber intelligence accent
        gold: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        'amber-sm': '0 0 0 1px rgba(251,191,36,0.15)',
        'amber-md': '0 0 20px rgba(251,191,36,0.12)',
        'depth':    '0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3)',
        'modal':    '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(251,191,36,0.08)',
      },
      animation: {
        'fade-in':    'fadeIn 0.25s ease-out',
        'slide-up':   'slideUp 0.35s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'spin-slow':  'spin 2s linear infinite',
        'marquee':    'marquee 30s linear infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:   { from: { opacity: '0', transform: 'translateY(18px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { from: { opacity: '0', transform: 'translateY(-8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        marquee:   { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
