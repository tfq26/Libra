import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables using Vite's built-in loader
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [vue(), tailwindcss()],

    // Resolve aliases
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },

    // Environment variables exposed to the client
    define: {
      // Prevent process.env errors in browser
      'process.env': {},
    },

    // Dev server configuration
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },

    // Build configuration
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: mode !== 'production',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (
                id.includes('vue') ||
                id.includes('vue-router') ||
                id.includes('pinia')
              ) {
                return 'vue';
              }
              return 'vendor';
            }
          },
        },
      },
    },

    // Only expose variables that start with VITE_ to the client
    envPrefix: 'VITE_',
  };
});
