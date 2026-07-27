import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

it('uses the configured GitHub Pages base path', async () => {
  vi.stubEnv('VITE_BASE_PATH', '/Productivity-Apps/')
  vi.resetModules()

  const { default: config } = await import('../vite.config.js')

  expect(config.base).toBe('/Productivity-Apps/')
})
