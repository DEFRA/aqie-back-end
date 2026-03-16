import { defineConfig, configDefaults } from 'vitest/config'
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    hookTimeout: 30000,
    testTimeout: 30000,
    include: ['src/**/*.test.js', 'tests/**/*.test.js'],
    clearMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'lcov'],
      include: ['src/**'],
      exclude: [...configDefaults.exclude, 'coverage'],
      thresholds: {
        global: {
          statements: 90,
          branches: 90,
          functions: 90,
          lines: 90
        }
      }
    },
    setupFiles: ['.vite/setup-files.js'],
    globalSetup: ['.vite/mongo-memory-server.js']
  }
})
