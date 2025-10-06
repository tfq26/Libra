import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import './style.css';
import axios from 'axios';
import { clerkPlugin } from '@clerk/vue';
import { setupErrorHandlers, handleApiError, AppError, createErrorNavigator } from './utils/errorHandler';
// Create app
const app = createApp(App);
// Create and use pinia
const pinia = createPinia();


// IMPORTANT: The key is now proven to be loaded from the environment
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new AppError(
    "Missing VITE_CLERK_PUBLISHABLE_KEY environment variable",
    'MISSING_ENV_VARIABLE',
    { variable: 'VITE_CLERK_PUBLISHABLE_KEY' }
  );
}

// Configure axios
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || '';

// Add request interceptor for auth headers
axios.interceptors.request.use(config => {
  // You can add auth tokens here if needed
  // const token = localStorage.getItem('token');
  // if (token) {
  //   config.headers.Authorization = `Bearer ${token}`;
  // }
  return config;
}, error => {
  return Promise.reject(handleApiError(error));
});

// Add response interceptor for error handling
axios.interceptors.response.use(
  response => response,
  error => {
    // Handle API errors globally
    return Promise.reject(handleApiError(error));
  }
);

// Make axios and error handling available globally
app.config.globalProperties.$http = axios;
app.config.globalProperties.$handleError = createErrorNavigator(router);

// Global error handler for Vue
app.config.errorHandler = (err, vm, info) => {
  console.error('Vue error:', { err, vm, info });
  
  // Navigate to error page for unhandled errors
  if (err && !err.handled) {
    app.config.globalProperties.$handleError(err);
  }
  
  // Prevent the error from being thrown again
  return false;
};

// =========================================================
// PLUGIN INSTALLATION ORDER FIX (CRITICAL FOR ROUTER)
// =========================================================

// 1. Install Pinia
app.use(pinia);

// Install Router first to ensure router-view is registered and ready
app.use(router);


// Initialize Clerk Plugin (installed after the Router is fully stable)
app.use(clerkPlugin, {
  publishableKey: CLERK_PUBLISHABLE_KEY,
  // Redirection URLs remain commented out to prevent startup errors.
  // fallbackRedirectUrl: "/chat", 
});

// Setup General Error Handlers (must be after all plugins that define their own errors)
setupErrorHandlers(app); 

// Mount the app
app.mount('#app'); // This call should now successfully render router-view

// Global error handler for unhandled promise rejections (non-navigation)
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  
  // Prevent the default browser handler
  event.preventDefault();
  
  // Check if the reason is a recognized AppError or unhandled
  if (event.reason && !event.reason.handled) {
    app.config.globalProperties.$handleError(event.reason);
  }
});

// Global error handler for uncaught exceptions
window.onerror = function(message, source, lineno, colno, error) {
  console.error('Uncaught error:', { message, source, lineno, colno, error });
  
  // Navigate to error page
  if (error && !error.handled) {
    app.config.globalProperties.$handleError(error);
  }
  
  // Let the default handler run as well
  return false;
};