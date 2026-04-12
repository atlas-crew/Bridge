import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 4201,
    proxy: {
      '/api': 'http://localhost:4200',
      '/health': 'http://localhost:4200',
      '/ws': {
        target: 'ws://localhost:4200',
        ws: true,
      },
    },
  },
});
