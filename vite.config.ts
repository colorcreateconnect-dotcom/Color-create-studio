import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Phone-first web app. Base is relative so the built app can be served
// from any sub-path (GitHub Pages, static host, etc.).
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { host: true, port: 5173 },
})
