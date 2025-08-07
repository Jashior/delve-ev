import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/delve-ev/', // Set to your repo name for GitHub Pages
  plugins: [react()],
})
