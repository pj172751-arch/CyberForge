/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          main: '#0A0A0B',
          panel: '#141416',
          panelAlt: '#1B1B1E',
          subtle: '#222226',
        },
        border: {
          hairline: '#232326',
          subtle: '#2E2E33',
        },
        cyan: {
          accent: '#00E5CC',
          hover: '#00CCA6',
          dim: 'rgba(0, 229, 204, 0.1)',
        },
        status: {
          green: '#10B981',
          greenDim: 'rgba(16, 185, 129, 0.12)',
          amber: '#F59E0B',
          amberDim: 'rgba(245, 158, 11, 0.12)',
          red: '#EF4444',
          redDim: 'rgba(239, 68, 68, 0.12)',
        }
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"Commit Mono"', '"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        sharp: '4px',
        panel: '6px',
      }
    },
  },
  plugins: [],
}
