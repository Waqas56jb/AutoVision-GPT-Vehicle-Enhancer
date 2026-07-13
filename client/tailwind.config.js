/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        /* Blue & white theme. `brand` is the single accent ramp. */
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        /* Page canvas — white with the faintest blue cast. */
        canvas: {
          DEFAULT: '#f7faff',
          soft: '#eef4ff',
        },
        /* Deep navy for the rail — the bold anchor the light panels sit against. */
        ink: {
          800: '#132a63',
          900: '#0f2050',
          950: '#0a1738',
        },
      },
      boxShadow: {
        /* Blue-tinted elevation instead of neutral grey — keeps the theme cohesive. */
        soft: '0 1px 2px rgba(30,58,138,0.04), 0 8px 24px -12px rgba(30,58,138,0.12)',
        card: '0 1px 3px rgba(30,58,138,0.05), 0 20px 45px -25px rgba(30,58,138,0.25)',
        lift: '0 2px 6px rgba(30,58,138,0.07), 0 30px 60px -30px rgba(30,58,138,0.35)',
        glow: '0 10px 30px -10px rgba(59,130,246,0.55)',
        'glow-lg': '0 18px 50px -12px rgba(59,130,246,0.6)',
        'inner-top': 'inset 0 1px 0 rgba(255,255,255,0.7)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%)',
        'rail-gradient': 'linear-gradient(180deg, #132a63 0%, #0f2050 55%, #0a1738 100%)',
        'sheen': 'linear-gradient(90deg, transparent, rgba(255,255,255,0.75), transparent)',
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
          '50%': { transform: 'translateY(-8px)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.85)', opacity: '0.6' },
          '80%, 100%': { transform: 'scale(1.5)', opacity: '0' },
        },
        'gradient-pan': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
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
        'gradient-pan': 'gradient-pan 6s ease infinite',
        'progress-indeterminate': 'progress-indeterminate 1.4s ease-in-out infinite',
        'spin-slow': 'spin 2.4s linear infinite',
        'bounce-dot': 'bounce-dot 1.2s ease-in-out infinite',
        scan: 'scan 2.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
