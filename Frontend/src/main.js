import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import './style.css';
import axios from 'axios';
import { clerkPlugin } from '@clerk/vue';
import {
  setupErrorHandlers,
  handleApiError,
  AppError,
  createErrorNavigator
} from './utils/errorHandler';
import { Clerk } from '@clerk/clerk-js';

// ======================================================
// 🌍 Environment Validation
// ======================================================
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new AppError(
    'Missing VITE_CLERK_PUBLISHABLE_KEY environment variable',
    'MISSING_ENV_VARIABLE',
    { variable: 'VITE_CLERK_PUBLISHABLE_KEY' }
  );
}

// ======================================================
// 🚀 Initialize Clerk
// ======================================================
const clerk = new Clerk(CLERK_PUBLISHABLE_KEY);

// Handle Clerk initialization
async function initializeApp() {
  try {
    // Load Clerk
    await clerk.load();
    
    // Create app instance
    const app = createApp(App);
    const pinia = createPinia();

    // ======================================================
    // 🧱 Plugin Registration
    // ======================================================
    app.use(pinia);
    app.use(router);
    
    // Register Clerk plugin
    app.use(clerkPlugin, {
      publishableKey: CLERK_PUBLISHABLE_KEY,
    });

    // ======================================================
    // 🌐 Axios Configuration
    // ======================================================
    axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || '';

    // Request interceptor
    axios.interceptors.request.use(
      async (config) => {
        // Add auth token to requests if available
        if (clerk.session) {
          const token = await clerk.session?.getToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      error => Promise.reject(handleApiError(error))
    );

    // Response interceptor
    axios.interceptors.response.use(
      response => response,
      error => {
        // Handle 401 Unauthorized
        if (error.response?.status === 401) {
          // You can add redirect to login here if needed
          console.warn('Session expired or invalid. Please sign in again.');
        }
        return Promise.reject(handleApiError(error));
      }
    );

    // Make axios and error handling available globally
    app.config.globalProperties.$http = axios;
    app.config.globalProperties.$handleError = createErrorNavigator(router);

    // ======================================================
    // ⚙️ Global Error Handling
    // ======================================================
    app.config.errorHandler = (err, vm, info) => {
      console.error('Vue error:', { err, vm, info });
      if (err && !err.handled) {
        app.config.globalProperties.$handleError(err);
      }
      return false;
    };

    // Setup error handlers
    setupErrorHandlers(app);

    // Global error listeners
    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      event.preventDefault();
      if (event.reason && !event.reason.handled) {
        app.config.globalProperties.$handleError(event.reason);
      }
    };

    const handleGlobalError = (message, source, lineno, colno, error) => {
      console.error('Uncaught error:', { message, source, lineno, colno, error });
      if (error && !error.handled) {
        app.config.globalProperties.$handleError(error);
      }
      return false;
    };

    // Add event listeners
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.onerror = handleGlobalError;

    // ======================================================
    // 🚀 Mount the App
    // ======================================================
    app.mount('#app');

    // Cleanup function
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.onerror = null;
    };

  } catch (error) {
    console.error('Failed to initialize application:', error);
    // Render error UI
    document.getElementById('app').innerHTML = `
      <div style="padding: 2rem; text-align: center; font-family: sans-serif;">
        <h1>Application Error</h1>
        <p>Failed to initialize the application. Please refresh the page or contact support.</p>
        <p><small>${error.message}</small></p>
      </div>
    `;
  }
}

// Start the app
initializeApp();