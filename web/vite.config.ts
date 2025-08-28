import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['vm-522.lnvps.cloud', 'localhost', 'lnpixels.heyanabelle.com', 'pixel.xx.kg', 'lnpixels.qzz.io'],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true // Enable WebSocket proxying for Socket.IO
      }
    }
  },
  optimizeDeps: {
    include: ['nakapay-react']
  }
});