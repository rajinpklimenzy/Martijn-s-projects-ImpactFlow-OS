import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 8080,
      host: '0.0.0.0',
      fs: {
        strict: false,
      },
    },
    preview: {
      port: 8080,
    },
    plugins: [
      react(),
      {
        name: 'spa-fallback',
        configureServer(server) {
          // Add middleware AFTER Vite's internal middleware is set up
          return () => {
            server.middlewares.use((req, res, next) => {
              const url = req.url?.split('?')[0] || '';
              
              // CRITICAL: Let Vite handle ALL its internal requests first
              // These patterns match Vite's internal requests
              if (url.startsWith('/@vite') ||
                  url.startsWith('/@react-refresh') ||
                  url.startsWith('/@id/') ||
                  url.startsWith('/node_modules/.vite/') ||
                  url.startsWith('/src/') ||
                  url.startsWith('/@fs/') ||
                  url.match(/\.(js|mjs|ts|tsx|jsx|css|json|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|webp)$/)) {
                return next();
              }
              
              // Skip API routes
              if (url.startsWith('/api')) {
                return next();
              }
              
              // Only handle actual page routes (no file extension, not Vite internal)
              if (url !== '/index.html' && url !== '/' && !url.includes('.')) {
                // Rewrite to index.html for SPA routing
                req.url = '/index.html';
              }
              
              next();
            });
          };
        },
      },
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.API_BASE_URL': JSON.stringify(env.API_BASE_URL)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      outDir: 'build',
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
        },
      },
    },
  };
});
