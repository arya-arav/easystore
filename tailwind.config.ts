import type { Config } from 'tailwindcss';

// Mixes the theme accent with white (lighter shades) or black (darker shades).
function accentShade(mixWith: 'white' | 'black', accentPercent: number) {
  const shade = `color-mix(in srgb, var(--color-accent) ${accentPercent}%, ${mixWith})`;
  return `color-mix(in srgb, ${shade} calc(<alpha-value> * 100%), transparent)`;
}

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx}', // class names built in helpers (productGridClass)
  ],
  theme: {
    extend: {
      colors: {
        // Brand colours (the primary scale follows the theme colour set in Admin → Design)
        // Brand accent: header, footer, buttons. Shades are mixed from --color-accent
        // (set from Admin → Settings → Design) so a theme recolours the whole shop.
        // <alpha-value> keeps opacity modifiers like bg-primary-900/40 working.
        primary: {
          50: accentShade('white', 6),
          100: accentShade('white', 12),
          200: accentShade('white', 25),
          300: accentShade('white', 45),
          400: accentShade('white', 72),
          500: accentShade('white', 100),
          600: accentShade('black', 88),
          700: accentShade('black', 74),
          800: accentShade('black', 60),
          900: accentShade('black', 48),
        },
        secondary: {
          50: '#F5FAF8',
          100: '#E0F2ED',
          200: '#C1E5DB',
          300: '#9BD5C5',
          400: '#6FC3AD',
          500: '#4CAF91', // Soft mint green
          600: '#3A9A7D',
          700: '#2D7E64',
          800: '#266552',
          900: '#215345',
        },
        cream: {
          50: '#FDFCFA',
          100: '#FAF8F4',
          200: '#F5F1EA',
          300: '#F3EFEA', // Light beige/cream (card backgrounds)
          400: '#EBE5DB',
          500: '#E5DED2',
          600: '#D4CCBF',
        },
        // Background colors
        bg: {
          primary: '#F7F7F5', // Soft off-white
          secondary: 'var(--color-tint)', // Soft tint: pastel mint, or the theme's tint (see DynamicHead)
          card: '#F3EFEA', // Very light beige/cream
        },
        // Text colors
        text: {
          primary: '#333333', // Dark gray
          secondary: '#777777', // Muted gray
          muted: '#999999',
        },
        // Admin panel (Medusa-style tokens, see .admin-ui in globals.css)
        ui: {
          bg: 'var(--a-bg)',
          base: 'var(--a-base)',
          hover: 'var(--a-hover)',
          field: 'var(--a-field)',
          border: 'var(--a-border)',
          fg: 'var(--a-fg)',
          subtle: 'var(--a-fg-subtle)',
          muted: 'var(--a-fg-muted)',
          inverted: 'var(--a-inverted)',
          'inverted-fg': 'var(--a-inverted-fg)',
        },
        // Baby accent colors for highlights
        baby: {
          pink: '#FFD6E0',
          blue: '#C5E8F5',
          yellow: '#FFF3CD',
          green: '#D4EDDA',
          lavender: '#E8D5F3',
          peach: '#FFDCC5',
        },
      },
      boxShadow: {
        'ui-card': 'var(--a-card)',
        'ui-field': 'var(--a-field-ring)',
        'ui-modal': 'var(--a-modal)',
      },
      fontFamily: {
        // --font-body is set from the theme's font (src/lib/layout-settings.ts FONTS)
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};

export default config;
