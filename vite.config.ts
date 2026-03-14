import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false, // Production'da kaynak haritalarını kapat (kod incelemesini zorlaştırır)
  },
})
