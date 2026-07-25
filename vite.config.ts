import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Phone-first web app. Base is relative so the built app can be served
// from any sub-path (GitHub Pages, static host, etc.).
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { host: true, port: 5173 },
  test: {
    // Hermetic config-detection tests: a developer's real .env.local must not
    // leak backend creds into the test run. These blank the VITE_* vars in both
    // import.meta.env and process.env; the value-setting tests then drive their
    // own values via vi.stubEnv. Takes precedence over .env files.
    env: {
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
      VITE_SQUARE_APP_ID: '',
      VITE_SQUARE_LOCATION_ID: '',
    },
  },
})
