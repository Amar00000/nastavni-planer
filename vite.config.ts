import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // On GitHub Pages the app lives at https://<user>.github.io/<repository>/, so the build must
  // know that path. The deployment workflow sets BASE_PATH from the repository's name; for local
  // work it is not set and the app is served from "/".
  const { BASE_PATH } = loadEnv(mode, '.', 'BASE_')
  return {
    base: BASE_PATH || '/',
    plugins: [react()],
  }
})
