import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router, { setupNavigationGuards } from './router'; // 👈 Import the new function
import App from './App.vue';
import './style.css';
import axios from 'axios';
import { useAuthStore } from './stores/auth';
import { auth } from './firebase/config';
import { onAuthStateChanged } from 'firebase/auth';

// PrimeVue
import PrimeVue, { usePrimeVue } from 'primevue/config';
import ToastService from 'primevue/toastservice';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
// Initialize Pinia
const pinia = createPinia();
// Create app instance
const app = createApp(App);

const LibraTheme = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#fff7e9',
      100: '#ffefd2',
      200: '#ffe6bc',
      300: '#ef9700',  // Main primary color (sunset-300)
      400: '#ffb93f',
      500: '#ffd791',
      600: '#9f6500',
      700: '#503200',
      800: '#4a3a1e',
      900: '#251d0f',
      950: '#020202'
    },
    colorScheme: {
      light: {
        primary: {
          color: '{primary.300}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.400}',
          activeColor: '{primary.200}'
        },
        surface: {
          0: '#ffffff',
          50: '#f7f7f7',
          100: '#efefee',
          200: '#e7e7e6',
          300: '#e0dfdd',
          400: '#d8d7d5',
          500: '#afaca8',
          600: '#86827b',
          700: '#595752',
          800: '#2d2b29',
          900: '#0a0a09',
          950: '#020202'
        }
      },
      dark: {
        primary: {
          color: '{primary.400}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.300}',
          activeColor: '{primary.500}'
        },
        surface: {
          0: '#020202',
          50: '#0a0a09',
          100: '#2d2b29',
          200: '#595752',
          300: '#86827b',
          400: '#afaca8',
          500: '#d8d7d5',
          600: '#e0dfdd',
          700: '#e7e7e6',
          800: '#efefee',
          900: '#f7f7f7',
          950: '#ffffff'
        }
      }
    }
  }
});

app.use(PrimeVue, {
  theme: {
    preset: LibraTheme,
    options: {
      prefix: 'p',
      darkModeSelector: '.dark',
      cssLayer: false
    }
  },
  ripple: true
})

// ======================================================
// 🧱 Plugin Registration
// ======================================================
app.use(pinia);
app.use(router);
app.use(ToastService); // This line makes the $toast service available globally

// Initialize auth state before setting up interceptors
const authStore = useAuthStore();
// Axios configuration
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || '';

// Request interceptor to add auth token
axios.interceptors.request.use(
  async (config) => {
    // The 'requiresAuth' flag is a custom config option you can add to axios requests
    // to bypass this interceptor if needed.
    if (config.requiresAuth !== false && authStore.isAuthenticated) {
      try {
        const token = await authStore.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Error getting auth token:', error);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling 401 Unauthorized
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      authStore.logout();
      // Optionally show a toast message on logout
      app.config.globalProperties.$toast.add({
        severity: 'warn',
        summary: 'Session Expired',
        detail: 'You have been logged out. Please log in again.',
        life: 5000
      });
    }
    return Promise.reject(error);
  }
);

// Global error handler
app.config.errorHandler = (err, instance, info) => {
  console.error('Vue error handler:', err, info);
  const message = err.message || 'An unexpected application error occurred.';
  app.config.globalProperties.$toast.add({
    severity: 'error',
    summary: 'Application Error',
    detail: message,
    life: 5000
  });
  // Prevents the error from propagating further
  return false;
};

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  const message = event.reason?.message || 'An unhandled promise rejection occurred.';
  app.config.globalProperties.$toast.add({
    severity: 'error',
    summary: 'Unhandled Error',
    detail: message,
    life: 5000
  });
});


// Wait for auth state to be initialized before mounting the app
const initApp = async () => {
  try {
    // This makes sure Firebase has checked the user's auth status
    await new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        // You might want to initialize your authStore here as well
        // authStore.user = user;
        resolve();
        unsubscribe();
      });
    });
    
    // This runs after Firebase has checked the auth state.
    setupNavigationGuards();

    // Mount the app
    app.mount('#app');
    console.log('✅ PrimeVue initialized with LibraTheme preset');

  } catch (error) {
    console.error('Failed to initialize app:', error);
    const appElement = document.getElementById('app');
    if (appElement) {
      appElement.innerHTML = `
        <div style="padding: 2rem; font-family: sans-serif;">
          <h1>Application Error</h1>
          <p>Failed to initialize the application. Please try refreshing the page.</p>
          <p>${error.message}</p>
        </div>
      `;
    }
  }
};

// Start the app
initApp();