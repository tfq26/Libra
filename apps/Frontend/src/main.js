import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router, { setupNavigationGuards } from './router';
import App from './App.vue';
import './style.css';
import axios from 'axios';
import { useAuthStore } from './stores/auth';

// PrimeVue and Theme imports
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

// Create app instance and Pinia
const app = createApp(App);
const pinia = createPinia();

// --- PrimeVue Theme Definition (No Changes) ---
const LibraTheme = definePreset(Aura, {
  semantic: {
    primary: {
        50: '#fff7e9',
        100: '#ffefd2',
        200: '#ffe6bc',
        300: '#ef9700',
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
});

// ======================================================
// 🧱 Plugin & Store Registration
// ======================================================
app.use(pinia);
app.use(router);
app.use(ToastService);
app.use(ConfirmationService);

// Instantiate the auth store AFTER Pinia is registered
const authStore = useAuthStore();

// --- Axios Interceptors & Global Error Handling (No Changes) ---
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || '';

axios.interceptors.request.use(
  async (config) => {
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

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      authStore.logout();
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

app.config.errorHandler = (err, instance, info) => {
  console.error('Vue error handler:', err, info);
  const message = err.message || 'An unexpected application error occurred.';
  app.config.globalProperties.$toast.add({
    severity: 'error',
    summary: 'Application Error',
    detail: message,
    life: 5000
  });
  return false;
};

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

// ======================================================
// 🚀 App Initialization (Simplified and Corrected)
// ======================================================

// 1. Start the persistent auth listener from your store.
// This function will automatically handle the initial auth check,
// keep the token refreshed, and update the store's state.
authStore.initializeAuthListener();

// 2. Set up navigation guards. Because the listener is now active,
// the guards will have the correct authentication status when they run.
setupNavigationGuards();

// 3. Mount the app.
app.mount('#app');

console.log('✅ PrimeVue initialized with LibraTheme preset');