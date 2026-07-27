import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

const migrations = await readD1Migrations('./worker/migrations')

export default defineConfig({
  test: {
    include: ['worker/test/**/*.test.js'],
  },
  plugins: [
    cloudflareTest({
      main: './worker/src/index.js',
      remoteBindings: false,
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        bindings: {
          BETTER_AUTH_SECRET: 'test-better-auth-secret',
          TURNSTILE_SECRET_KEY: 'test-turnstile-secret',
          RESEND_API_KEY: 'test-resend-api-key',
          TEST_MIGRATIONS: migrations,
        },
      },
    }),
  ],
})
