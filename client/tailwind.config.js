/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],

  future: {
    // Hover styles only activate on devices that actually support hover.
    // Prevents sticky hover states on mobile touchscreens.
    hoverOnlyWhenSupported: true,
  },

  theme: {
    screens: {
      sm: '480px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        // 使用 CSS 变量引用 oklch 颜色
        'cyber-bg': 'var(--cyber-bg)',
        'cyber-surface': 'var(--cyber-surface)',
        'cyber-card': 'var(--cyber-card)',
        'cyber-border': 'var(--cyber-border)',
        'neon-blue': 'var(--neon-blue)',
        'neon-blue-dim': 'var(--neon-blue-dim)',
        'neon-blue-glow': 'var(--neon-blue-glow)',
        'neon-purple': 'var(--neon-purple)',
        'neon-purple-dim': 'var(--neon-purple-dim)',
        'neon-purple-glow': 'var(--neon-purple-glow)',
        'neon-pink': 'var(--neon-pink)',
        'neon-pink-dim': 'var(--neon-pink-dim)',
        'neon-pink-glow': 'var(--neon-pink-glow)',
        'neon-green': 'var(--neon-green)',
        'neon-green-dim': 'var(--neon-green-dim)',
        'neon-green-glow': 'var(--neon-green-glow)',
        'neon-yellow': 'var(--neon-yellow)',
        'neon-yellow-dim': 'var(--neon-yellow-dim)',
        'neon-yellow-glow': 'var(--neon-yellow-glow)',
        // 文字层次
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'text-hint': 'var(--text-hint)',
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        pixelZh: ['"ZCOOL QingKe HuangYou"', '"Press Start 2P"', 'monospace'],
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['"Noto Sans SC"', '"JetBrains Mono"', 'sans-serif'],
      },
      boxShadow: {
        // 克制的发光效果 — 单层柔和光晕
        'neon-blue': '0 0 6px oklch(0.85 0.18 195 / 0.25)',
        'neon-blue-md': '0 0 10px oklch(0.85 0.18 195 / 0.4)',
        'neon-purple': '0 0 6px oklch(0.55 0.20 285 / 0.25)',
        'neon-purple-md': '0 0 10px oklch(0.55 0.20 285 / 0.4)',
        'neon-pink': '0 0 6px oklch(0.65 0.22 345 / 0.25)',
        'neon-pink-md': '0 0 10px oklch(0.65 0.22 345 / 0.4)',
        'neon-green': '0 0 6px oklch(0.82 0.18 145 / 0.25)',
        'neon-green-md': '0 0 10px oklch(0.82 0.18 145 / 0.4)',
        'neon-yellow': '0 0 6px oklch(0.88 0.18 95 / 0.25)',
        'neon-yellow-md': '0 0 10px oklch(0.88 0.18 95 / 0.4)',
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'scanline': 'scanline 8s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'flicker': 'flicker 0.15s infinite',
        'data-stream': 'data-stream 20s linear infinite',
        'fade-in': 'fade-in 0.3s ease-out forwards',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.33,1,0.68,1) forwards',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        flicker: {
          '0%': { opacity: '0.97' },
          '50%': { opacity: '1' },
          '100%': { opacity: '0.98' },
        },
        'data-stream': {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '0% 100%' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      transitionTimingFunction: {
        'cyber': 'cubic-bezier(0.33, 1, 0.68, 1)',
      },
      borderRadius: {
        'sm': '6px',
        'lg': '16px',
      },
    },
  },
  plugins: [],
}
