import react from '@vitejs/plugin-react'
import { sites } from '@openai/sites-vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), sites()],
})
