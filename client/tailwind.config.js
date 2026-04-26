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
        'cyber-bg': '#0f0f1a',
        'cyber-surface': '#1a1a2e',
        'cyber-card': '#252540',
        'cyber-border': '#3a3a5c',
        'neon-blue': '#00f0ff',
        'neon-purple': '#b026ff',
        'neon-pink': '#ff2d95',
        'neon-green': '#39ff14',
        'neon-yellow': '#ffe600',
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        pixelZh: ['"ZCOOL QingKe HuangYou"', '"Press Start 2P"', 'monospace'],
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['"Noto Sans SC"', '"JetBrains Mono"', 'sans-serif'],
      },
      boxShadow: {
        'neon-blue': '0 0 7px #00f0ff, 0 0 20px rgba(0,240,255,0.3), 0 0 42px rgba(0,240,255,0.1)',
        'neon-purple': '0 0 7px #b026ff, 0 0 20px rgba(176,38,255,0.3), 0 0 42px rgba(176,38,255,0.1)',
        'neon-pink': '0 0 7px #ff2d95, 0 0 20px rgba(255,45,149,0.3), 0 0 42px rgba(255,45,149,0.1)',
        'neon-green': '0 0 7px #39ff14, 0 0 20px rgba(57,255,20,0.3), 0 0 42px rgba(57,255,20,0.1)',
        'neon-yellow': '0 0 7px #ffe600, 0 0 20px rgba(255,230,0,0.3), 0 0 42px rgba(255,230,0,0.1)',
        // Subtle inset glow for panel surfaces
        'neon-inset': 'inset 0 0 20px rgba(0,240,255,0.04)',
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'scanline': 'scanline 8s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'flicker': 'flicker 0.15s infinite',
        // New: subtle data-stream ticker for decorative elements
        'data-stream': 'data-stream 20s linear infinite',
        // New: smooth fade-in for lazy-loaded content
        'fade-in': 'fade-in 0.3s ease-out forwards',
        // New: slide-up entrance for cards / panels
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
      // Backdrop blur levels for glassmorphism panels
      backdropBlur: {
        xs: '2px',
      },
      // Consistent timing functions across the design system
      transitionTimingFunction: {
        'cyber': 'cubic-bezier(0.33, 1, 0.68, 1)',
      },
    },
  },
  plugins: [],
}
