import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/ptda': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            if (res && !res.headersSent) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end('[]');
            }
          });
        },
      },
      '/api/auth': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://127.0.0.1:8003',
        changeOrigin: true,
      },
    },
    watch: {
      // The project lives on a WSL-mounted Windows drive (/mnt/c), where the
      // default fs change events are unreliable. Poll so HMR fires on save.
      usePolling: true,
      interval: 200,
    },
  },
})
