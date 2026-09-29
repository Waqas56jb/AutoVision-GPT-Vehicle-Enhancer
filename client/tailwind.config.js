/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        /* "Graphite & Champagne". `brand` is the single accent ramp — a warm
           champagne gold, used sparingly for selection and emphasis. */
        brand: {
          50: '#fbf8f2',
          100: '#f4ede1',
          200: '#e8d9bf',
          300: '#d9c096',
          400: '#c9a46a',
          500: '#b08a4e',
          600: '#957240',
          700: '#785b35',
          800: '#5e4830',
          900: '#4a3a29',
          950: '#2a2016',
        },
        /* Warm paper canvas the floating panels sit on. */
        canvas: {
          DEFAULT: '#f5f3ef',
          soft: '#efece6',
        },
        /* Graphite — dark surfaces and the primary (ink) buttons. */
        ink: {
          700: '#2a2a30',
          800: '#1f1f24',
          900: '#17171b',
          950: '#0f0f12',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(28,26,23,0.04), 0 6px 20px -12px rgba(28,26,23,0.14)',
        card: '0 1px 2px rgba(28,26,23,0.05), 0 18px 40px -24px rgba(28,26,23,0.22)',
        lift: '0 2px 6px rgba(28,26,23,0.06), 0 32px 64px -32px rgba(28,26,23,0.38)',
        /* Selection glow: a thin champagne halo, not a neon bloom. */
        glow: '0 0 0 1px rgba(176,138,78,0.28), 0 8px 22px -10px rgba(149,114,64,0.45)',
        'glow-lg': '0 0 0 1px rgba(176,138,78,0.35), 0 16px 40px -14px rgba(149,114,64,0.55)',
        'inner-top': 'inset 0 1px 0 rgba(255,255,255,0.7)',
        panel: '0 1px 0 rgba(255,255,255,0.8) inset, 0 1px 2px rgba(28,26,23,0.04), 0 10px 30px -18px rgba(28,26,23,0.18)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #d9c096 0%, #b08a4e 55%, #785b35 100%)',
        'ink-gradient': 'linear-gradient(180deg, #2a2a30 0%, #17171b 100%)',
        sheen: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.85)', opacity: '0.6' },
          '80%, 100%': { transform: 'scale(1.5)', opacity: '0' },
        },
        'progress-indeterminate': {
          '0%': { transform: 'translateX(-100%) scaleX(0.4)' },
          '50%': { transform: 'translateX(0%) scaleX(0.75)' },
          '100%': { transform: 'translateX(100%) scaleX(0.4)' },
        },
        'bounce-dot': {
          '0%, 80%, 100%': { transform: 'translateY(0)', opacity: '0.45' },
          '40%': { transform: 'translateY(-5px)', opacity: '1' },
        },
        /* Sweeps a light bar down an image while it is being generated. */
        scan: {
          '0%': { transform: 'translateY(-110%)' },
          '100%': { transform: 'translateY(110%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.8s infinite',
        'fade-up': 'fade-up 0.5s ease-out both',
        float: 'float 5s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 1.8s cubic-bezier(0.24, 0, 0.38, 1) infinite',
        'progress-indeterminate': 'progress-indeterminate 1.4s ease-in-out infinite',
        'spin-slow': 'spin 2.4s linear infinite',
        'bounce-dot': 'bounce-dot 1.2s ease-in-out infinite',
        scan: 'scan 2.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
