/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base Palette (Neutrals)
        slate: {
          900: '#0F172A', // Primary backgrounds
          800: '#1E293B', // Card backgrounds
          700: '#334155', // Secondary panels
          600: '#475569', // Borders, dividers
          500: '#64748B', // Hover states
          400: '#94A3B8', // Secondary text
          200: '#E2E8F0', // Primary text
        },
        charcoal: '#18181B', // Deep backgrounds
        'neutral-gray': '#404040', // Inactive elements

        // Accent Palette (Functional)
        amber: {
          warning: '#F59E0B', // Warnings, caution states
          light: '#FCD34D', // Warning highlights
        },
        cyan: {
          info: '#06B6D4', // Information, radio active
          light: '#67E8F9', // Info highlights, selected
        },
        green: {
          success: '#22C55E', // Correct, success, go
          light: '#86EFAC', // Success highlights
        },
        red: {
          critical: '#EF4444', // Errors, critical, stop
          light: '#FCA5A5', // Error highlights
        },
      },
      fontFamily: {
        sans: ['Inter', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      fontSize: {
        'display-xl': ['48px', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-l': ['36px', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'heading-1': ['28px', { lineHeight: '1.3' }],
        'heading-2': ['24px', { lineHeight: '1.3' }],
        'heading-3': ['20px', { lineHeight: '1.4' }],
        'body-l': ['18px', { lineHeight: '1.5' }],
        'body-m': ['16px', { lineHeight: '1.5' }],
        'body-s': ['14px', { lineHeight: '1.5', letterSpacing: '0.01em' }],
        'caption': ['12px', { lineHeight: '1.4', letterSpacing: '0.02em' }],
        'mono-l': ['18px', { lineHeight: '1.6', letterSpacing: '0.05em' }],
        'mono-m': ['16px', { lineHeight: '1.6', letterSpacing: '0.05em' }],
      },
      spacing: {
        '0': '0px',
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
      },
      borderRadius: {
        'card': '16px',
        'button': '8px',
        'input': '8px',
        'modal': '24px',
      },
      boxShadow: {
        'elevation-1': '0 1px 3px rgba(0,0,0,0.3)',
        'elevation-2': '0 4px 6px rgba(0,0,0,0.4)',
        'elevation-3': '0 10px 20px rgba(0,0,0,0.5)',
        'elevation-4': '0 20px 40px rgba(0,0,0,0.6)',
        'focus': '0 0 0 3px rgba(6,182,212,0.3)',
        'glow-cyan': '0 0 20px rgba(6,182,212,0.5)',
        'glow-green': '0 0 20px rgba(34,197,94,0.5)',
        'glow-red': '0 0 20px rgba(239,68,68,0.5)',
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-up': 'slideUp 300ms ease-out',
        'scale-pop': 'scalePop 200ms ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scalePop: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      transitionDuration: {
        'micro': '100ms',
        'state': '200ms',
        'panel': '300ms',
        'screen': '500ms',
      },
    },
  },
  plugins: [],
};
