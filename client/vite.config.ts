import { defineConfig, splitVendorChunkPlugin } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(), splitVendorChunkPlugin()],

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },

  build: {
    // Target modern browsers — smaller output, no legacy polyfills
    target: 'es2020',
    // Faster builds in CI; still gzip-ready for hosting
    reportCompressedSize: false,
    // Raise warning threshold — universe + game chunks are intentionally large
    chunkSizeWarningLimit: 600,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // Split heavy chunks so initial load only fetches what's needed
        manualChunks(id) {
          // React core — always needed, cache aggressively
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react'
          }
          // Router + Zustand — small, but separate from React for cache stability
          if (id.includes('react-router-dom') || id.includes('zustand')) {
            return 'vendor-state'
          }
          // Universe system — only loaded on home page
          if (id.includes('/universe/')) {
            return 'universe'
          }
          // Each game as its own chunk — only loaded when played
          if (id.includes('/games/SnakeGame')) return 'game-snake'
          if (id.includes('/games/TetrisGame')) return 'game-tetris'
          if (id.includes('/games/PlatformerGame')) return 'game-platformer'
          if (id.includes('/games/ShooterGame')) return 'game-shooter'
          if (id.includes('/games/AsteroidsGame')) return 'game-asteroids'
          if (id.includes('/games/RacingGame')) return 'game-racing'
          if (id.includes('/games/TowerDefenseGame')) return 'game-towerdefense'
          if (id.includes('/games/WarriorGame')) return 'game-warrior'
          if (id.includes('/games/FarmGame')) return 'game-farm'
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
})
