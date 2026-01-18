import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // YTÜ Kurumsal Renkler
        navy: {
          DEFAULT: '#00205C', // Ana lacivert
          50: '#E6EBF5',
          100: '#C2CEE8',
          200: '#8FA3D1',
          300: '#5C78BA',
          400: '#2E4D9B',
          500: '#00205C', // Ana
          600: '#001A4D',
          700: '#00143E',
          800: '#000E2F',
          900: '#000820',
        },
        gold: {
          DEFAULT: '#AD976E', // Ana altın
          50: '#F7F5F1',
          100: '#EDE8DE',
          200: '#DDD4C2',
          300: '#CDBFA5',
          400: '#BDAB89',
          500: '#AD976E', // Ana
          600: '#8E7A56',
          700: '#6F5E40',
          800: '#50432B',
          900: '#312816',
        },
        sidebar: {
          DEFAULT: '#00205C', // Lacivert
          hover: '#002878', // Açık lacivert
          active: 'rgba(173, 151, 110, 0.15)', // Altın transparan
        },
        'accent-gold': {
          DEFAULT: '#AD976E', // Ana altın
          light: '#CDBFA5', // Açık altın
          dark: '#8E7A56', // Koyu altın
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-montserrat)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config

export default config