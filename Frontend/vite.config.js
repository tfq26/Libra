import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
import dotenv from 'dotenv';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables from the root .env file
  dotenv.config({ path: '../../.env' });
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
      'process.env': {}
    },

    // Server configuration
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        // Proxy API requests to the backend during development
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    },

    // Build configuration
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: mode !== 'production',
      rollupOptions: {
        output: {
          // ✅ CORRECTED SECTION
          manualChunks(id) {
            // Check if the module ID is from node_modules
            if (id.includes('node_modules')) {
              // Group Vue, Vue Router, and Pinia into a 'vue' chunk
              if (
                id.includes('vue') ||
                id.includes('vue-router') ||
                id.includes('pinia')
              ) {
                return 'vue';
              }
              // Group other dependencies like axios and lodash into a 'vendor' chunk
              return 'vendor';
            }
          },
        },
      },
    },

    // Environment variables
    envPrefix: 'VITE_', // Only variables with this prefix will be exposed to the client
  };
});