// nuxt.config.ts
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  runtimeConfig: {
    authSecret: process.env.AUTH_SECRET,
    azureClientSecret: process.env.AZURE_AD_CLIENT_SECRET,
    public: {
      azureClientId: process.env.AZURE_AD_CLIENT_ID,
      azureTenantId: process.env.AZURE_AD_TENANT_ID,
      // For local/dev, you can set this to http://localhost:3000
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL,
    },
  },

  // Add Tailwind via Vite plugin (Tailwind v4)
  vite: {
    plugins: [tailwindcss()],
  },

  routeRules: {
    // Make sure auth endpoints are handled by Nuxt (not proxied)
    '/api/auth/**': {},
    // Proxy all other /api/ requests to your backend Functions app
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
    '@sidebase/nuxt-auth',
  ],
  auth: {
    // Optional: set baseURL for NextAuth callbacks during dev/prod
    baseURL: process.env.NUXT_PUBLIC_SITE_URL,
    // Explicit origin to fix AUTH_NO_ORIGIN in prod
    origin: process.env.NUXT_AUTH_ORIGIN || process.env.NEXTAUTH_URL || process.env.NUXT_PUBLIC_SITE_URL,
    // This will protect all routes by default.
    // You must now explicitly define public pages using definePageMeta({ auth: false }).
    globalAppMiddleware: {
      isEnabled: true,
    },
  },
});
