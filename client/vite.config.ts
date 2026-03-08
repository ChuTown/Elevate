import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Ports: client dev server = 5173, API server = 5001 (must match server/.env PORT; 5000 is macOS AirPlay)
const API_PORT = 5001

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['.ngrok-free.dev', 'localhost', '127.0.0.1'],
    proxy: {
      '/api': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
})
