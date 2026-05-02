/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        spotify: '#1DB954',
        bg: {
          DEFAULT: '#0a0a0a',
          elev: '#141414',
          row: '#1a1a1a',
          hover: '#222222',
          sel: '#1f2a22',
        },
        line: '#262626',
        fg: {
          DEFAULT: '#e5e5e5',
          muted: '#9ca3af',
          dim: '#6b7280',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
