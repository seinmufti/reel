import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['primereact/dropdown', 'primereact/api', '@primeuix/themes/aura'],
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})
