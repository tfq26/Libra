// nuxt.config.ts
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  // Add Tailwind via Vite plugin (Tailwind v4)
  vite: {
    plugins: [tailwindcss()],
  },

  routeRules: {
    // Proxy all requests starting with /api/ to your backend
    '/api/**': {
      proxy: 'http://localhost:7071/api/**'
    }
  },

  // Load your global CSS file
  css: ["@/assets/main.css"],

  modules: [
    "@nuxt/content",
    "@nuxt/eslint",
    "@nuxt/image",
    "@nuxt/scripts",
    "@nuxt/test-utils",
    "@nuxt/ui",
    '@pinia/nuxt',
  ],
});
